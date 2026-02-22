const { Router } = require('express');
const {
    getChannels, createChannel, getChannel, updateChannel, deleteChannel,
    addMember, removeMember, markRead, getOrCreateDM, getUnreadCounts,
} = require('../controllers/channelController');
const { getMessages, sendMessage, editMessage, deleteMessage, addReaction, getThread, replyToThread } = require('../controllers/messageController');
const auth = require('../middleware/auth');

const router = Router();
router.use(auth);

router.get('/unread-counts', getUnreadCounts);
router.get('/', getChannels);
router.post('/', createChannel);
router.get('/:id', getChannel);
router.put('/:id', updateChannel);
router.delete('/:id', deleteChannel);
router.patch('/:id/read', markRead);

// Members
router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);

// Messages
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);
router.put('/:id/messages/:msgId', editMessage);
router.delete('/:id/messages/:msgId', deleteMessage);
router.post('/:id/messages/:msgId/reactions', addReaction);
router.get('/:id/messages/:msgId/thread', getThread);
router.post('/:id/messages/:msgId/thread', replyToThread);

module.exports = router;
