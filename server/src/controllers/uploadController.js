import prisma from '../utils/prisma.js'
import { successResponse, errorResponse } from '../utils/helpers.js'
import { uploadFile, deleteFile } from '../services/r2Service.js'

const getFileType = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType.includes('pdf')) return 'pdf'
    if (mimeType.includes('msword') || mimeType.includes('officedocument')) return 'document'
    return 'file'
}

export const uploadAttachment = async (req, res, next) => {
    try {
        if (!req.file) return errorResponse(res, 'No file uploaded', 400)
        const { taskId } = req.params
        const { buffer, originalname, mimetype } = req.file

        const { key, url } = await uploadFile(buffer, originalname, mimetype)
        const fileType = getFileType(mimetype)

        const attachment = await prisma.attachment.create({
            data: {
                name: originalname,
                url,
                storageKey: key,
                mimeType: mimetype,
                size: buffer.length,
                type: fileType,
                taskId,
                uploadedById: req.user.id
            }
        })

        return successResponse(res, { attachment }, 'File uploaded', 201)
    } catch (err) {
        next(err)
    }
}

export const deleteAttachment = async (req, res, next) => {
    try {
        const { attachmentId } = req.params
        const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } })

        if (!attachment) return errorResponse(res, 'Not found', 404)

        await deleteFile(attachment.storageKey)
        await prisma.attachment.delete({ where: { id: attachmentId } })

        return successResponse(res, null, 'File deleted')
    } catch (err) {
        next(err)
    }
}

export const getAttachments = async (req, res, next) => {
    try {
        const { taskId } = req.params
        const attachments = await prisma.attachment.findMany({
            where: { taskId },
            orderBy: { createdAt: 'desc' }
        })
        return successResponse(res, { attachments })
    } catch (err) {
        next(err)
    }
}
