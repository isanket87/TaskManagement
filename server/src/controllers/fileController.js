import prisma from '../utils/prisma.js'
import { successResponse, errorResponse } from '../utils/helpers.js'
import path from 'path'
import * as r2Service from '../services/r2Service.js'

const saveFile = async (buffer, originalName, mimeType, workspaceId) => {
    const folder = workspaceId ? `workspace-${workspaceId}` : 'general'
    const result = await r2Service.uploadFile(buffer, originalName, mimeType, folder)
    return {
        storageKey: result.key,
        thumbnailUrl: result.url, // R2 doesn't auto-gen thumbs, using same URL
        url: result.url
    }
}

const getFileType = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType.includes('pdf')) return 'pdf'
    if (mimeType.includes('msword') || mimeType.includes('officedocument')) return 'document'
    return 'file'
}

// POST /api/files/upload
const uploadFile = async (req, res, next) => {
    try {
        if (!req.file) return errorResponse(res, 'No file provided', 400)
        const { taskId, projectId } = req.body
        const { buffer, originalname, mimetype, size } = req.file

        if (size > parseInt(process.env.MAX_FILE_SIZE || 52428800)) {
            return errorResponse(res, 'File too large', 400)
        }

        const { storageKey, thumbnailUrl, url } = await saveFile(buffer, originalname, mimetype, req.workspace?.id)
        const fileType = getFileType(mimetype)
        const cleanName = path.basename(originalname)

        const file = await prisma.file.create({
            data: {
                name: cleanName,
                originalName: cleanName,
                mimeType: mimetype,
                size,
                url,
                storageKey,
                thumbnailUrl,
                type: fileType,
                projectId: projectId || null,
                taskId: taskId || null,
                uploadedById: req.user.id
            },
            include: { uploadedBy: { select: { id: true, name: true, avatarUrl: true } } }
        })

        // Create initial version record
        await prisma.fileVersion.create({
            data: { fileId: file.id, version: 1, url, storageKey, size, uploadedById: req.user.id }
        })

        return successResponse(res, { file }, 'File uploaded', 201)
    } catch (err) { next(err) }
}

// GET /api/files/:id
const getFile = async (req, res, next) => {
    try {
        const file = await prisma.file.findUnique({
            where: { id: req.params.id },
            include: { uploadedBy: { select: { id: true, name: true, avatarUrl: true } }, versions: true }
        })
        if (!file || file.deletedAt) return errorResponse(res, 'Not found', 404)
        return successResponse(res, { file })
    } catch (err) { next(err) }
}

// GET /api/files/:storageKey/raw
const serveRaw = async (req, res, next) => {
    try {
        const file = await prisma.file.findFirst({ where: { storageKey: req.params.storageKey } })
        if (!file) return errorResponse(res, 'Not found', 404)
        res.redirect(file.url)
    } catch (err) { next(err) }
}

// GET /api/files/preview/:storageKey
const servePreview = async (req, res, next) => {
    try {
        const file = await prisma.file.findFirst({ where: { storageKey: req.params.storageKey } })
        if (!file) return errorResponse(res, 'Not found', 404)
        res.redirect(file.thumbnailUrl || file.url)
    } catch (err) { next(err) }
}

// DELETE /api/files/:id
const deleteFile = async (req, res, next) => {
    try {
        const file = await prisma.file.findUnique({ where: { id: req.params.id } })
        if (!file || file.deletedAt) return errorResponse(res, 'Not found', 404)
        if (file.uploadedById !== req.user.id && req.user.role !== 'admin') {
            return errorResponse(res, 'Not allowed', 403)
        }

        await prisma.file.update({ where: { id: file.id }, data: { deletedAt: new Date() } })

        // Async cleanup from R2
        setImmediate(async () => {
            try { await r2Service.deleteFile(file.storageKey) } catch (e) { }
        })

        return successResponse(res, null, 'File deleted')
    } catch (err) { next(err) }
}

// POST /api/files/:id/versions
const uploadVersion = async (req, res, next) => {
    try {
        const file = await prisma.file.findUnique({ where: { id: req.params.id }, include: { versions: true } })
        if (!file || file.deletedAt) return errorResponse(res, 'Not found', 404)
        if (!req.file) return errorResponse(res, 'No file', 400)

        const { buffer, originalname, mimetype, size } = req.file
        const { storageKey, thumbnailUrl, url } = await saveFile(buffer, originalname, mimetype, req.workspace?.id)

        const newVersion = (Math.max(...file.versions.map(v => v.version), 0)) + 1

        await prisma.fileVersion.create({
            data: { fileId: file.id, version: newVersion, url, storageKey, size, uploadedById: req.user.id }
        })

        const updated = await prisma.file.update({
            where: { id: file.id },
            data: { url, storageKey, thumbnailUrl, size, originalName: originalname },
            include: { uploadedBy: { select: { id: true, name: true, avatarUrl: true } }, versions: true }
        })

        return successResponse(res, { file: updated }, 'New version uploaded')
    } catch (err) { next(err) }
}

// GET /api/files/:id/versions
const getVersions = async (req, res, next) => {
    try {
        const versions = await prisma.fileVersion.findMany({
            where: { fileId: req.params.id },
            orderBy: { version: 'desc' },
            include: { uploadedBy: { select: { id: true, name: true, avatarUrl: true } } }
        })
        return successResponse(res, { versions })
    } catch (err) { next(err) }
}

// GET /api/projects/:id/files
const getProjectFiles = async (req, res, next) => {
    try {
        const { id: projectId } = req.params
        const { q, type } = req.query
        const files = await prisma.file.findMany({
            where: {
                projectId,
                deletedAt: null,
                ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
                ...(type ? { type } : {})
            },
            orderBy: { createdAt: 'desc' },
            include: { uploadedBy: { select: { id: true, name: true, avatarUrl: true } }, task: { select: { id: true, title: true } } }
        })
        return successResponse(res, { files })
    } catch (err) { next(err) }
}

// GET /api/tasks/:id/files
const getTaskFiles = async (req, res, next) => {
    try {
        const files = await prisma.file.findMany({
            where: { taskId: req.params.id, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            include: { uploadedBy: { select: { id: true, name: true, avatarUrl: true } } }
        })
        return successResponse(res, { files })
    } catch (err) { next(err) }
}

export { uploadFile, getFile, serveRaw, servePreview, deleteFile, uploadVersion, getVersions, getProjectFiles, getTaskFiles }
