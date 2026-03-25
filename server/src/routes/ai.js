import { Router } from 'express'
import { generateDraft, suggestPriority } from '../controllers/aiController.js'
import auth from '../middleware/auth.js'

const router = Router()

router.post('/generate-draft', auth, generateDraft)
router.post('/suggest-priority', auth, suggestPriority)

export default router
