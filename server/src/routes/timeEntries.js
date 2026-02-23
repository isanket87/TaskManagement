import { Router } from 'express'
import { getTimeEntries, getActive, createEntry, stopTimer, updateEntry, deleteEntry, getSummary, getTimesheet, exportTimesheet } from '../controllers/timeEntryController.js'
import auth from '../middleware/auth.js'

const router = Router({ mergeParams: true })
router.use(auth)

router.get('/summary', getSummary)
router.get('/active', getActive)
router.get('/export', exportTimesheet)
router.get('/', getTimeEntries)
router.post('/', createEntry)
router.patch('/:id/stop', stopTimer)
router.put('/:id', updateEntry)
router.delete('/:id', deleteEntry)

export default router
