import { Router } from 'express'
import { getPrefs, updatePrefs, testSlack, testEmail } from '../controllers/notificationPrefController.js'
import auth from '../middleware/auth.js'

const router = Router()
router.use(auth)
router.get('/', getPrefs)
router.put('/', updatePrefs)
router.post('/test-slack', testSlack)
router.post('/test-email', testEmail)

export default router
