---
description: How to interact efficiently with the Brioright MCP server
---

# Brioright MCP Workflow

## Pre-Cached IDs (use these — don't call list_workspaces/list_projects every time)

Stored in `scripts/brioright-ids.json`. Key IDs:

- **Default workspace slug:** `techworkspace`
- **Task Management project ID:** `7afd888f-0d75-470a-95f4-104319e5d09b`
- **Lumi Mobile App project ID:** `9b152439-7049-4d43-9fc4-fb3091a30a73`

Always check this file first before calling `list_workspaces` or `list_projects`.

---

## 1. Creating a Task

Use `mcp_brioright-remote_create_task` with:
- `workspaceId`: slug from `brioright-ids.json` (e.g. `techworkspace`)
- `projectId`: ID from `brioright-ids.json`
- `status`: `todo` | `in_progress` | `in_review` | `done`
- `priority`: `low` | `medium` | `high` | `urgent`
- `tags`: array of strings e.g. `["frontend", "ui"]`

---

## 2. Attaching a File to a Task

**Critical:** The `fileContent` parameter must be Base64-encoded. Use the helper script — never try to Base64 inline in PowerShell.

### Step 1 — Encode the file
```
node scripts/mcp-attach.js <path-to-file>
# For images/PDFs:
node scripts/mcp-attach.js screenshot.png --mime image/png
node scripts/mcp-attach.js report.pdf --mime application/pdf
```

The script prints the full Base64 string. Copy it.

### Step 2 — Call `add_task_attachment`
```json
{
  "taskId": "<task-id>",
  "fileName": "my-file.md",
  "mimeType": "text/markdown",
  "fileContent": "<paste Base64 here>",
  "workspaceId": "techworkspace"
}
```

> ⚠️ Never use PowerShell pipes or redirects (`|`, `>`) to generate Base64 — they fail silently or error. Always use `node scripts/mcp-attach.js`.

---

## 3. Smart Work Tracking (Preferred)

The MCP server now has **3 smart lifecycle tools** that handle task creation, status tracking, and completion comments automatically.

### Option A: Full lifecycle (start → finish)

Use when you know upfront that significant work is starting:

```
1. start_work  → Creates task as in_progress, returns taskId
2. [do the work]
3. finish_work → Marks done + posts structured completion comment
```

```json
// start_work
{ "projectId": "7afd888f...", "title": "Fix avatar upload bug", "priority": "high", "workspaceId": "techworkspace" }

// finish_work
{ "taskId": "<returned-id>", "summary": "Fixed S3 key prefix bug in uploadService.js", "filesChanged": ["server/services/uploadService.js"] }
```

### Option B: One-shot retroactive log (preferred for most cases)

Use `track_work` AFTER completing any work. It automatically:
1. Searches for an existing matching open task
2. Creates a new one if none found
3. Marks it `done`
4. Posts a structured completion comment

```json
{
  "projectId": "7afd888f...",
  "workspaceId": "techworkspace",
  "title": "Optimize Kanban Board Toolbar UX",
  "summary": "Replaced 8 flat tabs with 4+More dropdown...",
  "priority": "high",
  "filesChanged": ["client/src/pages/ProjectDetail.jsx", "client/src/components/shared/BoardFilterBar.jsx"]
}
```

> **Rule:** After any significant code change session, call `track_work` — never leave work unlogged.

### Legacy Method (still works, but prefer track_work)

1. `create_task` with `status: done`
2. `add_comment` with summary


## 4. Attaching Screenshots / Recordings

```
node scripts/mcp-attach.js path/to/screenshot.png --mime image/png
```

Then use `add_task_attachment` with `mimeType: image/png`.

---

## 5. Searching for a Task by Name

Use `mcp_brioright-remote_search_workspace` with a keyword (min 2 chars).
Returns matching tasks, projects, and members in one call.

---

## 6. Bulk Creating Tasks (Sprint Planning)

Use `mcp_brioright-remote_bulk_create_tasks` — far more efficient than calling `create_task` in a loop.

```json
{
  "projectId": "7afd888f-0d75-470a-95f4-104319e5d09b",
  "workspaceId": "techworkspace",
  "tasks": [
    { "title": "Task A", "priority": "high", "status": "todo" },
    { "title": "Task B", "priority": "medium", "status": "todo" }
  ]
}
```

---

## 7. Common IDs Quick Reference

| Resource | ID |
|---|---|
| TechWorkspace (slug) | `techworkspace` |
| Task Management project | `7afd888f-0d75-470a-95f4-104319e5d09b` |
| Lumi Mobile App project | `9b152439-7049-4d43-9fc4-fb3091a30a73` |

> If IDs change, update `scripts/brioright-ids.json` directly.
