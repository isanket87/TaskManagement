import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../src/index.js'
import prisma from '../src/utils/prisma.js'

// Mock Prisma
vi.mock('../src/utils/prisma.js', () => ({
    default: {
        task: {
            create: vi.fn(),
            update: vi.fn(),
            findUnique: vi.fn(),
            count: vi.fn(),
            aggregate: vi.fn(),
        },
        activityLog: {
            create: vi.fn(),
        },
        project: {
            findUnique: vi.fn(),
        },
        user: {
            findUnique: vi.fn(),
        },
        workspaceMember: {
            findUnique: vi.fn(),
        }
    }
}))

// Mock auth middleware
vi.mock('../src/middleware/auth.js', () => ({
    default: (req, res, next) => {
        req.user = { id: 'test-user-id', name: 'Test User' };
        next();
    }
}))

// Mock workspace middleware
vi.mock('../src/middleware/workspace.js', () => ({
    requireWorkspace: (req, res, next) => {
        req.workspace = { id: 'test-ws-id', slug: 'test-ws' };
        req.workspaceRole = 'admin';
        next();
    },
    requireWorkspaceAdmin: (req, res, next) => next(),
    requireWorkspaceOwner: (req, res, next) => next(),
}))

describe('Task API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should create a task with recurrence', async () => {
        const mockTask = {
            id: 'task-1',
            title: 'Recurring Task',
            isRecurring: true,
            recurrenceRule: 'daily',
            projectId: 'project-1'
        };

        prisma.task.aggregate.mockResolvedValue({ _max: { position: 0 } });
        prisma.task.create.mockResolvedValue(mockTask);

        const res = await request(app)
            .post('/api/workspaces/test-ws/projects/project-1/tasks')
            .send({
                title: 'Recurring Task',
                isRecurring: true,
                recurrenceRule: 'daily'
            });

        expect(res.status).toBe(201);
        expect(res.body.data.task.title).toBe('Recurring Task');
        expect(prisma.task.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                isRecurring: true,
                recurrenceRule: 'daily'
            })
        }));
    });

    it('should log activity when updating task description', async () => {
        const existingTask = {
            id: 'task-1',
            title: 'Task 1',
            description: 'Old description',
            projectId: 'project-1',
            assignee: { name: 'Test User' }
        };

        prisma.task.findUnique.mockResolvedValue(existingTask);
        prisma.task.update.mockResolvedValue({ ...existingTask, description: 'New description' });

        const res = await request(app)
            .put('/api/workspaces/test-ws/projects/project-1/tasks/task-1')
            .send({
                description: 'New description'
            });

        expect(res.status).toBe(200);
        // Verify activity log was called with truncated snippets
        expect(prisma.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                message: expect.stringContaining('Updated description from "Old description" to "New description"')
            })
        }));
    });

    it('should update priority via task card shortcut', async () => {
        const existingTask = { id: 'task-1', priority: 'medium', projectId: 'project-1' };
        prisma.task.findUnique.mockResolvedValue(existingTask);
        prisma.task.update.mockResolvedValue({ ...existingTask, priority: 'high' });

        const res = await request(app)
            .put('/api/workspaces/test-ws/projects/project-1/tasks/task-1')
            .send({ priority: 'high' });

        expect(res.status).toBe(200);
        expect(prisma.task.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ priority: 'high' })
        }));
    });
});
