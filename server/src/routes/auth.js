import { Router } from 'express'
import { register, login, logout, refreshToken, getMe, googleRedirect, googleCallback, updateProfile } from '../controllers/authController.js'
import auth from '../middleware/auth.js'
import rateLimit from 'express-rate-limit'

const router = Router()

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'development'
})

router.post('/register', authLimiter, register)
router.post('/login', authLimiter, login)
router.post('/logout', logout)
router.post('/refresh', refreshToken)
router.get('/me', auth, getMe)
router.patch('/profile', auth, updateProfile)

// Google OAuth
router.get('/google', googleRedirect)
router.get('/google/callback', googleCallback)

export default router
