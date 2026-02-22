const { Router } = require('express');
const multer = require('multer');
const { uploadAttachment, deleteAttachment, getAttachments } = require('../controllers/uploadController');
const auth = require('../middleware/auth');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router({ mergeParams: true });

router.use(auth);

router.get('/', getAttachments);
router.post('/', upload.single('file'), uploadAttachment);
router.delete('/:attachmentId', deleteAttachment);

module.exports = router;
