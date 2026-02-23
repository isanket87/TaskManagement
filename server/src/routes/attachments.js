import { Router } from 'express'
import multer from 'multer'
import { uploadAttachment, deleteAttachment, getAttachments } from '../controllers/uploadController.js'
import auth from '../middleware/auth.js'

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
})

const router = Router({ mergeParams: true })

router.use(auth)

router.get('/', getAttachments)
router.post('/', upload.single('file'), uploadAttachment)
router.delete('/:attachmentId', deleteAttachment)

export default router
