import { Router } from 'express'
import { getTimesheet, exportTimesheet } from '../controllers/timeEntryController.js'
import auth from '../middleware/auth.js'

const router = Router({ mergeParams: true })
router.use(auth)

router.get('/', getTimesheet)
router.get('/export', exportTimesheet)

export default router
