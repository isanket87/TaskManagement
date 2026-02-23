import { Router } from 'express'
import {
    getTasks, createTask, getTask, updateTask, deleteTask,
    updateStatus, updatePosition, updateDueDate, snoozeTask,
    bulkUpdateDueDate, getDueDateSummary, getUpcomingTasks, getOverdueTasks,
    getCalendarTasks, getDashboardStats, getTaskActivities, bulkImportTasks
} from '../controllers/taskController.js'
import auth from '../middleware/auth.js'

const router = Router({ mergeParams: true })

router.use(auth)

// Due date global routes (no projectId)
router.get('/due-date-summary', getDueDateSummary)
router.get('/upcoming', getUpcomingTasks)
router.get('/overdue', getOverdueTasks)
router.patch('/bulk-due-date', bulkUpdateDueDate)
router.get('/calendar', getCalendarTasks)
router.get('/dashboard/stats', getDashboardStats)

// Project task routes (with :id = projectId)
router.get('/', getTasks)
router.post('/bulk', bulkImportTasks)
router.post('/', createTask)
router.get('/:taskId', getTask)
router.put('/:taskId', updateTask)
router.delete('/:taskId', deleteTask)
router.patch('/:taskId/status', updateStatus)
router.patch('/:taskId/position', updatePosition)
router.patch('/:taskId/due-date', updateDueDate)
router.patch('/:taskId/snooze', snoozeTask)
router.get('/:taskId/activities', getTaskActivities)

export default router
