import crypto from 'crypto'
import prisma from '../utils/prisma.js'
import { successResponse, errorResponse } from '../utils/helpers.js'

/**
 * POST /api/api-keys
 * Create a new API key. Returns the raw key ONCE — it is never stored.
 */
export const createApiKey = async (req, res, next) => {
    try {
        const { name, workspaceId, expiresInDays } = req.body
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return errorResponse(res, 'Key name is required', 400)
        }

        // Generate a prefixed random key: brio_<64 hex chars>
        const rawKey = `brio_${crypto.randomBytes(32).toString('hex')}`
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
        const prefix = rawKey.substring(0, 12) // "brio_" + first 7 chars

        const expiresAt = expiresInDays
            ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000)
            : null

        const apiKey = await prisma.apiKey.create({
            data: {
                name: name.trim(),
                keyHash,
                prefix,
                userId: req.user.id,
                workspaceId: workspaceId || null,
                expiresAt,
            },
            select: { id: true, name: true, prefix: true, workspaceId: true, createdAt: true, expiresAt: true }
        })

        // Return raw key ONLY once
        return successResponse(res, { apiKey: { ...apiKey, key: rawKey } }, 'API key created. Save this key — it will not be shown again.', 201)
    } catch (err) {
        next(err)
    }
}

/**
 * GET /api/api-keys
 * List all API keys for the authenticated user (no raw keys, only prefix).
 */
export const listApiKeys = async (req, res, next) => {
    try {
        const keys = await prisma.apiKey.findMany({
            where: { userId: req.user.id },
            select: { id: true, name: true, prefix: true, workspaceId: true, createdAt: true, lastUsedAt: true, expiresAt: true },
            orderBy: { createdAt: 'desc' }
        })
        return successResponse(res, { apiKeys: keys })
    } catch (err) {
        next(err)
    }
}

/**
 * DELETE /api/api-keys/:id
 * Revoke an API key.
 */
export const revokeApiKey = async (req, res, next) => {
    try {
        const key = await prisma.apiKey.findFirst({
            where: { id: req.params.id, userId: req.user.id }
        })
        if (!key) return errorResponse(res, 'API key not found', 404)

        await prisma.apiKey.delete({ where: { id: key.id } })
        return successResponse(res, null, 'API key revoked')
    } catch (err) {
        next(err)
    }
}
