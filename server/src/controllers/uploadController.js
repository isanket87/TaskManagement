const prisma = require('../utils/prisma');
const { uploadFile, deleteFile } = require('../services/r2Service');
const { successResponse, errorResponse } = require('../utils/helpers');

const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
    'application/zip', 'application/x-zip-compressed',
];

const MAX_SIZE_MB = 10;

const uploadAttachment = async (req, res, next) => {
    try {
        const { taskId } = req.params;

        if (!req.file) return errorResponse(res, 'No file provided', 400);

        const { buffer, mimetype, originalname, size } = req.file;

        if (!ALLOWED_TYPES.includes(mimetype)) {
            return errorResponse(res, `File type not allowed: ${mimetype}`, 400);
        }

        if (size > MAX_SIZE_MB * 1024 * 1024) {
            return errorResponse(res, `File exceeds ${MAX_SIZE_MB}MB limit`, 400);
        }

        // Verify task exists and user has access
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { project: { include: { members: true } } },
        });
        if (!task) return errorResponse(res, 'Task not found', 404);

        const isMember = task.project.members.some(m => m.userId === req.user.id)
            || task.project.ownerId === req.user.id;
        if (!isMember) return errorResponse(res, 'Access denied', 403);

        const { key, url, name } = await uploadFile(buffer, originalname, mimetype);

        const attachment = await prisma.attachment.create({
            data: {
                taskId,
                name,
                url,
                type: mimetype,
                // store key for deletion
            },
        });

        // Store key separately in the name field with prefix for deletion support
        await prisma.attachment.update({
            where: { id: attachment.id },
            data: { name: `${name}||${key}` },
        });

        return successResponse(res, {
            attachment: {
                id: attachment.id,
                name,
                url,
                type: mimetype,
                taskId,
            }
        }, 'File uploaded successfully', 201);
    } catch (err) {
        next(err);
    }
};

const deleteAttachment = async (req, res, next) => {
    try {
        const { taskId, attachmentId } = req.params;

        const attachment = await prisma.attachment.findUnique({
            where: { id: attachmentId },
            include: { task: { include: { project: { include: { members: true } } } } },
        });

        if (!attachment || attachment.taskId !== taskId) {
            return errorResponse(res, 'Attachment not found', 404);
        }

        const isMember = attachment.task.project.members.some(m => m.userId === req.user.id)
            || attachment.task.project.ownerId === req.user.id;
        if (!isMember) return errorResponse(res, 'Access denied', 403);

        // Extract R2 key from stored name
        const parts = attachment.name.split('||');
        const key = parts[1];
        if (key) {
            try { await deleteFile(key); } catch (e) { /* ignore if already deleted */ }
        }

        await prisma.attachment.delete({ where: { id: attachmentId } });

        return successResponse(res, null, 'Attachment deleted');
    } catch (err) {
        next(err);
    }
};

const getAttachments = async (req, res, next) => {
    try {
        const { taskId } = req.params;
        const attachments = await prisma.attachment.findMany({
            where: { taskId },
            orderBy: { createdAt: 'desc' },
        });

        const formatted = attachments.map(a => {
            const parts = a.name.split('||');
            return { ...a, name: parts[0] };
        });

        return successResponse(res, { attachments: formatted });
    } catch (err) {
        next(err);
    }
};

module.exports = { uploadAttachment, deleteAttachment, getAttachments };
