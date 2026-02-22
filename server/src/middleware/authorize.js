const prisma = require('../utils/prisma');
const { errorResponse } = require('../utils/helpers');

/**
 * authorize(requiredRoles) - checks if the authenticated user has permission in the project
 * Role hierarchy: owner > admin > member > viewer
 * Usage: router.get('/', auth, authorize(['owner', 'admin', 'member']), handler)
 */
const roleHierarchy = { owner: 4, admin: 3, member: 2, viewer: 1 };

const authorize = (requiredRoles = []) => {
    return async (req, res, next) => {
        try {
            const { id: projectId } = req.params;
            const userId = req.user.id;

            if (!projectId) return next();

            // Check if user is project owner
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                select: { ownerId: true },
            });

            if (!project) {
                return errorResponse(res, 'Project not found', 404);
            }

            if (project.ownerId === userId) {
                req.userProjectRole = 'owner';
                return next();
            }

            // Check membership
            const membership = await prisma.projectMember.findUnique({
                where: { projectId_userId: { projectId, userId } },
            });

            if (!membership) {
                return errorResponse(res, 'Access denied: not a project member', 403);
            }

            if (requiredRoles.length > 0) {
                const userLevel = roleHierarchy[membership.role] || 0;
                const minRequired = Math.min(...requiredRoles.map((r) => roleHierarchy[r] || 0));
                if (userLevel < minRequired) {
                    return errorResponse(res, 'Insufficient permissions', 403);
                }
            }

            req.userProjectRole = membership.role;
            next();
        } catch (err) {
            next(err);
        }
    };
};

module.exports = authorize;
