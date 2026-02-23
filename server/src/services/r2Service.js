import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
})

const BUCKET = process.env.R2_BUCKET_NAME
const PUBLIC_URL = process.env.R2_PUBLIC_URL

/**
 * Upload a file buffer to Cloudflare R2
 * @param {Buffer} buffer - File content
 * @param {string} originalName - Original filename
 * @param {string} mimeType - MIME type
 * @param {string} folder - Subfolder (e.g. 'attachments')
 * @returns {{ key: string, url: string, name: string }}
 */
export const uploadFile = async (buffer, originalName, mimeType, folder = 'attachments') => {
    const ext = originalName.split('.').pop()
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    await r2Client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ContentDisposition: `inline; filename="${originalName}"`
    }))

    const url = `${PUBLIC_URL}/${key}`
    return { key, url, name: originalName }
}

/**
 * Delete a file from Cloudflare R2
 * @param {string} key - Object key in the bucket
 */
export const deleteFile = async (key) => {
    await r2Client.send(new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key
    }))
}
