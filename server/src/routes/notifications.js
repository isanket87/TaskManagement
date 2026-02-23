import { Router } from 'express'
import { getNotifications, markRead, markAllRead, deleteNotification } from '../controllers/notificationController.js'
import auth from '../middleware/auth.js'

const router = Router()
router.use(auth)

router.get('/', getNotifications)
router.patch('/:id/read', markRead)
router.patch('/read-all', markAllRead)
router.delete('/:id', deleteNotification)

export default router
