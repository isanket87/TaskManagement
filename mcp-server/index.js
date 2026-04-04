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
    server.tool('list_workspaces',
        'Returns all Brioright workspaces accessible via the API key. Call this FIRST when the user has not provided a workspaceId, or when they ask "what workspaces do I have?". The response includes each workspace id, slug, and name — use the slug as workspaceId in subsequent tool calls.',
        { apiKey: z.string().optional().describe('Brioright API key. Only needed if not set in environment.') },
        async ({ apiKey }) => {
            const data = await call('GET', '/workspaces', null, apiKey)
            const workspaces = data.workspaces || data
            return { content: [{ type: 'text', text: JSON.stringify(workspaces.map(w => ({ id: w.id, slug: w.slug, name: w.name })), null, 2) }] }
        }
    )

    // ── list_projects ─────────────────────────────────────────────────────────
    server.tool('list_projects',
        'Returns all projects inside a workspace. Use this to discover project IDs before calling list_tasks, create_task, or bulk_create_tasks. Call this when the user mentions a project by name but you need its ID. Returns each project id, name, and status.',
        {
            workspaceId: z.string().optional().describe('Workspace slug (e.g. "my-team"). Use list_workspaces first if unknown. Defaults to BRIORIGHT_WORKSPACE_ID env var.'),
            apiKey: z.string().optional().describe('Brioright API key. Only needed if not set in environment.')
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
    server.tool('list_tasks',
        'Fetch tasks from a project with optional filters. Use this when the user asks to see tasks, check what is in progress, find tasks by status/priority, or before updating/completing tasks. Filter by status (todo, in_progress, in_review, done, cancelled) or priority (low, medium, high, urgent). Returns task id, title, status, priority, dueDate, and assignee name.',
        {
            projectId: z.string().describe('Project ID — use list_projects first if you only know the project name.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled']).optional().describe('Filter by task status. Omit to return all statuses.'),
            priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('Filter by priority level. Omit to return all priorities.'),
            limit: z.number().optional().default(20).describe('Max number of tasks to return. Default 20, max recommended 100.'),
            apiKey: z.string().optional().describe('Brioright API key. Only needed if not set in environment.')
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
    server.tool('get_task',
        'Fetches complete details for a single task by its ID, including description, status, priority, assignee, due date, tags, subtasks, and dependencies. Use this when you need the full task data before updating it, summarising it, or answering detailed questions about it. Prefer this over list_tasks when you already have the task ID.',
        { taskId: z.string().describe('The unique task ID (UUID). Use list_tasks to find it if unknown.'), workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'), apiKey: z.string().optional().describe('Brioright API key.') },
        async ({ taskId, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/tasks/${taskId}`, null, apiKey)
            return { content: [{ type: 'text', text: JSON.stringify(data.task || data, null, 2) }] }
        }
    )

    // ── get_task_attachments ──────────────────────────────────────────────────
    server.tool('get_task_attachments',
        'Lists all files attached to a task. Use this when the user asks "what files are on this task?" or before deciding to add a new attachment. Returns file name, URL, size, and uploader.',
        {
            taskId: z.string().describe('ID of the task to list attachments for.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
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
    server.tool('add_task_attachment',
        'Uploads a file to a task as an attachment. Use this when the user wants to attach a document, screenshot, or report to a task. The file must be Base64-encoded. Returns the attachment id, file name, and public URL.',
        {
            taskId: z.string().describe('ID of the task to attach the file to.'),
            fileName: z.string().describe('File name with extension, e.g. "report.pdf" or "screenshot.png".'),
            fileContent: z.string().describe('Full Base64-encoded content of the file.'),
            mimeType: z.string().optional().describe('MIME type, e.g. "image/png", "application/pdf". Defaults to application/octet-stream.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
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
    server.tool('create_task',
        'Creates a single new task in a project. Use this when the user asks to add one task. For creating multiple tasks at once, prefer bulk_create_tasks instead. Use list_projects to get projectId and list_members to get assigneeId if needed. Returns the created task id, title, status, priority, and due date.',
        {
            projectId: z.string().describe('Project ID — use list_projects if you only know the project name.'),
            title: z.string().describe('Clear, concise task title describing the work to be done.'),
            description: z.string().optional().describe('Detailed description, acceptance criteria, or context for the task. Supports markdown.'),
            status: z.enum(['todo', 'in_progress', 'in_review', 'done']).optional().default('todo').describe('Initial task status. Default is todo.'),
            priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium').describe('Task priority. Use urgent only for blockers or critical issues.'),
            dueDate: z.string().optional().describe('Due date as ISO string, e.g. "2026-04-01". Omit if no deadline.'),
            assigneeId: z.string().optional().describe('User ID of the assignee — use list_members to find IDs. Omit to leave unassigned.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
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
    server.tool('duplicate_task',
        'Creates an exact copy of an existing task, including its title, description, priority, and assignee. Use this when the user wants to repeat a task, clone a template task, or create a similar task quickly. The duplicate is placed in the same project. Returns the new task id and title.',
        {
            taskId: z.string().describe('ID of the original task to copy.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
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
    server.tool('bulk_create_tasks',
        'Creates multiple tasks in one API call — far more efficient than calling create_task repeatedly. Use this when the user provides a list of tasks, a sprint plan, a feature breakdown, or asks you to set up a project. Each task can have its own title, description, status, priority, due date, and assignee. Use parentTaskId to create subtasks under an existing task. Returns the count of created tasks.',
        {
            projectId: z.string().describe('Project ID — use list_projects first if unknown.'),
            tasks: z.array(z.object({
                title: z.string().describe('Clear task title.'),
                description: z.string().optional().describe('Detailed context or acceptance criteria for the task.'),
                status: z.enum(['todo', 'in_progress', 'in_review', 'done']).optional().default('todo').describe('Task status. Default: todo.'),
                priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium').describe('Priority level.'),
                dueDate: z.string().optional().describe('ISO date string e.g. "2026-04-01". Omit if no deadline.'),
                assigneeId: z.string().optional().describe('User ID from list_members. Omit to leave unassigned.'),
                parentTaskId: z.string().optional().describe('ID of a parent task to nest this as a subtask. Omit for top-level tasks.'),
                tags: z.array(z.string()).optional().describe('Label tags for categorisation, e.g. ["backend", "auth"].')
            })).describe('Array of task objects to create. Minimum 1, no hard maximum.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
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
    server.tool('update_task',
        'Updates one or more fields on an existing task. Use this when the user asks to change a task title, reassign it, change priority or status, update the description, or set/change a due date. Only provide the fields you want to change — omit the rest. To mark a task done, you can either use this tool with status=done or use complete_task. Returns the updated task.',
        {
            taskId: z.string().describe('ID of the task to update — use list_tasks or get_task to find it.'),
            title: z.string().optional().describe('New task title. Omit to keep current.'),
            description: z.string().optional().describe('New description. Omit to keep current. Supports markdown.'),
            status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled']).optional().describe('New status. Use cancelled for tasks that will not be done.'),
            priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('New priority level.'),
            dueDate: z.string().optional().describe('New due date as ISO string e.g. "2026-04-15". Omit to keep current.'),
            assigneeId: z.string().optional().describe('User ID of new assignee — use list_members to find. Omit to keep current.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
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
    server.tool('complete_task',
        'Marks a task as done (status=done). Use this as a shorthand when the user says "complete", "finish", "mark as done", or "close" a task. Equivalent to update_task with status=done but more concise. Returns a confirmation.',
        { taskId: z.string().describe('ID of the task to complete.'), workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'), apiKey: z.string().optional().describe('Brioright API key.') },
        async ({ taskId, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            await call('PATCH', `/workspaces/${ws}/tasks/${taskId}`, { status: 'done' }, apiKey)
            return { content: [{ type: 'text', text: `✅ Task ${taskId} marked as done.` }] }
        }
    )

    // ── create_project ────────────────────────────────────────────────────────
    server.tool('create_project',
        'Creates a new project (board) inside a workspace. Use this when the user asks to set up a new project, initiative, or area of work. After creating the project, you can immediately use bulk_create_tasks to populate it with tasks. Returns the new project id and name.',
        {
            name: z.string().describe('Project name, e.g. "Q2 Marketing Campaign" or "Mobile App Redesign".'),
            description: z.string().optional().describe('Brief summary of the project goals or scope.'),
            color: z.string().optional().default('#6366f1').describe('Hex color for visual identification, e.g. "#f59e0b". Default is indigo (#6366f1).'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
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
    server.tool('list_members',
        'Returns all members of a workspace with their user IDs, names, emails, and roles. Call this BEFORE create_task or update_task when the user mentions assigning a task to someone by name — use this to resolve the name to a user ID. Also use it to answer "who is on this workspace?" or "what is [person]s user ID?".',
        { workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'), apiKey: z.string().optional().describe('Brioright API key.') },
        async ({ workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/members`, null, apiKey)
            const members = data.members || data
            return { content: [{ type: 'text', text: JSON.stringify(members.map(m => ({ id: m.user?.id || m.id, name: m.user?.name || m.name, email: m.user?.email || m.email, role: m.role })), null, 2) }] }
        }
    )

    // ── get_workspace_summary ─────────────────────────────────────────────────
    server.tool('get_workspace_summary',
        'Returns high-level dashboard statistics for a workspace: total tasks broken down by status (todo, in_progress, done, etc.) and by priority (low, medium, high, urgent). Use this to answer questions like "how many tasks are pending?", "what is our workload?", or "give me a project health overview". Does NOT return individual task details — use list_tasks for that.',
        { workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'), apiKey: z.string().optional().describe('Brioright API key.') },
        async ({ workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/dashboard/stats`, null, apiKey)
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
        }
    )

    // ── add_comment ───────────────────────────────────────────────────────────
    server.tool('add_comment',
        'Posts a comment on a task. Use this to leave a status update, ask a question on a task, provide context, or summarise findings. Supports markdown formatting in the text. Returns the posted comment with its ID and timestamp.',
        {
            taskId: z.string().describe('ID of the task to comment on.'),
            text: z.string().describe('Comment content. Supports markdown — use **bold**, bullet lists, code blocks etc. for clarity.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
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
    server.tool('get_task_comments',
        'Retrieves the full comment thread for a task in chronological order. Use this when the user asks "what has been discussed on this task?", wants a summary of activity, or before adding a new comment to avoid duplicating information. Returns each comment id, text, author name, and timestamp.',
        {
            taskId: z.string().describe('ID of the task to fetch comments for.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ taskId, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/tasks/${taskId}/comments`, null, apiKey)
            const comments = data.comments || data
            return { content: [{ type: 'text', text: JSON.stringify(comments.map(c => ({ id: c.id, text: c.text, author: c.author?.name, createdAt: c.createdAt })), null, 2) }] }
        }
    )

    // ── get_task_activities ───────────────────────────────────────────────────
    server.tool('get_task_activities',
        'Returns the full audit trail of changes made to a task: who changed what field, when status changed, when it was assigned, due date updates, etc. Use this when the user asks "what changed on this task?", "when was this assigned?", or "show me the task history". Different from get_task_comments — this is system-generated activity, not user comments.',
        {
            taskId: z.string().describe('ID of the task to fetch activity history for.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ taskId, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/tasks/${taskId}/activities`, null, apiKey)
            const activities = data.activities || data
            return { content: [{ type: 'text', text: JSON.stringify(activities.map(a => ({ id: a.id, type: a.type, message: a.message, user: a.user?.name, createdAt: a.createdAt })), null, 2) }] }
        }
    )

    // ── log_time ──────────────────────────────────────────────────────────────
    server.tool('log_time',
        'Records a time entry against a project or specific task. Use this when the user says "log 2 hours on task X", "I spent 30 minutes on the auth feature", or "start a timer". If endTime is omitted, a running timer is started. If both startTime and endTime are provided, a completed time block is logged. projectId is required; taskId narrows it to a specific task.',
        {
            projectId: z.string().describe('Project ID to log time against — use list_projects if unknown.'),
            taskId: z.string().optional().describe('Optional task ID to associate the time entry with a specific task.'),
            description: z.string().optional().describe('What was worked on during this time, e.g. "Fixed login bug", "Code review for PR #42".'),
            startTime: z.string().optional().describe('Start of the work period as ISO string, e.g. "2026-03-22T09:00:00Z". Defaults to now.'),
            endTime: z.string().optional().describe('End of the work period as ISO string. Omit to start a running timer instead of logging a completed block.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
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


    // ── delete_task ───────────────────────────────────────────────────────────
    server.tool('delete_task',
        'Permanently deletes a task and all its subtasks, comments, and attachments. This action is IRREVERSIBLE. Use this when the user explicitly asks to delete or remove a task. Do NOT use this to cancel a task — use update_task with status=cancelled instead. Always confirm with the user before calling this if there is any ambiguity. Returns a confirmation message.',
        {
            taskId: z.string().describe('ID of the task to permanently delete. Use list_tasks or get_task to find it.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ taskId, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            await call('DELETE', `/workspaces/${ws}/tasks/${taskId}`, null, apiKey)
            return { content: [{ type: 'text', text: `🗑️ Task ${taskId} has been permanently deleted.` }] }
        }
    )

    // ── search_workspace ──────────────────────────────────────────────────────
    server.tool('search_workspace',
        'Searches across the entire workspace and returns matching tasks, projects, and members in a single call. Use this when the user asks to find something by keyword, e.g. "find tasks about login", "search for the auth project", or "who is named John?". Returns up to 5 results per category (tasks, projects, users). Requires at least 2 characters in the query.',
        {
            query: z.string().describe('Search keyword or phrase — minimum 2 characters. Searches task titles/descriptions, project names/descriptions, and member names/emails.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ query, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            if (!query || query.trim().length < 2) throw new Error('Search query must be at least 2 characters')
            const data = await call('GET', `/workspaces/${ws}/search?q=${encodeURIComponent(query.trim())}`, null, apiKey)
            const { projects = [], tasks = [], users = [] } = data
            const result = {
                summary: `Found ${tasks.length} task(s), ${projects.length} project(s), ${users.length} member(s) for "${query}"`,
                tasks: tasks.map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, projectId: t.projectId })),
                projects: projects.map(p => ({ id: p.id, name: p.name, description: p.description })),
                users: users.map(u => ({ id: u.id, name: u.name, email: u.email }))
            }
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
        }
    )

    // ── get_workspace_analytics ───────────────────────────────────────────────
    server.tool('get_workspace_analytics',
        'Returns detailed analytics for a workspace including: task completion rate, tasks by status and priority, completion trends over time, task creation trends, top performers (leaderboard), member workload distribution, and per-project progress. Use this when the user asks for a report, "how are we doing?", "show me the analytics", "who completed the most tasks?", or "what is our completion rate?". Use get_workspace_summary instead for just basic task counts.',
        {
            range: z.enum(['7d', '30d', '90d', 'all']).optional().default('30d').describe('Time range for trend data. 7d=last week, 30d=last month (default), 90d=last quarter, all=all time.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ range, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/analytics?range=${range || '30d'}`, null, apiKey)
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
        }
    )

    // ── get_overdue_tasks ─────────────────────────────────────────────────────
    server.tool('get_overdue_tasks',
        'Returns all tasks that are past their due date and still not done. Use this when the user asks "what is overdue?", "what tasks are late?", or "show me missed deadlines". Results include task id, title, due date, assignee, and project. This is a dedicated endpoint — do not try to replicate this by filtering list_tasks manually.',
        {
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/tasks/overdue`, null, apiKey)
            const tasks = data.tasks || data
            return { content: [{ type: 'text', text: JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, assignee: t.assignee?.name, projectId: t.projectId, status: t.status })), null, 2) }] }
        }
    )

    // ── get_project_analytics ────────────────────────────────────────────────
    server.tool('get_project_analytics',
        'Returns detailed analytics for a specific project including: task completion rate, task counts by status/priority, and daily completion trends. Use this when the user asks "how is this project doing?", "show me the project health", or "what is the completion rate for the Lumi project?".',
        {
            projectId: z.string().describe('ID of the project to fetch analytics for.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ projectId, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/projects/${projectId}/analytics`, null, apiKey)
            return { content: [{ type: 'text', text: JSON.stringify(data.analytics || data, null, 2) }] }
        }
    )

    // ── get_project_activity ──────────────────────────────────────────────────
    server.tool('get_project_activity',
        'Returns the recent activity log for a specific project. Use this when the user asks "what has happened recently in this project?" or "show me the history of the Lumi app project". Returns up to 50 recent actions.',
        {
            projectId: z.string().describe('ID of the project to fetch activity history for.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ projectId, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/projects/${projectId}/activity`, null, apiKey)
            const activities = data.activities || data
            return { content: [{ type: 'text', text: JSON.stringify(activities.map(a => ({ id: a.id, type: a.type, message: a.message, user: a.user?.name, createdAt: a.createdAt })), null, 2) }] }
        }
    )

    // ── get_active_timers ─────────────────────────────────────────────────────
    server.tool('get_active_timers',
        'Returns all running (active) time trackers for the current user across all projects. Use this when the user asks "do I have a timer running?", "what am I working on right now?", or "show me my active timers".',
        {
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/time-entries/active`, null, apiKey)
            const active = data.active || data
            return { content: [{ type: 'text', text: JSON.stringify(active, null, 2) }] }
        }
    )

    // ── stop_timer ────────────────────────────────────────────────────────────
    server.tool('stop_timer',
        'Stops a running time tracker by its ID. Use this when the user says "stop my timer", "I am done with this task", or "clock me out". If you don\'t have the timer ID, call get_active_timers first.',
        {
            timerId: z.string().describe('The ID of the time entry to stop.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ timerId, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            await call('PATCH', `/workspaces/${ws}/time-entries/${timerId}/stop`, null, apiKey)
            return { content: [{ type: 'text', text: `✅ Timer ${timerId} stopped successfully.` }] }
        }
    )

    // ── get_time_summary ──────────────────────────────────────────────────────
    server.tool('get_time_summary',
        'Returns a statistical summary of time logged by the user, aggregated by day or project. Use this when the user asks "how much did I work this week?", "show me my time stats", or "how many hours have I logged today?".',
        {
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/time-entries/summary`, null, apiKey)
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
        }
    )

    // ── get_time_entries ──────────────────────────────────────────────────────
    server.tool('get_time_entries',
        'Lists detailed time entry logs with optional filters for project or task. Use this when the user asks "show me my time logs for the Lumi project" or "when did I work on task X?".',
        {
            projectId: z.string().optional().describe('Filter by Project ID.'),
            taskId: z.string().optional().describe('Filter by Task ID.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ projectId, taskId, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const params = new URLSearchParams()
            if (projectId) params.set('projectId', projectId)
            if (taskId) params.set('taskId', taskId)
            const data = await call('GET', `/workspaces/${ws}/time-entries?${params}`, null, apiKey)
            const entries = data.entries || data
            return { content: [{ type: 'text', text: JSON.stringify(entries, null, 2) }] }
        }
    )

    // ── get_task_dependencies ────────────────────────────────────────────────
    server.tool('get_task_dependencies',
        'Returns a list of all tasks that the specified task depends on (blockers) and tasks that depend on it. Use this when the user asks "what is blocking this task?" or "are there any dependencies for task X?". Useful for project scheduling and identifying bottlenecks.',
        {
            taskId: z.string().describe('ID of the task to fetch dependencies for.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ taskId, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('GET', `/workspaces/${ws}/tasks/${taskId}/dependencies`, null, apiKey)
            return { content: [{ type: 'text', text: JSON.stringify(data.dependencies || data, null, 2) }] }
        }
    )

    // ── add_task_dependency ───────────────────────────────────────────────────
    server.tool('add_task_dependency',
        'Creates a dependency relationship between two tasks. Use this when the user says "task A depends on task B" or "task B blocks task A". In this case, task B is the blockingTaskId.',
        {
            taskId: z.string().describe('ID of the task that is being blocked.'),
            blockingTaskId: z.string().describe('ID of the task that must be completed first.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ taskId, blockingTaskId, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const data = await call('POST', `/workspaces/${ws}/tasks/${taskId}/dependencies`, { blockingTaskId }, apiKey)
            return { content: [{ type: 'text', text: `✅ Dependency added: Task ${taskId} is now blocked by Task ${blockingTaskId}.` }] }
        }
    )

    // ── remove_task_dependency ────────────────────────────────────────────────
    server.tool('remove_task_dependency',
        'Removes an existing dependency between two tasks. Use this when a dependency is no longer valid or was added by mistake. Requires the dependency ID (depId), which can be found via get_task_dependencies.',
        {
            taskId: z.string().describe('ID of the task that was being blocked.'),
            depId: z.string().describe('ID of the dependency relationship to remove.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ taskId, depId, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            await call('DELETE', `/workspaces/${ws}/tasks/${taskId}/dependencies/${depId}`, null, apiKey)
            return { content: [{ type: 'text', text: `✅ Dependency ${depId} removed from Task ${taskId}.` }] }
        }
    )

    // ── search_users ──────────────────────────────────────────────────────────
    server.tool('search_users',
        'Allows searching for users across the entire Brioright system by name or email. Use this when you need to find a user\'s ID for task assignment and they aren\'t in the current workspace member list, or when the user says "assign this to John" and you need to find which John.',
        {
            query: z.string().describe('Search keyword (name or email). Minimum 2 characters.'),
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ query, apiKey }) => {
            if (!query || query.trim().length < 2) throw new Error('Search query must be at least 2 characters')
            const data = await call('GET', `/users/search?q=${encodeURIComponent(query.trim())}`, null, apiKey)
            const users = data.users || data
            return { content: [{ type: 'text', text: JSON.stringify(users, null, 2) }] }
        }
    )

    // ── get_notifications ─────────────────────────────────────────────────────
    server.tool('get_notifications',
        'Fetches the latest unread notifications for the current user. Use this when the user asks "what are my notifications?", "has anyone replied to my comment?", or "are there any updates for me?".',
        {
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ apiKey }) => {
            const data = await call('GET', '/notifications', null, apiKey)
            const notifications = data.notifications || data
            return { content: [{ type: 'text', text: JSON.stringify(notifications, null, 2) }] }
        }
    )

    // ── mark_notification_read ────────────────────────────────────────────────
    server.tool('mark_notification_read',
        'Marks one or all notifications as read. Use this when the user says "clear my notifications" or "mark notification X as read".',
        {
            notificationId: z.string().optional().describe('ID of the specific notification to mark as read. If omitted, and "all" is true, marks all read.'),
            all: z.boolean().optional().describe('If true, marks all notifications in the workspace as read.'),
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ notificationId, all, apiKey }) => {
            if (all) {
                await call('PATCH', '/notifications/read-all', null, apiKey)
                return { content: [{ type: 'text', text: '✅ All notifications marked as read.' }] }
            }
            if (!notificationId) throw new Error('Either notificationId or all=true must be provided')
            await call('PATCH', `/notifications/${notificationId}/read`, null, apiKey)
            return { content: [{ type: 'text', text: `✅ Notification ${notificationId} marked as read.` }] }
        }
    )

    // ── start_work ─────────────────────────────────────────────────────────────
    server.tool('start_work',
        'Signals that AI has STARTED working on a task. Creates a task with status=in_progress and returns its ID. Call this at the BEGINNING of any significant work session (feature, bug fix, refactor, UI change, etc.) so the work is tracked from the start. Returns a taskId — pass it to finish_work when the work is complete. Pair: start_work → finish_work.',
        {
            projectId: z.string().describe('Project ID to log the work against — use list_projects if unknown.'),
            title: z.string().describe('Clear title for the work being started, e.g. "Refactor login page UI" or "Fix avatar upload bug".'),
            description: z.string().optional().describe('Optional: what will be done, the approach, and which files/areas will be affected.'),
            priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium').describe('Priority of the work. Use urgent for blockers.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ projectId, title, description, priority, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')
            const startedAt = new Date().toLocaleString()
            const data = await call('POST', `/workspaces/${ws}/projects/${projectId}/tasks`, {
                title,
                description: description
                    ? `${description}\n\n---\n_🤖 Work started by AI agent at ${startedAt}_`
                    : `🤖 Work started by AI agent at ${startedAt}.\n\n_Call \`finish_work\` with this task ID when the work is complete._`,
                status: 'in_progress',
                priority: priority || 'medium',
            }, apiKey)
            const task = data.task || data
            return { content: [{ type: 'text', text: `🚀 Work started and logged!\n\nTask ID: **${task.id}**\nTitle: ${task.title}\nStatus: in_progress\n\n👉 Remember to call \`finish_work\` with taskId="${task.id}" when done.` }] }
        }
    )

    // ── finish_work ─────────────────────────────────────────────────────────────
    server.tool('finish_work',
        'Signals that AI has COMPLETED a piece of work. Marks the task as done and posts a structured markdown completion summary as a comment (what changed, files modified, key decisions). Use this to close a task that was opened with start_work. If you did not call start_work, use track_work instead for a one-shot retroactive log.',
        {
            taskId: z.string().describe('Task ID returned by start_work. This is the task to mark as done.'),
            summary: z.string().describe('What was accomplished — be specific. Describe what changed, why, and any important decisions. Markdown is supported.'),
            filesChanged: z.array(z.string()).optional().describe('List of files that were created or modified, e.g. ["src/components/Login.jsx", "src/styles/auth.css"]. Will be shown in the completion comment.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ taskId, summary, filesChanged, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')

            // Mark task as done
            await call('PATCH', `/workspaces/${ws}/tasks/${taskId}`, { status: 'done' }, apiKey)

            // Build a clean structured completion comment
            const fileSection = filesChanged?.length
                ? `\n\n### 📁 Files Changed\n${filesChanged.map(f => `- \`${f}\``).join('\n')}`
                : ''
            const comment = [
                `## ✅ Work Completed`,
                ``,
                summary,
                fileSection,
                ``,
                `---`,
                `_🤖 Completed by AI agent at ${new Date().toLocaleString()}_`
            ].join('\n')

            await call('POST', `/workspaces/${ws}/tasks/${taskId}/comments`, { text: comment }, apiKey)

            return { content: [{ type: 'text', text: `✅ Work finished and logged!\n\nTask ${taskId} → done\nCompletion summary posted as a comment on the task.` }] }
        }
    )

    // ── track_work ─────────────────────────────────────────────────────────────
    server.tool('track_work',
        'Smart one-shot work tracker. Call this AFTER completing any work session to automatically: (1) search for an existing matching task in the project, (2) reuse it or create a fresh one if not found, (3) mark it done, and (4) post a structured completion comment. This is the preferred tool when you did not call start_work at the beginning — it handles the full lifecycle in a single call. Ideal for retroactively logging completed work.',
        {
            projectId: z.string().describe('Project ID to log work against — use list_projects if unknown.'),
            title: z.string().describe('Title of the work done. Used first to search for an existing task — be specific enough to match if one exists.'),
            summary: z.string().describe('Detailed description of what was accomplished. Supports markdown. Include: what changed, why, key decisions, and caveats.'),
            priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium').describe('Priority for the task if a new one must be created.'),
            filesChanged: z.array(z.string()).optional().describe('List of files created or modified. Shown in the completion comment for traceability.'),
            workspaceId: z.string().optional().describe('Workspace slug. Defaults to BRIORIGHT_WORKSPACE_ID.'),
            apiKey: z.string().optional().describe('Brioright API key.')
        },
        async ({ projectId, title, summary, priority, filesChanged, workspaceId, apiKey }) => {
            const ws = workspaceId || DEFAULT_WORKSPACE
            if (!ws) throw new Error('workspaceId is required')

            let taskId = null
            let action = 'created'

            // Step 1: Search for an existing open task with a similar title
            try {
                const searchQuery = title.substring(0, 60).trim()
                const searchData = await call('GET', `/workspaces/${ws}/search?q=${encodeURIComponent(searchQuery)}`, null, apiKey)
                const { tasks = [] } = searchData
                // Find a task in the same project that isn't already closed
                const match = tasks.find(t =>
                    t.projectId === projectId &&
                    !['done', 'cancelled'].includes(t.status)
                )
                if (match) {
                    taskId = match.id
                    action = 'found_existing'
                }
            } catch {
                // Search failed — proceed to create a new task
            }

            // Step 2: Create task if no match was found
            if (!taskId) {
                const data = await call('POST', `/workspaces/${ws}/projects/${projectId}/tasks`, {
                    title,
                    description: summary,
                    status: 'done',
                    priority: priority || 'medium',
                }, apiKey)
                const task = data.task || data
                taskId = task.id
            } else {
                // Mark the found task as done
                await call('PATCH', `/workspaces/${ws}/tasks/${taskId}`, { status: 'done' }, apiKey)
            }

            // Step 3: Post structured completion comment
            const fileSection = filesChanged?.length
                ? `\n\n### 📁 Files Changed\n${filesChanged.map(f => `- \`${f}\``).join('\n')}`
                : ''
            const comment = [
                `## ✅ Work Completed`,
                ``,
                summary,
                fileSection,
                ``,
                `---`,
                `_🤖 Auto-tracked by AI agent via \`track_work\` at ${new Date().toLocaleString()}_`
            ].join('\n')

            await call('POST', `/workspaces/${ws}/tasks/${taskId}/comments`, { text: comment }, apiKey)

            const actionLabel = action === 'found_existing'
                ? `♻️  Found existing open task — marked it done`
                : `🆕 No matching task found — created a new one`

            return { content: [{ type: 'text', text: `✅ Work tracked!\n\n${actionLabel}\nTask ID: ${taskId}\nCompletion summary posted as a comment.` }] }
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
