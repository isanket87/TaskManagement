import prisma from '../utils/prisma.js'
import crypto from 'crypto'
import { createNotification } from '../services/notificationService.js'
import { emailService } from '../services/emailService.js'

// Reusable slug check logic
const isSlugAvailable = async (slug, excludeWorkspaceId = null) => {
    const whereClause = { slug }
    if (excludeWorkspaceId) {
        whereClause.id = { not: excludeWorkspaceId }
    }
    const count = await prisma.workspace.count({ where: whereClause })
    return count === 0
}

// --- CRUD Workspaces ---

const createWorkspace = async (req, res) => {
    try {
        const { name, slug, description } = req.body

        if (!name || !slug) {
            return res.status(400).json({ status: 'error', message: 'Name and slug are required' })
        }

        const available = await isSlugAvailable(slug)
        if (!available) {
            return res.status(400).json({ status: 'error', message: 'Workspace URL is already taken' })
        }

        // Transaction to create workspace and add owner
        const result = await prisma.$transaction(async (tx) => {
            const newWorkspace = await tx.workspace.create({
                data: {
                    name,
                    slug,
                    description,
                    ownerId: req.user.id,
                    members: {
                        create: [
                            { userId: req.user.id, role: 'owner' }
                        ]
                    }
                }
            })

            // Set as active workspace
            await tx.user.update({
                where: { id: req.user.id },
                data: { activeWorkspaceId: newWorkspace.id }
            })

            return newWorkspace
        })

        // Add member count for frontend
        const workspaceWithCount = { ...result, _count: { members: 1, projects: 0 } }

        res.status(201).json({ status: 'success', data: workspaceWithCount })
    } catch (error) {
        console.error('Create workspace error:', error)
        res.status(500).json({ status: 'error', message: 'Failed to create workspace' })
    }
}

const getMyWorkspaces = async (req, res) => {
    try {
        const memberships = await prisma.workspaceMember.findMany({
            where: { userId: req.user.id },
            include: {
                workspace: {
                    include: {
                        _count: {
                            select: { members: true, projects: true }
                        }
                    }
                }
            },
            orderBy: { joinedAt: 'asc' }
        })

        const formatted = memberships.map(m => ({
            ...m.workspace,
            role: m.role
        }))

        res.json({ status: 'success', data: formatted })
    } catch (error) {
        console.error('Get workspaces error:', error)
        res.status(500).json({ status: 'error', message: 'Failed to fetch workspaces' })
    }
}

const getWorkspaceDetails = async (req, res) => {
    try {
        // req.workspace is populated by middleware
        const workspaceData = await prisma.workspace.findUnique({
            where: { id: req.workspace.id },
            include: {
                _count: { select: { members: true, projects: true } },
                members: {
                    take: 5,
                    include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
                }
            }
        })

        res.json({ status: 'success', data: workspaceData })
    } catch (error) {
        console.error('Get workspace details error:', error)
        res.status(500).json({ status: 'error', message: 'Failed to fetch workspace details' })
    }
}

const updateWorkspace = async (req, res) => {
    try {
        const { name, description, logo } = req.body

        const updated = await prisma.workspace.update({
            where: { id: req.workspace.id },
            data: { name, description, logo }
        })

        res.json({ status: 'success', data: updated })
    } catch (error) {
        console.error('Update workspace error:', error)
        res.status(500).json({ status: 'error', message: 'Failed to update workspace' })
    }
}

const deleteWorkspace = async (req, res) => {
    try {
        await prisma.workspace.delete({
            where: { id: req.workspace.id }
        })

        // Also clean up activeWorkspaceId for users
        await prisma.user.updateMany({
            where: { activeWorkspaceId: req.workspace.id },
            data: { activeWorkspaceId: null }
        })

        res.json({ status: 'success', message: 'Workspace deleted successfully' })
    } catch (error) {
        console.error('Delete workspace error:', error)
        res.status(500).json({ status: 'error', message: 'Failed to delete workspace' })
    }
}

const setActiveWorkspace = async (req, res) => {
    try {
        await prisma.user.update({
            where: { id: req.user.id },
            data: { activeWorkspaceId: req.workspace.id }
        })

        res.json({
            status: 'success',
            data: {
                workspace: req.workspace,
                role: req.workspaceRole
            }
        })
    } catch (error) {
        console.error('Set active workspace error:', error)
        res.status(500).json({ status: 'error', message: 'Failed to switch active workspace' })
    }
}

const checkSlugAvailability = async (req, res) => {
    try {
        const { slug } = req.query
        if (!slug) return res.status(400).json({ status: 'error', message: 'Slug query param required' })

        const available = await isSlugAvailable(slug)
        res.json({ status: 'success', data: { available } })
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to check slug' })
    }
}

// --- Members ---

