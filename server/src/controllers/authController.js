import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import prisma from '../utils/prisma.js'
import { OAuth2Client } from 'google-auth-library'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js'
import { successResponse, errorResponse } from '../utils/helpers.js'
import { emailService } from '../services/emailService.js'
import { z } from 'zod'

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
)

const COOKIE_OPTIONS = {
    httpOnly: true,
    // Set COOKIE_SECURE=true in .env.production only after enabling HTTPS/SSL
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    path: '/'
}

const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6)
})

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
})

const register = async (req, res, next) => {
    try {
        const { name, email, password } = registerSchema.parse(req.body)

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) return errorResponse(res, 'Email already registered', 409)

        const hashedPassword = await bcrypt.hash(password, 12)
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword },
            select: { id: true, name: true, email: true, avatar: true, role: true, activeWorkspaceId: true, createdAt: true }
        })

        const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role, name: user.name })
        const refreshToken = signRefreshToken({ id: user.id })

        res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 })
        res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 })

        return successResponse(res, { user }, 'Registered successfully', 201)
    } catch (err) {
        next(err)
    }
}

const login = async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body)

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.password) return errorResponse(res, 'Invalid credentials', 401)

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) return errorResponse(res, 'Invalid credentials', 401)

        const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role, name: user.name })
        const refreshToken = signRefreshToken({ id: user.id })

        res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 })
        res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 })

        const { password: _, ...userWithoutPassword } = user
        return successResponse(res, { user: userWithoutPassword }, 'Login successful')
    } catch (err) {
        next(err)
    }
}

const logout = (req, res) => {
    res.clearCookie('accessToken', COOKIE_OPTIONS)
    res.clearCookie('refreshToken', COOKIE_OPTIONS)
    return successResponse(res, null, 'Logged out successfully')
}

const refreshToken = async (req, res, next) => {
    try {
        const token = req.cookies?.refreshToken
        if (!token) return errorResponse(res, 'No refresh token', 401)

        const decoded = verifyRefreshToken(token)
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, role: true, name: true }
        })
        if (!user) return errorResponse(res, 'User not found', 401)

        const newAccessToken = signAccessToken({ id: user.id, email: user.email, role: user.role, name: user.name })
        const newRefreshToken = signRefreshToken({ id: user.id })

        res.cookie('accessToken', newAccessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 })
        res.cookie('refreshToken', newRefreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 })

        return successResponse(res, { message: 'Token refreshed' })
    } catch (err) {
        return errorResponse(res, 'Invalid refresh token', 401)
    }
}

const getMe = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, avatar: true, role: true, activeWorkspaceId: true, createdAt: true }
        })
        if (!user) return errorResponse(res, 'User not found', 404)
        return successResponse(res, { user })
    } catch (err) {
        next(err)
    }
}

const googleRedirect = (req, res) => {
    const url = googleClient.generateAuthUrl({
        access_type: 'offline',
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
    res.redirect(url)
}

const googleCallback = async (req, res, next) => {
    try {
        const { code } = req.query
        if (!code) return res.redirect(`${process.env.CLIENT_URL}/login?error=no_code`)

        const { tokens } = await googleClient.getToken(code)
        googleClient.setCredentials(tokens)

        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID
        })
        const payload = ticket.getPayload()
        const { sub: googleId, email, name, picture } = payload

        let user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
            user = await prisma.user.create({
                data: { name, email, avatar: picture, password: null }
            })
        } else if (!user.avatar && picture) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { avatar: picture }
            })
        }

        const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role, name: user.name })
        const refreshToken = signRefreshToken({ id: user.id })

        res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 })
        res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 })

        res.redirect(`${process.env.CLIENT_URL}/auth/callback?success=true`)
    } catch (err) {
        console.error('[Google OAuth Error]', err.message)
        res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`)
    }
}

const updateProfile = async (req, res, next) => {
    try {
        const { name, avatar } = req.body
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { ...(name && { name }), ...(avatar && { avatar }) },
            select: { id: true, name: true, email: true, avatar: true, role: true, activeWorkspaceId: true, createdAt: true }
        })
        return successResponse(res, { user }, 'Profile updated')
    } catch (err) {
        next(err)
    }
}

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = z.object({ email: z.string().email() }).parse(req.body)

        const user = await prisma.user.findUnique({ where: { email } })
        // Always return success to prevent user enumeration attacks
        if (!user) return successResponse(res, null, 'If that email exists, a reset link has been sent.')

        const rawToken = crypto.randomBytes(32).toString('hex')
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')
        const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: { passwordResetToken: hashedToken, passwordResetExpiry: expiry }
        })

        const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`
        await emailService.sendPasswordReset({ to: user.email, userName: user.name, resetUrl })

        return successResponse(res, null, 'If that email exists, a reset link has been sent.')
    } catch (err) {
        next(err)
    }
}

const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = z.object({
            token: z.string().min(1),
            password: z.string().min(8, 'Password must be at least 8 characters')
        }).parse(req.body)

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
        const user = await prisma.user.findFirst({
            where: {
                passwordResetToken: hashedToken,
                passwordResetExpiry: { gt: new Date() }
            }
        })

        if (!user) return errorResponse(res, 'Reset link is invalid or has expired.', 400)

        const hashedPassword = await bcrypt.hash(password, 12)
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetExpiry: null
            }
        })

        return successResponse(res, null, 'Password reset successfully. You can now sign in.')
    } catch (err) {
        next(err)
    }
}

const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = z.object({
            currentPassword: z.string().min(1),
            newPassword: z.string().min(8, 'New password must be at least 8 characters')
        }).parse(req.body)

        const user = await prisma.user.findUnique({ where: { id: req.user.id } })
        if (!user?.password) return errorResponse(res, 'Cannot change password for OAuth accounts', 400)

        const valid = await bcrypt.compare(currentPassword, user.password)
        if (!valid) return errorResponse(res, 'Current password is incorrect', 400)

        const hashed = await bcrypt.hash(newPassword, 12)
        await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } })

        return successResponse(res, null, 'Password changed successfully')
    } catch (err) {
        next(err)
    }
}

const deleteAccount = async (req, res, next) => {
    try {
        const { password } = z.object({ password: z.string().min(1) }).parse(req.body)

        const user = await prisma.user.findUnique({ where: { id: req.user.id } })
        if (!user) return errorResponse(res, 'User not found', 404)

        // For OAuth users, skip password check
        if (user.password) {
            const valid = await bcrypt.compare(password, user.password)
            if (!valid) return errorResponse(res, 'Incorrect password', 400)
        }

        // Delete the user — cascade deletes workspace memberships etc.
        await prisma.user.delete({ where: { id: req.user.id } })

        // Clear auth cookies
        res.clearCookie('accessToken')
        res.clearCookie('refreshToken')

        return successResponse(res, null, 'Account deleted successfully')
    } catch (err) {
        next(err)
    }
}

export { register, login, logout, refreshToken, getMe, googleRedirect, googleCallback, updateProfile, forgotPassword, resetPassword, changePassword, deleteAccount }
