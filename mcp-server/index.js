#!/usr/bin/env node
/**
 * Brioright MCP Server
 *
 * Supports two transport modes:
 *   1. stdio  (default) — for local clients: Claude Desktop, Cursor
 *   2. http   (MCP_TRANSPORT=http) — for cloud AI: Antigravity, remote clients
 *
 * Usage:
 *   node index.js                  # stdio mode
 *   MCP_TRANSPORT=http node index.js  # HTTP/SSE mode (port from MCP_PORT, default 4040)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { z } from 'zod'
import axios from 'axios'
import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Handle setup flow `npx brioright-mcp connect`
if (process.argv[2] === 'connect') {
    const { runSetup } = await import('./setup.js')
    await runSetup()
    process.exit(0)
}

// Load .env from mcp-server directory
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '.env') })

const API_URL = process.env.BRIORIGHT_API_URL || 'http://localhost:3001/api'
const ENV_API_KEY = process.env.BRIORIGHT_API_KEY
const DEFAULT_WORKSPACE = process.env.BRIORIGHT_WORKSPACE_ID
const MCP_PORT = parseInt(process.env.MCP_PORT || '4040')
const MCP_SECRET = process.env.MCP_SECRET // Optional bearer token for HTTP mode
const USE_HTTP = process.env.MCP_TRANSPORT === 'http'

// ── Axios client factory ──────────────────────────────────────────────────────
async function call(method, path, data, overrideApiKey, customHeaders = {}) {
    const key = overrideApiKey || ENV_API_KEY;
    if (!key) {
        throw new Error('Brioright API error: No API Key provided. Either set BRIORIGHT_API_KEY environment variable or provide apiKey in the tool arguments.');
    }

    const headers = { 'X-API-Key': key, 'Content-Type': 'application/json', ...customHeaders }
    if (headers['Content-Type'] === 'multipart/form-data' || headers['Content-Type'] === null) {
        delete headers['Content-Type']; // Let axios auto-generate the multipart boundary
    }

    const api = axios.create({
        baseURL: API_URL,
        headers,
        timeout: 30000,
    })

    try {
        const reqConfig = { method, url: path };
        if (data !== null && data !== undefined) {
            reqConfig.data = data;
        }
        const res = await api(reqConfig);
        return res.data.data
    } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Unknown error'
        throw new Error(`Brioright API error: ${msg}`)
    }
}

// ── Build MCP Server (shared between both transports) ────────────────────────
function buildServer() {
    const server = new McpServer({ name: 'brioright', version: '1.0.0' })

    // ── list_workspaces ───────────────────────────────────────────────────────
    server.tool('list_workspaces', 'List all Brioright workspaces the API key has access to',
        { apiKey: z.string().optional().describe('Brioright API Key') },
        async ({ apiKey }) => {
            const data = await call('GET', '/workspaces', null, apiKey)
            const workspaces = data.workspaces || data
            return { content: [{ type: 'text', text: JSON.stringify(workspaces.map(w => ({ id: w.id, slug: w.slug, name: w.name })), null, 2) }] }
        }
    )

    // ── list_projects ─────────────────────────────────────────────────────────
    server.tool('list_projects', 'List all projects in a workspace',
        {
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API Key')
        },
        async ({ workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/projects`, null, apiKey)
            const projects = data.projects || data
            return { content: [{ type: 'text', text: JSON.stringify(projects.map(p => ({ id: p.id, name: p.name, status: p.status })), null, 2) }] }
        }
    )

    // ── list_tasks ────────────────────────────────────────────────────────────
    server.tool('list_tasks', 'List tasks in a project with optional filters',
        {
            projectId: z.string().describe('Project ID'),
            workspaceId: z.string().optional(),
            status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled']).optional(),
            priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
            limit: z.number().optional().default(20),
            apiKey: z.string().optional().describe('Brioright API Key')
        },
        async ({ projectId, workspaceId, status, priority, limit, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const params = new URLSearchParams()
            if (status) params.set('status', status)
            if (priority) params.set('priority', priority)
            params.set('limit', String(limit || 20))
            const data = await call('GET', `/workspaces/${ws}/projects/${projectId}/tasks?${params}`, null, apiKey)
            const tasks = data.tasks || data
            return { content: [{ type: 'text', text: JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate, assignee: t.assignee?.name })), null, 2) }] }
        }
    )

    // ── get_task ──────────────────────────────────────────────────────────────
    server.tool('get_task', 'Get full details of a single task',
        { taskId: z.string(), workspaceId: z.string().optional(), apiKey: z.string().optional().describe('Brioright API Key') },
        async ({ taskId, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/tasks/${taskId}`, null, apiKey)
            return { content: [{ type: 'text', text: JSON.stringify(data.task || data, null, 2) }] }
        }
    )

    // ── get_task_attachments ──────────────────────────────────────────────────
    server.tool('get_task_attachments', 'List all file attachments for a specific task',
        {
            taskId: z.string(),
            workspaceId: z.string().optional(),
            apiKey: z.string().optional().describe('Brioright API Key')
        },
        async ({ taskId, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/tasks/${taskId}/attachments`, null, apiKey)
            const attachments = data.attachments || data
            return { content: [{ type: 'text', text: JSON.stringify(attachments, null, 2) }] }
        }
    )

    // ── add_task_attachment ───────────────────────────────────────────────────
    server.tool('add_task_attachment', 'Upload a file attachment to a task using a Base64 encoded string',
        {
            taskId: z.string(),
            fileName: z.string().describe('Name of the file to attach (e.g. image.png)'),
            fileContent: z.string().describe('Base64 encoded string of the file content'),
            mimeType: z.string().optional().describe('MIME type of the file (e.g. image/png)'),
            workspaceId: z.string().optional(),
            apiKey: z.string().optional().describe('Brioright API Key')
        },
        async ({ taskId, fileName, fileContent, mimeType, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            
            // Convert base64 to Blob
            const buffer = Buffer.from(fileContent, 'base64')
            const blob = new Blob([buffer], { type: mimeType || 'application/octet-stream' })
            
            const formData = new FormData()
            formData.append('file', blob, fileName)

            const data = await call('POST', `/workspaces/${ws}/tasks/${taskId}/attachments`, formData, apiKey, { 'Content-Type': 'multipart/form-data' })
            const attachment = data.attachment || data
            return { content: [{ type: 'text', text: `✅ File attached successfully!\n\n${JSON.stringify({ id: attachment.id, name: attachment.name, url: attachment.url }, null, 2)}` }] }
        }
    )

    // ── create_task ───────────────────────────────────────────────────────────
    server.tool('create_task', 'Create a new task in a Brioright project',
        {
            projectId: z.string().describe('Project ID'),
            title: z.string().describe('Task title'),
            description: z.string().optional(),
            status: z.enum(['todo', 'in_progress', 'in_review', 'done']).optional().default('todo'),
            priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
            dueDate: z.string().optional().describe('ISO date string e.g. 2026-03-15'),
            assigneeId: z.string().optional(),
            workspaceId: z.string().optional(),
            apiKey: z.string().optional().describe('Brioright API Key')
        },
        async ({ projectId, title, description, status, priority, dueDate, assigneeId, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('POST', `/workspaces/${ws}/projects/${projectId}/tasks`, {
                title, description, status, priority,
                dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
                assigneeId: assigneeId || undefined,
            }, apiKey)
            const task = data.task || data
            return { content: [{ type: 'text', text: `✅ Task created!\n\n${JSON.stringify({ id: task.id, title: task.title, status: task.status, priority: task.priority, dueDate: task.dueDate }, null, 2)}` }] }
        }
    )

    // ── duplicate_task ────────────────────────────────────────────────────────
    server.tool('duplicate_task', 'Duplicate an existing task',
        {
            taskId: z.string().describe('The ID of the task to duplicate'),
            workspaceId: z.string().optional(),
            apiKey: z.string().optional().describe('Brioright API Key')
        },
        async ({ taskId, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')

            // We need to fetch the task first to find its projectId, as the /duplicate endpoint requires project ID via the URL path
            const taskData = await call('GET', `/workspaces/${ws}/tasks/${taskId}`, null, apiKey)
            const originalTask = taskData.task || taskData

            const data = await call('POST', `/workspaces/${ws}/projects/${originalTask.projectId}/tasks/${taskId}/duplicate`, null, apiKey)
            const clonedTask = data.task || data
            return { content: [{ type: 'text', text: `✅ Task duplicated!\n\n${JSON.stringify({ id: clonedTask.id, title: clonedTask.title, status: clonedTask.status, position: clonedTask.position }, null, 2)}` }] }
        }
    )

    // ── bulk_create_tasks ─────────────────────────────────────────────────────
    server.tool('bulk_create_tasks', 'Create multiple tasks at once in a Brioright project',
        {
            projectId: z.string().describe('Project ID'),
            tasks: z.array(z.object({
                title: z.string().describe('Task title'),
                description: z.string().optional(),
                status: z.enum(['todo', 'in_progress', 'in_review', 'done']).optional().default('todo'),
                priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
                dueDate: z.string().optional().describe('ISO date string e.g. 2026-03-15'),
                assigneeId: z.string().optional(),
                parentTaskId: z.string().optional(),
                tags: z.array(z.string()).optional()
            })).describe('Array of tasks to create'),
            workspaceId: z.string().optional(),
            apiKey: z.string().optional().describe('Brioright API Key')
        },
        async ({ projectId, tasks, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            
            // Format dates and sanitise strings
            const formattedTasks = tasks.map(t => ({
                ...t,
                dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : undefined,
                assigneeId: t.assigneeId || undefined,
                parentTaskId: t.parentTaskId || undefined
            }))
            
            const data = await call('POST', `/workspaces/${ws}/projects/${projectId}/tasks/bulk`, {
                tasks: formattedTasks
            }, apiKey)
            
            return { content: [{ type: 'text', text: `✅ Successfully created ${data.count} tasks!` }] }
        }
    )

    // ── update_task ───────────────────────────────────────────────────────────
    server.tool('update_task', 'Update fields on an existing task',
        {
            taskId: z.string(),
            title: z.string().optional(),
            description: z.string().optional(),
            status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled']).optional(),
            priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
            dueDate: z.string().optional(),
            assigneeId: z.string().optional(),
            workspaceId: z.string().optional(),
            apiKey: z.string().optional().describe('Brioright API Key')
        },
        async ({ taskId, workspaceId, apiKey, ...fields }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const updates = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined && v !== ''))
            if (updates.dueDate) updates.dueDate = new Date(updates.dueDate).toISOString()
            const data = await call('PATCH', `/workspaces/${ws}/tasks/${taskId}`, updates, apiKey)
            const task = data.task || data
            return { content: [{ type: 'text', text: `✅ Task updated!\n\n${JSON.stringify({ id: task.id, title: task.title, status: task.status, priority: task.priority, description: task.description, dueDate: task.dueDate }, null, 2)}` }] }
        }
    )

    // ── complete_task ─────────────────────────────────────────────────────────
    server.tool('complete_task', 'Mark a task as completed',
        { taskId: z.string(), workspaceId: z.string().optional(), apiKey: z.string().optional().describe('Brioright API Key') },
        async ({ taskId, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            await call('PATCH', `/workspaces/${ws}/tasks/${taskId}`, { status: 'done' }, apiKey)
            return { content: [{ type: 'text', text: `✅ Task ${taskId} marked as done.` }] }
        }
    )

    // ── create_project ────────────────────────────────────────────────────────
    server.tool('create_project', 'Create a new project in a workspace',
        {
            name: z.string(),
            description: z.string().optional(),
            color: z.string().optional().default('#6366f1'),
            workspaceId: z.string().optional(),
            apiKey: z.string().optional().describe('Brioright API Key')
        },
        async ({ name, description, color, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('POST', `/workspaces/${ws}/projects`, { name, description, color }, apiKey)
            const project = data.project || data
            return { content: [{ type: 'text', text: `✅ Project created!\n\n${JSON.stringify({ id: project.id, name: project.name }, null, 2)}` }] }
        }
    )

    // ── list_members ──────────────────────────────────────────────────────────
    server.tool('list_members', 'List workspace members (useful for finding assignee IDs)',
        { workspaceId: z.string().optional(), apiKey: z.string().optional().describe('Brioright API Key') },
        async ({ workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/members`, null, apiKey)
            const members = data.members || data
            return { content: [{ type: 'text', text: JSON.stringify(members.map(m => ({ id: m.user?.id || m.id, name: m.user?.name || m.name, email: m.user?.email || m.email, role: m.role })), null, 2) }] }
        }
    )

    // ── get_workspace_summary ─────────────────────────────────────────────────
    server.tool('get_workspace_summary', 'Dashboard stats: task counts by status and priority',
        { workspaceId: z.string().optional(), apiKey: z.string().optional().describe('Brioright API Key') },
        async ({ workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/dashboard/stats`, null, apiKey)
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
        }
    )

    // ── add_comment ───────────────────────────────────────────────────────────
    server.tool('add_comment', 'Add a comment to a task',
        {
            taskId: z.string(),
            text: z.string().describe('The content of the comment'),
            workspaceId: z.string().optional(),
            apiKey: z.string().optional().describe('Brioright API Key')
        },
        async ({ taskId, text, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('POST', `/workspaces/${ws}/tasks/${taskId}/comments`, { text }, apiKey)
            const comment = data.comment || data
            return { content: [{ type: 'text', text: `✅ Comment added!\n\n${JSON.stringify(comment, null, 2)}` }] }
        }
    )

    // ── get_task_comments ─────────────────────────────────────────────────────
    server.tool('get_task_comments', 'Get all comments for a given task',
        {
            taskId: z.string(),
            workspaceId: z.string().optional(),
            apiKey: z.string().optional().describe('Brioright API Key')
        },
        async ({ taskId, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/tasks/${taskId}/comments`, null, apiKey)
            const comments = data.comments || data
            return { content: [{ type: 'text', text: JSON.stringify(comments.map(c => ({ id: c.id, text: c.text, author: c.author?.name, createdAt: c.createdAt })), null, 2) }] }
        }
    )

    // ── log_time ──────────────────────────────────────────────────────────────
    server.tool('log_time', 'Log time entry for a project/task',
        {
            projectId: z.string(),
            taskId: z.string().optional(),
            description: z.string().optional(),
            startTime: z.string().optional().describe('ISO date string for start time. Defaults to now.'),
            endTime: z.string().optional().describe('ISO date string for end time. If omitted, starts a running timer.'),
            workspaceId: z.string().optional(),
            apiKey: z.string().optional().describe('Brioright API Key')
        },
        async ({ projectId, taskId, description, startTime, endTime, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const start = startTime ? new Date(startTime).toISOString() : new Date().toISOString()
            const end = endTime ? new Date(endTime).toISOString() : undefined
            
            const payload = { projectId, description, startTime: start, endTime: end }
            if (taskId) payload.taskId = taskId
            
            const data = await call('POST', `/workspaces/${ws}/time-entries`, payload, apiKey)
            const entry = data.entry || data
            return { content: [{ type: 'text', text: `✅ Time logged (Duration: ${entry.duration ? entry.duration + ' seconds' : 'Running timer ...'})!\n\n${JSON.stringify({ id: entry.id, description: entry.description, startTime: entry.startTime, endTime: entry.endTime, duration: entry.duration }, null, 2)}` }] }
        }
    )

    return server
}

// ── HTTP/SSE transport (for cloud AI clients) ─────────────────────────────────
if (USE_HTTP) {
    const app = express()
    app.use(express.json())
    app.use(cors({
        origin: '*', // Cloud AI clients can come from any origin
        exposedHeaders: ['Content-Type', 'Cache-Control', 'X-Accel-Buffering'],
    }))

    // Optional bearer token auth for the HTTP endpoint
    app.use((req, res, next) => {
        if (MCP_SECRET) {
            const authHeader = req.headers.authorization || ''
            const token = authHeader.replace('Bearer ', '')
            if (token !== MCP_SECRET) {
                return res.status(401).json({ error: 'Unauthorized — invalid MCP_SECRET' })
            }
        }
        next()
    })

    // Track active SSE transports by session
    const transports = new Map()

    // SSE endpoint — client connects here first to get a session
    app.get('/sse', async (req, res) => {
        process.stderr.write(`[Brioright MCP] New SSE connection from ${req.ip}\n`)
        const transport = new SSEServerTransport('/messages', res)
        transports.set(transport.sessionId, transport)

        // Clean up on disconnect
        res.on('close', () => {
            process.stderr.write(`[Brioright MCP] SSE session ${transport.sessionId} closed\n`)
            transports.delete(transport.sessionId)
        })

        const server = buildServer()
        await server.connect(transport)
    })

    // Messages endpoint — tool call requests come here
    app.post('/messages', async (req, res) => {
        const sessionId = req.query.sessionId
        const transport = transports.get(sessionId)
        if (!transport) {
            return res.status(404).json({ error: `Session ${sessionId} not found` })
        }
        await transport.handlePostMessage(req, res)
    })

    // Health check
    app.get('/health', (req, res) => res.json({ status: 'ok', server: 'brioright-mcp', transport: 'http/sse' }))

    app.listen(MCP_PORT, () => {
        process.stderr.write(`[Brioright MCP] HTTP/SSE server running on port ${MCP_PORT}\n`)
        process.stderr.write(`[Brioright MCP] SSE endpoint: http://0.0.0.0:${MCP_PORT}/sse\n`)
        process.stderr.write(`[Brioright MCP] Messages endpoint: http://0.0.0.0:${MCP_PORT}/messages\n`)
    })

    // ── Stdio transport (for local clients: Claude Desktop, Cursor) ───────────────
} else {
    const server = buildServer()
    const transport = new StdioServerTransport()
    await server.connect(transport)
    process.stderr.write('[Brioright MCP] Stdio server running. Listening for MCP requests...\n')
}
