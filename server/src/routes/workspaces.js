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
import notificationRoutes from './notifications.js'
import fileRoutes from './files.js'
import channelRoutes from './channels.js'
import notifPrefRoutes from './notificationPreferences.js'
import { getDashboardStats } from '../controllers/taskController.js'

const router = express.Router({ mergeParams: true })

// Public / Auth handled internally
router.get('/check-slug', workspaceController.checkSlugAvailability)
router.post('/invites/:token/accept', auth, workspaceController.acceptInvite)
router.get('/invites/:token', workspaceController.getInviteDetails)

// Require Auth
router.use(auth)

router.post('/', workspaceController.createWorkspace)
router.get('/', workspaceController.getMyWorkspaces)

// Require Auth & Workspace Membership
router.get('/:slug', requireWorkspace, workspaceController.getWorkspaceDetails)
router.patch('/:slug/active', requireWorkspace, workspaceController.setActiveWorkspace)
router.get('/:slug/dashboard/stats', requireWorkspace, getDashboardStats)

// Mount sub-resources scoped to this workspace
router.use('/:slug/projects', requireWorkspace, projectRoutes)
router.use('/:slug/projects/:id/tasks', requireWorkspace, taskRoutes)
router.use('/:slug/tasks', requireWorkspace, taskRoutes)
router.use('/:slug/tasks/:taskId/comments', requireWorkspace, commentRoutes)
router.use('/:slug/tasks/:taskId/attachments', requireWorkspace, attachmentRoutes)
router.use('/:slug/time-entries', requireWorkspace, timeEntryRoutes)
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
