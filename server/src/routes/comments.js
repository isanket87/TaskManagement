import { Router } from 'express'
import { getComments, createComment, updateComment, deleteComment } from '../controllers/commentController.js'
import auth from '../middleware/auth.js'

const router = Router({ mergeParams: true })
router.use(auth)

router.get('/', getComments)
router.post('/', createComment)
router.put('/:commentId', updateComment)
router.delete('/:commentId', deleteComment)

export default router
