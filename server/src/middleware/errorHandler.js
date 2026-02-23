import { ZodError } from 'zod'

const errorHandler = (err, req, res, next) => {
    console.error(`[Error] ${err.message}`, err.stack)

    if (err instanceof ZodError) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
        })
    }

    if (err.code === 'P2025') {
        return res.status(404).json({ success: false, message: 'Record not found' })
    }
    if (err.code === 'P2002') {
        return res.status(409).json({ success: false, message: 'Record already exists' })
    }

    const statusCode = err.statusCode || 500
    return res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    })
}

export default errorHandler
