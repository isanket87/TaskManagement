const { Router } = require('express');
const { getComments, createComment, updateComment, deleteComment } = require('../controllers/commentController');
const auth = require('../middleware/auth');

const router = Router({ mergeParams: true });
router.use(auth);

router.get('/', getComments);
router.post('/', createComment);
router.put('/:commentId', updateComment);
router.delete('/:commentId', deleteComment);

module.exports = router;
