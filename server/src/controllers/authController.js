import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import prisma from '../utils/prisma.js'
import { OAuth2Client } from 'google-auth-library'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js'
import { successResponse, errorResponse } from '../utils/helpers.js'
import { emailService } from '../services/emailService.js'
import { z } from 'zod'

// ── Lazy factory: reads env vars at request time, not at module init ─────────
// This is required because ESM imports are hoisted and evaluated before
// dotenv.config() runs in index.js, so process.env is not yet populated.
const getGoogleClient = () => new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
)

const getCookieOptions = () => ({
    httpOnly: true,
    // COOKIE_SECURE=true is set in .env.production (HTTPS is required)
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.brioright.online' : 'localhost'
})

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
            select: { id: true, name: true, email: true, avatarUrl: true, role: true, activeWorkspaceId: true, createdAt: true, emailVerified: true }
        })

        // Generate email verification token
        const rawToken = crypto.randomBytes(32).toString('hex')
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')
        const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerifyToken: hashedToken, emailVerifyExpiry: expiry }
        })

        const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${rawToken}`
        // Non-blocking — don't fail registration if email send fails
        emailService.sendEmailVerification({ to: user.email, userName: user.name, verifyUrl }).catch(err => {
            console.error('[Auth] Failed to send verification email:', err.message)
        })

        const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role, name: user.name })
        const refreshToken = signRefreshToken({ id: user.id })

        res.cookie('accessToken', accessToken, { ...getCookieOptions(), maxAge: 15 * 60 * 1000, expires: new Date(Date.now() + 15 * 60 * 1000) })
        res.cookie('refreshToken', refreshToken, { ...getCookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000, expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })

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

        res.cookie('accessToken', accessToken, { ...getCookieOptions(), maxAge: 15 * 60 * 1000, expires: new Date(Date.now() + 15 * 60 * 1000) })
        res.cookie('refreshToken', refreshToken, { ...getCookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000, expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })

        const { password: _, ...userWithoutPassword } = user
        return successResponse(res, { user: userWithoutPassword }, 'Login successful')
    } catch (err) {
        next(err)
    }
}

const logout = (req, res) => {
    res.clearCookie('accessToken', getCookieOptions())
    res.clearCookie('refreshToken', getCookieOptions())
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

        res.cookie('accessToken', newAccessToken, { ...getCookieOptions(), maxAge: 15 * 60 * 1000 })
        res.cookie('refreshToken', newRefreshToken, { ...getCookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 })

        return successResponse(res, { message: 'Token refreshed' })
    } catch (err) {
        return errorResponse(res, 'Invalid refresh token', 401)
    }
}

const getMe = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, avatarUrl: true, role: true, activeWorkspaceId: true, createdAt: true, emailVerified: true }
        })
        if (!user) return errorResponse(res, 'User not found', 404)
        return successResponse(res, { user })
    } catch (err) {
        next(err)
    }
}

const googleRedirect = (req, res) => {
    const url = getGoogleClient().generateAuthUrl({
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

        const googleClient = getGoogleClient()
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
                data: { name, email, avatarUrl: picture, password: null }
            })
        } else if (!user.avatarUrl && picture) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { avatarUrl: picture }
            })
        }

        const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role, name: user.name })
        const refreshToken = signRefreshToken({ id: user.id })

        res.cookie('accessToken', accessToken, { ...getCookieOptions(), maxAge: 15 * 60 * 1000, expires: new Date(Date.now() + 15 * 60 * 1000) })
        res.cookie('refreshToken', refreshToken, { ...getCookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000, expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })

        res.redirect(`${process.env.CLIENT_URL}/auth/callback?success=true`)
    } catch (err) {
        console.error('[Google OAuth Error]', err.message)
        res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`)
    }
}

const updateProfile = async (req, res, next) => {
    try {
        const { name, avatarUrl } = req.body
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { ...(name && { name }), ...(avatarUrl && { avatarUrl }) },
            select: { id: true, name: true, email: true, avatarUrl: true, role: true, activeWorkspaceId: true, createdAt: true }
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
        res.clearCookie('accessToken', getCookieOptions())
        res.clearCookie('refreshToken', getCookieOptions())

        return successResponse(res, null, 'Account deleted successfully')
    } catch (err) {
        next(err)
    }
}

const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.query
        if (!token) return errorResponse(res, 'Verification token is required.', 400)

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

        const user = await prisma.user.findFirst({
            where: {
                emailVerifyToken: hashedToken,
                emailVerifyExpiry: { gt: new Date() }
            }
        })

        if (!user) return errorResponse(res, 'Verification link is invalid or has expired.', 400)

        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true, emailVerifyToken: null, emailVerifyExpiry: null }
        })

        return successResponse(res, null, 'Email verified successfully. You are all set!')
    } catch (err) {
        next(err)
    }
}


const resendVerificationEmail = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, emailVerified: true }
        })
        if (!user) return errorResponse(res, 'User not found', 404)
        if (user.emailVerified) return errorResponse(res, 'Your email is already verified.', 400)

        // Rate limit: check if a non-expired token already exists (i.e. sent recently < 5 min ago)
        const existing = await prisma.user.findFirst({
            where: {
                id: user.id,
                emailVerifyExpiry: { gt: new Date(Date.now() + (24 * 60 - 5) * 60 * 1000) }
            }
        })
        if (existing) return errorResponse(res, 'A verification email was sent recently. Please wait a few minutes before requesting again.', 429)

        const rawToken = crypto.randomBytes(32).toString('hex')
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')
        const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerifyToken: hashedToken, emailVerifyExpiry: expiry }
        })

        const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${rawToken}`
        await emailService.sendEmailVerification({ to: user.email, userName: user.name, verifyUrl })

        return successResponse(res, null, 'Verification email sent! Check your inbox.')
    } catch (err) {
        next(err)
    }
}

export { register, login, logout, refreshToken, getMe, googleRedirect, googleCallback, updateProfile, forgotPassword, resetPassword, changePassword, deleteAccount, verifyEmail, resendVerificationEmail }
