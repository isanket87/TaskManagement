const { Router } = require('express');
const multer = require('multer');
const { uploadFile, getFile, serveRaw, servePreview, deleteFile, uploadVersion, getVersions, getProjectFiles, getTaskFiles } = require('../controllers/fileController');
const auth = require('../middleware/auth');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || 52428800) },
});

const router = Router();

// Public-ish raw serving (still requires auth cookie)
router.get('/:storageKey/raw', auth, serveRaw);
router.get('/preview/:storageKey', auth, servePreview);

router.use(auth);
router.post('/upload', upload.single('file'), uploadFile);
router.get('/:id', getFile);
router.delete('/:id', deleteFile);
router.post('/:id/versions', upload.single('file'), uploadVersion);
router.get('/:id/versions', getVersions);

module.exports = router;
