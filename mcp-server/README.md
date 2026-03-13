# Brioright MCP Server

Connect AI assistants (Claude Desktop, Cursor, Antigravity) directly to your Brioright workspace.

## Transport Modes
This server supports two transport modes:
1. **Stdio mode (Local)**: Runs as a subprocess for local clients like Claude Desktop or Cursor.
2. **HTTP/SSE mode (Cloud)**: Runs as a persistent web server for cloud-based AI assistants (like Antigravity).

## Quick Setup (Easiest Way)

Instead of manually editing JSON configuration files, you can use our interactive setup wizard to automatically connect your IDE to Brioright:

```bash
npx -y brioright-mcp connect
```

You will simply be prompted for your API Key and Workspace ID. The wizard supports injecting settings into VS Code (Roo/Cline), Cursor, Windsurf, and Antigravity automatically.

---

## Manual Setup

### 1. Generate an API Key
Log in to Brioright, then run from your browser console:
```javascript
const res = await fetch('/api/api-keys', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ name: 'My MCP Client' })
});
console.log(await res.json());
```
**Save the key**!

### 2. Configure the MCP Server

```bash
cp .env.example .env
```
Edit `.env`:
```env
BRIORIGHT_API_URL=https://brioright.online/api
BRIORIGHT_API_KEY=brio_your_key_here
BRIORIGHT_WORKSPACE_ID=your-workspace-slug

# Leave unset (or "stdio") for Claude Desktop
# Set to "http" for cloud clients like Antigravity
MCP_TRANSPORT=http
MCP_PORT=4040
MCP_SECRET=change_me_to_a_strong_secret
```

### 3A. Connect to Claude Desktop (Local)
Add to `%APPDATA%\Claude\claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "brioright": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/index.js"],
      "env": {
        "BRIORIGHT_API_URL": "...",
        "BRIORIGHT_API_KEY": "...",
        "BRIORIGHT_WORKSPACE_ID": "..."
      }
    }
  }
}
```

### 3B. Connect Cloud AI (Remote)
Deploy the server with `MCP_TRANSPORT=http` (via PM2).
Provide the cloud AI assistant your MCP server base URL: `http://your-server-ip:4040/sse`
And pass the Authorization Header: `Bearer your_secure_bearer_token`.

## Available Tools
| Tool | Description |
|------|-------------|
| `list_workspaces` | List all accessible workspaces |
| `list_projects` | List projects in a workspace |
| `list_tasks` | List tasks with optional status/priority filter |
| `get_task` | Get full task details |
| `duplicate_task` | Duplicate an existing task |
| `create_task` | Create a task with title, priority, due date, assignee |
| `update_task` | Update any fields on a task |
| `complete_task` | Mark a task as done |
| `create_project` | Create a new project |
| `list_members` | List workspace members (for finding assignee IDs) |
| `get_workspace_summary` | Dashboard stats: task counts by status/priority |
| `bulk_create_tasks` | Create multiple tasks at once |
| `add_comment` | Add a comment to a task |
| `get_task_comments` | Get all comments for a given task |
| `log_time` | Log time entry for a project/task |
| `add_task_attachment` | Upload a file attachment to a task using a Base64 encoded string |
| `get_task_attachments` | List all file attachments for a specific task |
