const { Router } = require('express');
const { getPrefs, updatePrefs, testSlack, testEmail } = require('../controllers/notificationPrefController');
const auth = require('../middleware/auth');

const router = Router();
router.use(auth);
router.get('/', getPrefs);
router.put('/', updatePrefs);
router.post('/test-slack', testSlack);
router.post('/test-email', testEmail);

module.exports = router;
