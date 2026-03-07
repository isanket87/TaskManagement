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

// Load .env from mcp-server directory
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '.env') })

const API_URL = process.env.BRIORIGHT_API_URL || 'http://localhost:3001/api'
const API_KEY = process.env.BRIORIGHT_API_KEY
const DEFAULT_WORKSPACE = process.env.BRIORIGHT_WORKSPACE_ID
const MCP_PORT = parseInt(process.env.MCP_PORT || '4040')
const MCP_SECRET = process.env.MCP_SECRET // Optional bearer token for HTTP mode
const USE_HTTP = process.env.MCP_TRANSPORT === 'http'

if (!API_KEY) {
    process.stderr.write('[Brioright MCP] ERROR: BRIORIGHT_API_KEY is not set.\n')
    process.exit(1)
}

// ── Axios client ──────────────────────────────────────────────────────────────
const api = axios.create({
    baseURL: API_URL,
    headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
    timeout: 10000,
})

async function call(method, path, data) {
    try {
        const res = await api({ method, url: path, data })
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
    server.tool('list_workspaces', 'List all Brioright workspaces the API key has access to', {},
        async () => {
            const data = await call('GET', '/workspaces')
            const workspaces = data.workspaces || data
            return { content: [{ type: 'text', text: JSON.stringify(workspaces.map(w => ({ id: w.id, slug: w.slug, name: w.name })), null, 2) }] }
        }
    )

    // ── list_projects ─────────────────────────────────────────────────────────
    server.tool('list_projects', 'List all projects in a workspace',
        { workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.') },
        async ({ workspaceId }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/projects`)
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
        },
        async ({ projectId, workspaceId, status, priority, limit }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const params = new URLSearchParams()
            if (status) params.set('status', status)
            if (priority) params.set('priority', priority)
            params.set('limit', String(limit || 20))
            const data = await call('GET', `/workspaces/${ws}/projects/${projectId}/tasks?${params}`)
            const tasks = data.tasks || data
            return { content: [{ type: 'text', text: JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate, assignee: t.assignee?.name })), null, 2) }] }
        }
    )

    // ── get_task ──────────────────────────────────────────────────────────────
    server.tool('get_task', 'Get full details of a single task',
        { taskId: z.string(), workspaceId: z.string().optional() },
        async ({ taskId, workspaceId }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/tasks/${taskId}`)
            return { content: [{ type: 'text', text: JSON.stringify(data.task || data, null, 2) }] }
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
        },
        async ({ projectId, title, description, status, priority, dueDate, assigneeId, workspaceId }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('POST', `/workspaces/${ws}/projects/${projectId}/tasks`, {
                title, description, status, priority,
                dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
                assigneeId,
            })
            const task = data.task || data
            return { content: [{ type: 'text', text: `✅ Task created!\n\n${JSON.stringify({ id: task.id, title: task.title, status: task.status, priority: task.priority, dueDate: task.dueDate }, null, 2)}` }] }
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
        },
        async ({ taskId, workspaceId, ...fields }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const updates = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined))
            if (updates.dueDate) updates.dueDate = new Date(updates.dueDate).toISOString()
            const data = await call('PATCH', `/workspaces/${ws}/tasks/${taskId}`, updates)
            const task = data.task || data
            return { content: [{ type: 'text', text: `✅ Task updated!\n\n${JSON.stringify({ id: task.id, title: task.title, status: task.status, priority: task.priority }, null, 2)}` }] }
        }
    )

    // ── complete_task ─────────────────────────────────────────────────────────
    server.tool('complete_task', 'Mark a task as completed',
        { taskId: z.string(), workspaceId: z.string().optional() },
        async ({ taskId, workspaceId }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            await call('PATCH', `/workspaces/${ws}/tasks/${taskId}`, { status: 'done' })
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
        },
        async ({ name, description, color, workspaceId }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('POST', `/workspaces/${ws}/projects`, { name, description, color })
            const project = data.project || data
            return { content: [{ type: 'text', text: `✅ Project created!\n\n${JSON.stringify({ id: project.id, name: project.name }, null, 2)}` }] }
        }
    )

    // ── list_members ──────────────────────────────────────────────────────────
    server.tool('list_members', 'List workspace members (useful for finding assignee IDs)',
        { workspaceId: z.string().optional() },
        async ({ workspaceId }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/members`)
            const members = data.members || data
            return { content: [{ type: 'text', text: JSON.stringify(members.map(m => ({ id: m.user?.id || m.id, name: m.user?.name || m.name, email: m.user?.email || m.email, role: m.role })), null, 2) }] }
        }
    )

    // ── get_workspace_summary ─────────────────────────────────────────────────
    server.tool('get_workspace_summary', 'Dashboard stats: task counts by status and priority',
        { workspaceId: z.string().optional() },
        async ({ workspaceId }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/dashboard/stats`)
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
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
