const { Router } = require('express');
const { register, login, logout, refreshToken, getMe, googleRedirect, googleCallback, updateProfile } = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const auth = require('../middleware/auth');

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.get('/me', auth, getMe);
router.patch('/profile', auth, updateProfile);

// Google OAuth
router.get('/google', googleRedirect);
router.get('/google/callback', googleCallback);

module.exports = router;

