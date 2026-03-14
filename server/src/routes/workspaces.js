import express from 'express'
import auth from '../middleware/auth.js'
import {
    requireWorkspace,
    requireWorkspaceAdmin,
    requireWorkspaceOwner
} from '../middleware/workspace.js'
import * as workspaceController from '../controllers/workspaceController.js'
import projectRoutes from './projects.js'
import taskRoutes from './tasks.js'
import commentRoutes from './comments.js'
import attachmentRoutes from './attachments.js'
import timeEntryRoutes from './timeEntries.js'
import timesheetRoutes from './timesheets.js'
import notificationRoutes from './notifications.js'
import fileRoutes from './files.js'
import channelRoutes from './channels.js'
import notifPrefRoutes from './notificationPreferences.js'
import { getDashboardStats } from '../controllers/taskController.js'
import { getWorkspaceAnalytics } from '../controllers/workspaceController.js'

const router = express.Router({ mergeParams: true })

/**
 * @swagger
 * tags:
 *   name: Workspaces
 *   description: Workspace and team management
 */

/**
 * @swagger
 * /api/workspaces/check-slug:
 *   get:
 *     summary: Check if a workspace slug is available
 *     tags: [Workspaces]
 *     parameters:
 *       - in: query
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Availability status
 */
router.get('/check-slug', workspaceController.checkSlugAvailability)

/**
 * @swagger
 * /api/workspaces/invites/{token}/accept:
 *   post:
 *     summary: Accept a workspace invite
 *     tags: [Workspaces]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invite accepted
 */
router.post('/invites/:token/accept', auth, workspaceController.acceptInvite)

/**
 * @swagger
 * /api/workspaces/invites/{token}:
 *   get:
 *     summary: Get workspace invite details (for public view)
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invite and workspace basic info
 */
router.get('/invites/:token', workspaceController.getInviteDetails)

// Require Auth
router.use(auth)

/**
 * @swagger
 * /api/workspaces:
 *   post:
 *     summary: Create a new workspace
 *     tags: [Workspaces]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *     responses:
 *       201:
 *         description: Workspace created
 */
router.post('/', workspaceController.createWorkspace)

/**
 * @swagger
 * /api/workspaces:
 *   get:
 *     summary: Get workspaces I belong to
 *     tags: [Workspaces]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of workspaces
 */
router.get('/', workspaceController.getMyWorkspaces)

/**
 * @swagger
 * /api/workspaces/{slug}:
 *   get:
 *     summary: Get detailed info about a workspace
 *     tags: [Workspaces]
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
 *         description: Workspace details
 */
router.get('/:slug', requireWorkspace, workspaceController.getWorkspaceDetails)

/**
 * @swagger
 * /api/workspaces/{slug}/active:
 *   patch:
 *     summary: Set a workspace as active for the user
 *     tags: [Workspaces]
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
 *         description: Active workspace updated
 */
router.patch('/:slug/active', requireWorkspace, workspaceController.setActiveWorkspace)

/**
 * @swagger
 * /api/workspaces/{slug}/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics for a workspace
 *     tags: [Workspaces]
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
 *         description: Workspace stats (tasks, members, etc.)
 */
router.get('/:slug/dashboard/stats', requireWorkspace, getDashboardStats)

/**
 * @swagger
 * /api/workspaces/{slug}/analytics:
 *   get:
 *     summary: Get detailed analytics for a workspace
 *     tags: [Workspaces]
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
 *         description: Analytical data
 */
router.get('/:slug/analytics', requireWorkspace, getWorkspaceAnalytics)

/**
 * @swagger
 * /api/workspaces/{slug}/search:
 *   get:
 *     summary: Search across the entire workspace
 *     tags: [Workspaces]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/:slug/search', requireWorkspace, workspaceController.searchWorkspace)

// Mount sub-resources scoped to this workspace
router.use('/:slug/projects', requireWorkspace, projectRoutes)
router.use('/:slug/projects/:id/tasks', requireWorkspace, taskRoutes)
router.use('/:slug/tasks', requireWorkspace, taskRoutes)
router.use('/:slug/tasks/:taskId/comments', requireWorkspace, commentRoutes)
router.use('/:slug/tasks/:taskId/attachments', requireWorkspace, attachmentRoutes)
router.use('/:slug/time-entries', requireWorkspace, timeEntryRoutes)
router.use('/:slug/timesheets', requireWorkspace, timesheetRoutes)
router.use('/:slug/notifications', requireWorkspace, notificationRoutes)
router.use('/:slug/files', requireWorkspace, fileRoutes)
router.use('/:slug/channels', requireWorkspace, channelRoutes)
router.use('/:slug/notification-preferences', requireWorkspace, notifPrefRoutes)

// Members
router.get('/:slug/members', requireWorkspace, workspaceController.getMembers)

// Require Admin (Owner or Admin)
router.put('/:slug', requireWorkspace, requireWorkspaceAdmin, workspaceController.updateWorkspace)
router.post('/:slug/members', requireWorkspace, requireWorkspaceAdmin, workspaceController.inviteMember)
router.put('/:slug/members/:userId', requireWorkspace, requireWorkspaceAdmin, workspaceController.updateMemberRole)
router.get('/:slug/invites', requireWorkspace, requireWorkspaceAdmin, workspaceController.getPendingInvites)
router.delete('/:slug/invites/:inviteId', requireWorkspace, requireWorkspaceAdmin, workspaceController.deleteInvite)

// Require Owner or Admin (for removing members, handle logic internally)
router.delete('/:slug/members/:userId', requireWorkspace, workspaceController.removeMember)

// Require Owner strictly
router.delete('/:slug', requireWorkspace, requireWorkspaceOwner, workspaceController.deleteWorkspace)

export default router
