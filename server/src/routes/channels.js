import { Router } from 'express'
import {
    getChannels, createChannel, getChannel, updateChannel, deleteChannel,
    addMember, removeMember, markRead, getUnreadCounts
} from '../controllers/channelController.js'
import { getMessages, sendMessage, editMessage, deleteMessage, addReaction, getThread, replyToThread } from '../controllers/messageController.js'
import auth from '../middleware/auth.js'

const router = Router()
router.use(auth)

router.get('/unread-counts', getUnreadCounts)
router.get('/', getChannels)
router.post('/', createChannel)
router.get('/:id', getChannel)
router.put('/:id', updateChannel)
router.delete('/:id', deleteChannel)
router.patch('/:id/read', markRead)

// Members
router.post('/:id/members', addMember)
router.delete('/:id/members/:userId', removeMember)

// Messages
router.get('/:id/messages', getMessages)
router.post('/:id/messages', sendMessage)
router.put('/:id/messages/:msgId', editMessage)
router.delete('/:id/messages/:msgId', deleteMessage)
router.post('/:id/messages/:msgId/reactions', addReaction)
router.get('/:id/messages/:msgId/thread', getThread)
router.post('/:id/messages/:msgId/thread', replyToThread)

export default router
