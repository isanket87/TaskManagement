import { verifyAccessToken } from '../utils/jwt.js'
import { errorResponse } from '../utils/helpers.js'
import { apiKeyAuth } from './apiKeyAuth.js'

const auth = async (req, res, next) => {
    // If request contains API key, delegate to API key middleware
    if (req.headers['x-api-key']) {
        return apiKeyAuth(req, res, next)
    }

    // Otherwise use standard JWT cookie auth
    try {
        const token = req.cookies?.accessToken
        if (!token) {
            return errorResponse(res, 'Authentication required', 401)
        }

        const decoded = verifyAccessToken(token)
        req.user = decoded
        next()
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return errorResponse(res, 'Token expired', 401)
        }
        return errorResponse(res, 'Invalid token', 401)
    }
}

export default auth