const getMembers = async (req, res) => {
    try {
        const members = await prisma.workspaceMember.findMany({
            where: { workspaceId: req.workspace.id },
            include: {
                user: { select: { id: true, name: true, email: true, avatar: true } },
                invitedBy: { select: { name: true } }
            },
            orderBy: { joinedAt: 'asc' }
        })
        res.json({ status: 'success', data: members })
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch members' })
    }
}

const updateMemberRole = async (req, res) => {
    try {
        const { userId } = req.params
        const { role } = req.body

        if (!['admin', 'member'].includes(role)) {
            return res.status(400).json({ status: 'error', message: 'Invalid role' })
        }

        const targetMember = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: req.workspace.id, userId } }
        })

        if (!targetMember) return res.status(404).json({ status: 'error', message: 'Member not found' })

        if (targetMember.role === 'owner') {
            return res.status(403).json({ status: 'error', message: 'Cannot change owner role' })
        }

        const updated = await prisma.workspaceMember.update({
            where: { id: targetMember.id },
            data: { role }
        })

        res.json({ status: 'success', data: updated })
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to update member role' })
    }
}

const removeMember = async (req, res) => {
    try {
        const { userId } = req.params

        const targetMember = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: req.workspace.id, userId } }
        })

        if (!targetMember) return res.status(404).json({ status: 'error', message: 'Member not found' })

        if (targetMember.role === 'owner') {
            return res.status(403).json({ status: 'error', message: 'Cannot remove workspace owner' })
        }

        // Admin cannot remove other admins
        if (req.workspaceRole === 'admin' && targetMember.role === 'admin') {
            return res.status(403).json({ status: 'error', message: 'Admins cannot remove other admins' })
        }

        await prisma.workspaceMember.delete({
            where: { id: targetMember.id }
        })

        // Also remove them from all projects in this workspace
        const workspaceProjects = await prisma.project.findMany({
            where: { workspaceId: req.workspace.id },
            select: { id: true }
        })

        const projectIds = workspaceProjects.map(p => p.id)

        await prisma.projectMember.deleteMany({
            where: {
                projectId: { in: projectIds },
                userId
            }
        })

        // Clear active workspace if this was their active one
        await prisma.user.updateMany({
            where: { id: userId, activeWorkspaceId: req.workspace.id },
            data: { activeWorkspaceId: null }
        })

        res.json({ status: 'success', message: 'Member removed successfully' })
    } catch (error) {
        console.error('Remove member error:', error)
        res.status(500).json({ status: 'error', message: 'Failed to remove member' })
    }
}

// --- Invites ---

