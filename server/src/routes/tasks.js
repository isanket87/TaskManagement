import { Router } from 'express'
import {
    getTasks, createTask, getTask, updateTask, deleteTask, duplicateTask,
    updateStatus, updatePosition, updateDueDate, snoozeTask,
    bulkUpdateDueDate, getDueDateSummary, getUpcomingTasks, getOverdueTasks,
    getCalendarTasks, getDashboardStats, getTaskActivities, bulkImportTasks
} from '../controllers/taskController.js'
import { getDependencies, addDependency, removeDependency } from '../controllers/taskDependencyController.js'
import auth from '../middleware/auth.js'

const router = Router({ mergeParams: true })

router.use(auth)

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task management within projects and workspaces
 */

// Due date global routes (no projectId)

/**
 * @swagger
 * /api/workspaces/{slug}/tasks/due-date-summary:
 *   get:
 *     summary: Get summary of due dates for the current user in a workspace
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Due date summary
 */
router.get('/due-date-summary', getDueDateSummary)

/**
 * @swagger
 * /api/workspaces/{slug}/tasks/upcoming:
 *   get:
 *     summary: Get upcoming tasks for the current user
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *     responses:
 *       200:
 *         description: List of upcoming tasks
 */
router.get('/upcoming', getUpcomingTasks)

/**
 * @swagger
 * /api/workspaces/{slug}/tasks/overdue:
 *   get:
 *     summary: Get overdue tasks for the current user
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of overdue tasks
 */
router.get('/overdue', getOverdueTasks)

/**
 * @swagger
 * /api/workspaces/{slug}/tasks/bulk-due-date:
 *   patch:
 *     summary: Bulk update due dates for tasks
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskIds
 *               - dueDate
 *             properties:
 *               taskIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               hasDueTime:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Tasks updated
 */
router.patch('/bulk-due-date', bulkUpdateDueDate)

/**
 * @swagger
 * /api/workspaces/{slug}/tasks/calendar:
 *   get:
 *     summary: Get tasks for calendar view
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *           description: YYYY-MM
 *     responses:
 *       200:
 *         description: List of tasks for the month
 */
router.get('/calendar', getCalendarTasks)

/**
 * @swagger
 * /api/workspaces/{slug}/tasks/dashboard/stats:
 *   get:
 *     summary: Get task statistics for user dashboard
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.get('/dashboard/stats', getDashboardStats)

// Project task routes (with :id = projectId)

/**
 * @swagger
 * /api/workspaces/{slug}/projects/{id}/tasks:
 *   get:
 *     summary: List tasks in a project
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           description: Project ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *       - in: query
 *         name: assigneeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of tasks
 */
router.get('/', getTasks)

/**
 * @swagger
 * /api/workspaces/{slug}/projects/{id}/tasks/bulk:
 *   post:
 *     summary: Bulk import tasks to a project
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tasks
 *             properties:
 *               tasks:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - title
 *                   properties:
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *     responses:
 *       200:
 *         description: Tasks imported
 */
router.post('/bulk', bulkImportTasks)

/**
 * @swagger
 * /api/workspaces/{slug}/projects/{id}/tasks:
 *   post:
 *     summary: Create a new task in a project
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *               priority:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               assigneeId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Task created
 */
router.post('/', createTask)

/**
 * @swagger
 * /api/workspaces/{slug}/projects/{id}/tasks/{taskId}/duplicate:
 *   post:
 *     summary: Duplicate a task
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Task duplicated
 */
router.post('/:taskId/duplicate', duplicateTask)

/**
 * @swagger
 * /api/workspaces/{slug}/tasks/{taskId}:
 *   get:
 *     summary: Get task details
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task details
 */
router.get('/:taskId', getTask)

/**
 * @swagger
 * /api/workspaces/{slug}/tasks/{taskId}:
 *   put:
 *     summary: Update a task
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *               priority:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Task updated
 */
router.put('/:taskId', updateTask)
router.patch('/:taskId', updateTask)

/**
 * @swagger
 * /api/workspaces/{slug}/tasks/{taskId}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted
 */
router.delete('/:taskId', deleteTask)

/**
 * @swagger
 * /api/workspaces/{slug}/tasks/{taskId}/status:
 *   patch:
 *     summary: Update task status
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:taskId/status', updateStatus)

/**
 * @swagger
 * /api/workspaces/{slug}/tasks/{taskId}/position:
 *   patch:
 *     summary: Update task position
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - position
 *             properties:
 *               position:
 *                 type: integer
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Position updated
 */
router.patch('/:taskId/position', updatePosition)

/**
 * @swagger
 * /api/workspaces/{slug}/tasks/{taskId}/due-date:
 *   patch:
 *     summary: Update task due date
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dueDate
 *             properties:
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               hasDueTime:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Due date updated
 */
router.patch('/:taskId/due-date', updateDueDate)

/**
 * @swagger
 * /api/workspaces/{slug}/tasks/{taskId}/snooze:
 *   patch:
 *     summary: Snooze a task
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - snoozedUntil
 *             properties:
 *               snoozedUntil:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Task snoozed
 */
router.patch('/:taskId/snooze', snoozeTask)

/**
 * @swagger
 * /api/workspaces/{slug}/tasks/{taskId}/activities:
 *   get:
 *     summary: Get task activity log
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Activity log
 */
router.get('/:taskId/activities', getTaskActivities)

// Task dependencies

/**
 * @swagger
 * /api/workspaces/{slug}/tasks/{taskId}/dependencies:
 *   get:
 *     summary: Get task dependencies
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of dependencies
 */
router.get('/:taskId/dependencies', getDependencies)

/**
 * @swagger
 * /api/workspaces/{slug}/tasks/{taskId}/dependencies:
 *   post:
 *     summary: Add a task dependency
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - blockingTaskId
 *             properties:
 *               blockingTaskId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Dependency added
 */
router.post('/:taskId/dependencies', addDependency)

/**
 * @swagger
 * /api/workspaces/{slug}/tasks/{taskId}/dependencies/{depId}:
 *   delete:
 *     summary: Remove a task dependency
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: depId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dependency removed
 */
router.delete('/:taskId/dependencies/:depId', removeDependency)

export default router
