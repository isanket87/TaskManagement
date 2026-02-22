const prisma = require('../utils/prisma');
const { successResponse, errorResponse } = require('../utils/helpers');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = (buffer, options) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            options,
            (error, result) => {
                if (error) reject(error)
                else resolve(result)
            }
        )
        streamifier.createReadStream(buffer).pipe(uploadStream)
    })
};

const saveFile = async (buffer, originalName, mimeType, workspaceId) => {
    const result = await uploadToCloudinary(buffer, {
        resource_type: 'auto',
        folder: `taskflow/${workspaceId || 'general'}`,
        use_filename: true,
        unique_filename: true,
        transformation: mimeType.startsWith('image/')
            ? [{ quality: 'auto', fetch_format: 'auto' }]
            : []
    });
    return {
        storageKey: result.public_id,
        thumbnailUrl: result.secure_url,
        url: result.secure_url
    };
};

// POST /api/files/upload
const uploadFile = async (req, res, next) => {
    try {
        if (!req.file) return errorResponse(res, 'No file provided', 400);
        const { taskId, projectId } = req.body;
        const { buffer, originalname, mimetype, size } = req.file;

        if (size > parseInt(process.env.MAX_FILE_SIZE || 52428800))
            return errorResponse(res, 'File too large', 400);

        const { storageKey, thumbnailUrl, url } = await saveFile(buffer, originalname, mimetype, req.workspace?.id);
        const fileType = getFileType(mimetype);
        const cleanName = path.basename(originalname);

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
                uploadedById: req.user.id,
            },
            include: { uploadedBy: { select: { id: true, name: true, avatar: true } } },
        });

        // Create initial version record
        await prisma.fileVersion.create({
            data: { fileId: file.id, version: 1, url, storageKey, size, uploadedById: req.user.id },
        });

        return successResponse(res, { file }, 'File uploaded', 201);
    } catch (err) { next(err); }
};

// GET /api/files/:id
const getFile = async (req, res, next) => {
    try {
        const file = await prisma.file.findUnique({
            where: { id: req.params.id },
            include: { uploadedBy: { select: { id: true, name: true, avatar: true } }, versions: true },
        });
        if (!file || file.deletedAt) return errorResponse(res, 'Not found', 404);
        return successResponse(res, { file });
    } catch (err) { next(err); }
};

// GET /api/files/:storageKey/raw — raw file serving (auth gated)
const serveRaw = async (req, res, next) => {
    try {
        const filePath = path.join(UPLOAD_DIR, req.params.storageKey);
        if (!fs.existsSync(filePath)) return errorResponse(res, 'Not found', 404);
        const mimeType = mime.lookup(filePath) || 'application/octet-stream';
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'private, max-age=3600');
        fs.createReadStream(filePath).pipe(res);
    } catch (err) { next(err); }
};

// GET /api/files/preview/:storageKey — thumbnail serving
const servePreview = async (req, res, next) => {
    try {
        const filePath = path.join(UPLOAD_DIR, req.params.storageKey);
        if (!fs.existsSync(filePath)) return errorResponse(res, 'Not found', 404);
        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        fs.createReadStream(filePath).pipe(res);
    } catch (err) { next(err); }
};

// DELETE /api/files/:id
const deleteFile = async (req, res, next) => {
    try {
        const file = await prisma.file.findUnique({ where: { id: req.params.id } });
        if (!file || file.deletedAt) return errorResponse(res, 'Not found', 404);
        if (file.uploadedById !== req.user.id && req.user.role !== 'admin')
            return errorResponse(res, 'Not allowed', 403);

        await prisma.file.update({ where: { id: file.id }, data: { deletedAt: new Date() } });

        // Async cleanup
        setImmediate(async () => {
            try { await cloudinary.uploader.destroy(file.storageKey); } catch (e) { }
        });

        return successResponse(res, null, 'File deleted');
    } catch (err) { next(err); }
};

// POST /api/files/:id/versions
const uploadVersion = async (req, res, next) => {
    try {
        const file = await prisma.file.findUnique({ where: { id: req.params.id }, include: { versions: true } });
        if (!file || file.deletedAt) return errorResponse(res, 'Not found', 404);
        if (!req.file) return errorResponse(res, 'No file', 400);

        const { buffer, originalname, mimetype, size } = req.file;
        const { storageKey, thumbnailUrl, url } = await saveFile(buffer, originalname, mimetype, req.workspace?.id);

        const newVersion = (Math.max(...file.versions.map(v => v.version), 0)) + 1;

        await prisma.fileVersion.create({
            data: { fileId: file.id, version: newVersion, url, storageKey, size, uploadedById: req.user.id },
        });

        const updated = await prisma.file.update({
            where: { id: file.id },
            data: { url, storageKey, thumbnailUrl, size, originalName: originalname },
            include: { uploadedBy: { select: { id: true, name: true, avatar: true } }, versions: true },
        });

        return successResponse(res, { file: updated }, 'New version uploaded');
    } catch (err) { next(err); }
};

// GET /api/files/:id/versions
const getVersions = async (req, res, next) => {
    try {
        const versions = await prisma.fileVersion.findMany({
            where: { fileId: req.params.id },
            orderBy: { version: 'desc' },
            include: { uploadedBy: { select: { id: true, name: true, avatar: true } } },
        });
        return successResponse(res, { versions });
    } catch (err) { next(err); }
};

// GET /api/projects/:id/files
const getProjectFiles = async (req, res, next) => {
    try {
        const { id: projectId } = req.params;
        const { q, type } = req.query;
        const files = await prisma.file.findMany({
            where: {
                projectId,
                deletedAt: null,
                ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
                ...(type ? { type } : {}),
            },
            orderBy: { createdAt: 'desc' },
            include: { uploadedBy: { select: { id: true, name: true, avatar: true } }, task: { select: { id: true, title: true } } },
        });
        return successResponse(res, { files });
    } catch (err) { next(err); }
};

// GET /api/tasks/:id/files
const getTaskFiles = async (req, res, next) => {
    try {
        const files = await prisma.file.findMany({
            where: { taskId: req.params.id, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            include: { uploadedBy: { select: { id: true, name: true, avatar: true } } },
        });
        return successResponse(res, { files });
    } catch (err) { next(err); }
};

module.exports = { uploadFile, getFile, serveRaw, servePreview, deleteFile, uploadVersion, getVersions, getProjectFiles, getTaskFiles };
