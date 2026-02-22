const { Router } = require('express');
const { getTimeEntries, getActive, createEntry, stopTimer, updateEntry, deleteEntry, getSummary, getTimesheet, exportTimesheet } = require('../controllers/timeEntryController');
const auth = require('../middleware/auth');

const router = Router({ mergeParams: true });
router.use(auth);

router.get('/summary', getSummary);
router.get('/active', getActive);
router.get('/export', exportTimesheet);
router.get('/', getTimeEntries);
router.post('/', createEntry);
router.patch('/:id/stop', stopTimer);
router.put('/:id', updateEntry);
router.delete('/:id', deleteEntry);

module.exports = router;
