const { Router } = require('express');
const {
    getProjects, createProject, getProject, updateProject, deleteProject,
    getMembers, addMember, removeMember, getActivity, getAnalytics,
} = require('../controllers/projectController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router({ mergeParams: true });

router.use(auth);

// We expect `req.workspace` to be populated by `requireWorkspace` in the parent router
router.get('/', getProjects);
router.post('/', createProject);
router.get('/:id', getProject);
router.put('/:id', authorize(['member']), updateProject);
router.delete('/:id', authorize(['owner']), deleteProject);
router.get('/:id/members', getMembers);
router.post('/:id/members', authorize(['admin', 'owner']), addMember);
router.delete('/:id/members/:userId', authorize(['admin', 'owner']), removeMember);
router.get('/:id/activity', getActivity);
router.get('/:id/analytics', getAnalytics);

module.exports = router;
