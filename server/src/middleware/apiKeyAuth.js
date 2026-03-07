import crypto from 'crypto'
import prisma from '../utils/prisma.js'

/**
 * API Key middleware — reads X-API-Key header, validates against DB,
 * and sets req.user + req.apiKey on the request (mirrors JWT auth middleware).
 */
export const apiKeyAuth = async (req, res, next) => {
    const rawKey = req.headers['x-api-key']
    if (!rawKey) return res.status(401).json({ success: false, message: 'API key required' })

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')

    const apiKey = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: { user: { select: { id: true, name: true, email: true, role: true, activeWorkspaceId: true } } }
    }).catch(() => null)

    if (!apiKey) return res.status(401).json({ success: false, message: 'Invalid API key' })

    // Check expiry
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return res.status(401).json({ success: false, message: 'API key has expired' })
    }

    // Update lastUsedAt (non-blocking)
    prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() }
    }).catch(() => { })

    // Attach to request (same shape as JWT auth middleware)
    req.user = apiKey.user
    req.apiKey = apiKey
    // If key is scoped to a workspace, surface that
    if (apiKey.workspaceId) req.apiWorkspaceId = apiKey.workspaceId

    next()
}
