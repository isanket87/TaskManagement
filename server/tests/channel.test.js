import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../src/index.js'
import prisma from '../src/utils/prisma.js'

vi.mock('../src/utils/prisma.js', () => ({
    default: {
        channelMember: {
            findUnique: vi.fn(),
            create: vi.fn(),
            delete: vi.fn(),
            update: vi.fn(),
        },
        channel: {
            findFirst: vi.fn(),
            create: vi.fn(),
        },
        message: {
            count: vi.fn(),
        }
    }
}))

// Mock auth and workspace middlewares
vi.mock('../src/middleware/auth.js', () => ({
    default: (req, res, next) => {
        req.user = { id: 'user-1', name: 'User One' };
        next();
    }
}))

vi.mock('../src/middleware/workspace.js', () => ({
    requireWorkspace: (req, res, next) => {
        req.workspace = { id: 'ws-1', slug: 'ws' };
        next();
    },
    requireWorkspaceAdmin: (req, res, next) => next(),
    requireWorkspaceOwner: (req, res, next) => next(),
}))

describe('Channel API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should add a member to a channel', async () => {
        prisma.channelMember.findUnique.mockResolvedValue(null); // Not already a member
        prisma.channelMember.create.mockResolvedValue({ channelId: 'ch-1', userId: 'user-2' });

        const res = await request(app)
            .post('/api/workspaces/test-ws/channels/ch-1/members')
            .send({ userId: 'user-2' });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Member added');
        expect(prisma.channelMember.create).toHaveBeenCalled();
    });

    it('should fail to add a member if already exists', async () => {
        prisma.channelMember.findUnique.mockResolvedValue({ id: 'exists' });

        const res = await request(app)
            .post('/api/workspaces/test-ws/channels/ch-1/members')
            .send({ userId: 'user-2' });

        expect(res.status).toBe(409);
        expect(res.body.message).toBe('Already a member');
    });

    it('should allow admin to remove a member', async () => {
        // Mock 'me' as admin
        prisma.channelMember.findUnique.mockResolvedValueOnce({ userId: 'user-1', role: 'admin' });
        prisma.channelMember.delete.mockResolvedValue({});

        const res = await request(app)
            .delete('/api/workspaces/test-ws/channels/ch-1/members/user-2');

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Member removed');
    });

    it('should allow a member to remove themselves (leave channel)', async () => {
        // Mock 'me' as regular member
        prisma.channelMember.findUnique.mockResolvedValueOnce({ userId: 'user-1', role: 'member' });
        prisma.channelMember.delete.mockResolvedValue({});

        const res = await request(app)
            .delete('/api/workspaces/test-ws/channels/ch-1/members/user-1'); // Removing self

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Member removed');
    });

    it('should fail if non-admin tries to remove another member', async () => {
        // Mock 'me' as regular member
        prisma.channelMember.findUnique.mockResolvedValueOnce({ userId: 'user-1', role: 'member' });

        const res = await request(app)
            .delete('/api/workspaces/test-ws/channels/ch-1/members/user-2'); // Removing someone else

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Not allowed');
    });
});
