import express from 'express'
import auth from '../middleware/auth.js'
import { createApiKey, listApiKeys, revokeApiKey } from '../controllers/apiKeyController.js'

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: API Keys
 *   description: Personal API keys for accessing the Brioright API via MCP or other clients
 */

/**
 * @swagger
 * /api/api-keys:
 *   post:
 *     summary: Create a new API key
 *     tags: [API Keys]
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
 *             properties:
 *               name:
 *                 type: string
 *               expiresInDays:
 *                 type: integer
 *     responses:
 *       201:
 *         description: API key created. Note that the plain key is only shown once.
 */
router.post('/', auth, createApiKey)

/**
 * @swagger
 * /api/api-keys:
 *   get:
 *     summary: List all API keys for the current user
 *     tags: [API Keys]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of API keys (redacted)
 */
router.get('/', auth, listApiKeys)

/**
 * @swagger
 * /api/api-keys/{id}:
 *   delete:
 *     summary: Revoke an API key
 *     tags: [API Keys]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key revoked
 */
router.delete('/:id', auth, revokeApiKey)

export default router
