import { verifyAccessToken } from '../utils/jwt.js'
import { errorResponse } from '../utils/helpers.js'

const auth = (req, res, next) => {
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