const getPendingInvites = async (req, res) => {
    try {
        const invites = await prisma.workspaceInvite.findMany({
            where: {
                workspaceId: req.workspace.id,
                acceptedAt: null,
                expiresAt: { gt: new Date() }
            },
            include: {
                invitedBy: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        res.json({ status: 'success', data: { invites } })
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch invites' })
    }
}

const inviteMember = async (req, res) => {
    try {
        const { email, role } = req.body

        if (!email) return res.status(400).json({ status: 'error', message: 'Email is required' })

        // Check existing member
        const existingMember = await prisma.workspaceMember.findFirst({
            where: {
                workspaceId: req.workspace.id,
                user: { email }
            }
        })

        if (existingMember) {
            return res.status(400).json({ status: 'error', message: 'User is already a member' })
        }

        // Check pending invite
        const existingInvite = await prisma.workspaceInvite.findFirst({
            where: {
                workspaceId: req.workspace.id,
                email,
                acceptedAt: null,
                expiresAt: { gt: new Date() }
            }
        })

        if (existingInvite) {
            return res.status(400).json({ status: 'error', message: 'Invite already sent to this email' })
        }

        const token = crypto.randomUUID()
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

        const newInvite = await prisma.workspaceInvite.create({
            data: {
                workspaceId: req.workspace.id,
                email,
                role: role || 'member',
                token,
                invitedById: req.user.id,
                expiresAt
            }
        })

        const invitedUser = await prisma.user.findUnique({
            where: { email }
        })

        if (invitedUser) {
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
            await createNotification({
                userId: invitedUser.id,
                type: 'workspace_invite',
                message: `${req.user.name} invited you to join the ${req.workspace.name} workspace.`,
                link: `${clientUrl}/invite/${token}`
            })
        }

        // Get counts for the email
        const workspaceData = await prisma.workspace.findUnique({
            where: { id: req.workspace.id },
            include: { _count: { select: { members: true, projects: true } } }
        })

        // Fire and forget email
        emailService.sendWorkspaceInvite({
            to: email,
            inviterName: req.user.name,
            workspaceName: req.workspace.name,
            memberCount: workspaceData._count.members,
            projectCount: workspaceData._count.projects,
            token
        }).catch(err => console.error('Error sending invite email:', err))

        // Return full invite object so frontend can copy the link
        res.status(201).json({ status: 'success', data: newInvite })
    } catch (error) {
        console.error('Invite member error:', error)
        res.status(500).json({ status: 'error', message: 'Failed to send invite' })
    }
}

const deleteInvite = async (req, res) => {
    try {
        const { inviteId } = req.params

        await prisma.workspaceInvite.delete({
            where: {
                id: inviteId,
                workspaceId: req.workspace.id
            }
        })

        res.json({ status: 'success', message: 'Invite cancelled' })
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to cancel invite' })
    }
}

const getInviteDetails = async (req, res) => {
    try {
        const { token } = req.params

        const invite = await prisma.workspaceInvite.findUnique({
            where: { token },
            include: {
                workspace: { select: { name: true, logo: true } },
                invitedBy: { select: { name: true, avatar: true } }
            }
        })

        if (!invite) {
            return res.status(404).json({ status: 'error', message: 'Invalid invite link' })
        }

        if (invite.acceptedAt) {
            return res.status(400).json({ status: 'error', message: 'Invite already accepted' })
        }

        if (new Date() > invite.expiresAt) {
            return res.status(400).json({ status: 'error', message: 'Invite expired' })
        }

        // Check if the invited email already has an account
        const existingUser = await prisma.user.findUnique({
            where: { email: invite.email },
            select: { id: true }
        })

        // Return safe subset
        res.json({
            status: 'success',
            data: {
                workspaceName: invite.workspace.name,
                workspaceLogo: invite.workspace.logo,
                inviterName: invite.invitedBy.name,
                inviterAvatar: invite.invitedBy.avatar,
                role: invite.role,
                email: invite.email,
                userExists: !!existingUser
            }
        })
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to get invite details' })
    }
}

const acceptInvite = async (req, res) => {
    try {
        const { token } = req.params
        const userId = req.user.id
        const userEmail = req.user.email

        // Note: this route intentionally does NOT use requireWorkspace middleware
        // because the user is not a member yet.

        const invite = await prisma.workspaceInvite.findUnique({
            where: { token },
            include: { workspace: true }
        })

        if (!invite) return res.status(404).json({ status: 'error', message: 'Invalid invite' })
        if (invite.acceptedAt) return res.status(400).json({ status: 'error', message: 'Already accepted' })
        if (new Date() > invite.expiresAt) return res.status(400).json({ status: 'error', message: 'Invite expired' })

        if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
            return res.status(403).json({ status: 'error', message: 'Please log in with the invited email address' })
        }

        const workspaceData = await prisma.$transaction(async (tx) => {
            // Check if somehow already a member
            const existing = await tx.workspaceMember.findUnique({
                where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } }
            })

            if (!existing) {
                await tx.workspaceMember.create({
                    data: {
                        workspaceId: invite.workspaceId,
                        userId,
                        role: invite.role,
                        invitedById: invite.invitedById
                    }
                })
            }

            // Mark invite accepted
            await tx.workspaceInvite.update({
                where: { id: invite.id },
                data: { acceptedAt: new Date() }
            })

            // Set as active workspace
            await tx.user.update({
                where: { id: userId },
                data: { activeWorkspaceId: invite.workspaceId }
            })

            return invite.workspace
        })

        res.json({ status: 'success', data: workspaceData })
    } catch (error) {
        console.error('Accept invite error:', error)
        res.status(500).json({ status: 'error', message: 'Failed to accept invite' })
    }
}

const searchWorkspace = async (req, res) => {
    try {
        const { q } = req.query
        if (!q || q.trim().length < 2) {
            return res.json({ status: 'success', data: { projects: [], tasks: [], users: [] } })
        }

        const workspaceId = req.workspace.id
        const search = q.trim()

        const [projects, tasks, members] = await Promise.all([
            prisma.project.findMany({
                where: {
                    workspaceId,
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } }
                    ]
                },
                select: { id: true, name: true, description: true, color: true },
                take: 5
            }),
            prisma.task.findMany({
                where: {
                    project: { workspaceId },
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } }
                    ]
                },
                select: { id: true, title: true, projectId: true, status: true, priority: true },
                take: 5
            }),
            prisma.workspaceMember.findMany({
                where: {
                    workspaceId,
                    user: {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { email: { contains: search, mode: 'insensitive' } }
                        ]
                    }
                },
                include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
                take: 5
            })
        ])

        return res.json({
            status: 'success',
            data: {
                projects,
                tasks,
                users: members.map(m => m.user)
            }
        })
    } catch (error) {
        console.error('Search error:', error)
        res.status(500).json({ status: 'error', message: 'Search failed' })
    }
}

export {
    createWorkspace,
    getMyWorkspaces,
    getWorkspaceDetails,
    updateWorkspace,
    deleteWorkspace,
    setActiveWorkspace,
    checkSlugAvailability,
    getMembers,
    updateMemberRole,
    removeMember,
    getPendingInvites,
    inviteMember,
    deleteInvite,
    getInviteDetails,
    acceptInvite,
    searchWorkspace
}
