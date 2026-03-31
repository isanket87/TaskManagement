import { Router } from 'express'
import {
    getProjects, createProject, getProject, updateProject, deleteProject,
    getMembers, addMember, removeMember, getActivity, getAnalytics
} from '../controllers/projectController.js'
import { generateProjectFromPrompt } from '../controllers/aiController.js'
import auth from '../middleware/auth.js'
import authorize from '../middleware/authorize.js'

const router = Router({ mergeParams: true })

router.use(auth)

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project management within a workspace
 */

/**
 * @swagger
 * /api/workspaces/{slug}/projects:
 *   get:
 *     summary: List all projects in a workspace
 *     tags: [Projects]
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
 *         description: List of projects
 */
router.get('/', getProjects)

/**
 * @swagger
 * /api/workspaces/{slug}/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
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
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       201:
 *         description: Project created
 */
router.post('/', createProject)

/**
 * @swagger
 * /api/workspaces/{slug}/projects/ai/generate:
 *   post:
 *     summary: Generate a project and backlog using AI
 *     tags: [Projects]
 *     security:
 *       - cookieAuth: []
 */
router.post('/ai/generate', generateProjectFromPrompt)

/**
 * @swagger
 * /api/workspaces/{slug}/projects/{id}:
 *   get:
 *     summary: Get project details
 *     tags: [Projects]
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
 *     responses:
 *       200:
 *         description: Project details
 */
router.get('/:id', getProject)

/**
 * @swagger
 * /api/workspaces/{slug}/projects/{id}:
 *   put:
 *     summary: Update a project
 *     tags: [Projects]
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
 *     responses:
 *       200:
 *         description: Project updated
 */
router.put('/:id', authorize(['member']), updateProject)

/**
 * @swagger
 * /api/workspaces/{slug}/projects/{id}:
 *   delete:
 *     summary: Delete a project
 *     tags: [Projects]
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
 *     responses:
 *       200:
 *         description: Project deleted
 */
router.delete('/:id', authorize(['owner']), deleteProject)

/**
 * @swagger
 * /api/workspaces/{slug}/projects/{id}/members:
 *   get:
 *     summary: Get project members
 *     tags: [Projects]
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
 *     responses:
 *       200:
 *         description: List of members
 */
router.get('/:id/members', getMembers)

/**
 * @swagger
 * /api/workspaces/{slug}/projects/{id}/members:
 *   post:
 *     summary: Add a member to a project
 *     tags: [Projects]
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
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Member added
 */
router.post('/:id/members', authorize(['admin', 'owner']), addMember)

/**
 * @swagger
 * /api/workspaces/{slug}/projects/{id}/members/{userId}:
 *   delete:
 *     summary: Remove a member from a project
 *     tags: [Projects]
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
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed
 */
router.delete('/:id/members/:userId', authorize(['admin', 'owner']), removeMember)

/**
 * @swagger
 * /api/workspaces/{slug}/projects/{id}/activity:
 *   get:
 *     summary: Get project activity log
 *     tags: [Projects]
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
 *     responses:
 *       200:
 *         description: Activity log
 */
router.get('/:id/activity', getActivity)

/**
 * @swagger
 * /api/workspaces/{slug}/projects/{id}/analytics:
 *   get:
 *     summary: Get project-specific analytics
 *     tags: [Projects]
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
 *     responses:
 *       200:
 *         description: Analytical data for the project
 */
router.get('/:id/analytics', getAnalytics)

export default router
