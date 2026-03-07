# Brioright MCP Server

Connect AI assistants (Claude Desktop, Cursor, etc.) directly to your Brioright workspace.

## Quick Setup

### 1. Generate an API Key

Log in to Brioright, then run this from your server terminal:

```bash
curl -X POST https://brioright.online/api/api-keys \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{"name": "Claude Desktop", "workspaceId": "your-workspace-slug"}'
```

Or use the Brioright Settings page (coming soon) to generate one visually.

**Save the key** — it's shown only once!

---

### 2. Configure the MCP Server

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:
```env
BRIORIGHT_API_URL=https://brioright.online/api
BRIORIGHT_API_KEY=brio_your_key_here
BRIORIGHT_WORKSPACE_ID=your-workspace-slug
```

---

### 3. Connect to Claude Desktop

Add to `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "brioright": {
      "command": "node",
      "args": ["D:/TaskManagement/mcp-server/index.js"],
      "env": {
        "BRIORIGHT_API_URL": "https://brioright.online/api",
        "BRIORIGHT_API_KEY": "brio_your_key_here",
        "BRIORIGHT_WORKSPACE_ID": "your-workspace-slug"
      }
    }
  }
}
```

Restart Claude Desktop — you'll see the 🔌 icon showing Brioright tools are available.

---

### 4. Test with MCP Inspector

```bash
npm run inspect
```

---

## Available Tools

| Tool | Description |
|------|-------------|
| `list_workspaces` | List all accessible workspaces |
| `list_projects` | List projects in a workspace |
| `list_tasks` | List tasks with optional status/priority filter |
| `get_task` | Get full task details |
| `create_task` | Create a task with title, priority, due date, assignee |
| `update_task` | Update any fields on a task |
| `complete_task` | Mark a task as done |
| `create_project` | Create a new project |
| `list_members` | List workspace members (for finding assignee IDs) |
| `get_workspace_summary` | Dashboard stats: task counts by status/priority |

## Example Prompts

Once connected to Claude:

> *"Create a task in the Brioright project: Set up Sentry error monitoring, high priority, due March 15"*

> *"What are all the high priority tasks currently in progress?"*

> *"Mark task abc123 as complete"*

> *"Create a new project called Q2 Roadmap in my workspace"*
