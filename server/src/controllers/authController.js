import bcrypt from 'bcryptjs'
import prisma from '../utils/prisma.js'
import { OAuth2Client } from 'google-auth-library'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js'
import { successResponse, errorResponse } from '../utils/helpers.js'
import { z } from 'zod'

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
)

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
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

        const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role })
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

        const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role })
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
            select: { id: true, email: true, role: true }
        })
        if (!user) return errorResponse(res, 'User not found', 401)

        const newAccessToken = signAccessToken({ id: user.id, email: user.email, role: user.role })
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

        const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role })
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

export { register, login, logout, refreshToken, getMe, googleRedirect, googleCallback, updateProfile }
