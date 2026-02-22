const { Router } = require('express');
const { getNotifications, markRead, markAllRead, deleteNotification } = require('../controllers/notificationController');
const auth = require('../middleware/auth');

const router = Router();
router.use(auth);

router.get('/', getNotifications);
router.patch('/:id/read', markRead);
router.patch('/read-all', markAllRead);
router.delete('/:id', deleteNotification);

module.exports = router;
