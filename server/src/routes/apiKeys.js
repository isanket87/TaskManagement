import express from 'express'
import auth from '../middleware/auth.js'
import { createApiKey, listApiKeys, revokeApiKey } from '../controllers/apiKeyController.js'

const router = express.Router()

router.post('/', auth, createApiKey)
router.get('/', auth, listApiKeys)
router.delete('/:id', auth, revokeApiKey)

export default router
