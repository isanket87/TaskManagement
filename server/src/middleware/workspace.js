import prisma from '../utils/prisma.js'

// Attach workspace to request, verify membership
export const requireWorkspace = async (req, res, next) => {
    try {
        const slug = req.params.slug || req.body.slug

        if (!slug) {
            return res.status(400).json({ status: 'error', message: 'Workspace slug is required' })
        }

        const workspace = await prisma.workspace.findUnique({
            where: { slug },
            include: {
                members: {
                    where: { userId: req.user.id },
                    select: { role: true }
                }
            }
        })

        if (!workspace) {
            console.log(`[WorkspaceMiddleware] 404 - Workspace not found for slug: ${slug}`)
            return res.status(404).json({ status: 'error', message: 'Workspace not found' })
        }

        const membership = workspace.members[0]
        if (!membership) {
            return res.status(403).json({ status: 'error', message: 'Access denied: You are not a member of this workspace' })
        }

        req.workspace = workspace
        req.workspaceRole = membership.role
        next()
    } catch (error) {
        console.error('Workspace middleware error:', error)
        res.status(500).json({ status: 'error', message: 'Internal server error validating workspace access' })
    }
}

// Role guards
export const requireWorkspaceOwner = (req, res, next) => {
    if (req.workspaceRole !== 'owner') {
        return res.status(403).json({ status: 'error', message: 'Workspace owner access required' })
    }
    next()
}

export const requireWorkspaceAdmin = (req, res, next) => {
    if (!['owner', 'admin'].includes(req.workspaceRole)) {
        return res.status(403).json({ status: 'error', message: 'Workspace admin access required' })
    }
    next()
}
