/**
 * Cleanup Options for Duplicate Tasks
 * ------------------------------------
 * The "project management" project has 1164 tasks from repeated CSV imports.
 * Each CSV import created tasks with unique-looking titles (P1-001, P1-002, etc.)
 * but the same titles were imported multiple times, creating duplicates.
 *
 * Run ONE of the options below:
 *
 * OPTION A — Delete ALL tasks in the project (clean slate):
 *   node scripts/cleanup-tasks.js --all
 *
 * OPTION B — Keep only the first N tasks (by createdAt):
 *   node scripts/cleanup-tasks.js --keep 50
 *
 * OPTION C — Delete tasks created after a specific date:
 *   node scripts/cleanup-tasks.js --after 2026-03-06
 */

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// ── CONFIG — fill in your target project ID ─────────────────────────────────
// Get this from the URL when you open the project: /projects/<PROJECT_ID>
const PROJECT_ID = process.env.PROJECT_ID || ''

async function main() {
    if (!PROJECT_ID) {
        console.error('❌  Set PROJECT_ID env var or update the script.\n   Example: PROJECT_ID=abc123 node scripts/cleanup-tasks.js --all')
        process.exit(1)
    }

    const args = process.argv.slice(2)
    const mode = args[0]

    const total = await prisma.task.count({ where: { projectId: PROJECT_ID } })
    console.log(`\n📊 Total tasks in project: ${total}`)

    if (mode === '--all') {
        console.log('🗑️  Deleting ALL tasks in project...')
        const r = await prisma.task.deleteMany({ where: { projectId: PROJECT_ID } })
        console.log(`✅  Deleted ${r.count} tasks.`)

    } else if (mode === '--keep') {
        const keep = parseInt(args[1] || '50')
        const tasks = await prisma.task.findMany({
            where: { projectId: PROJECT_ID },
            select: { id: true },
            orderBy: { createdAt: 'asc' },
            take: keep
        })
        const keepIds = tasks.map(t => t.id)
        console.log(`🗑️  Keeping ${keepIds.length} oldest tasks, deleting the rest...`)
        const r = await prisma.task.deleteMany({
            where: { projectId: PROJECT_ID, id: { notIn: keepIds } }
        })
        console.log(`✅  Deleted ${r.count} tasks. ${keepIds.length} remain.`)

    } else if (mode === '--after') {
        const dateStr = args[1]
        if (!dateStr) { console.error('❌  Provide a date: --after 2026-03-06'); process.exit(1) }
        const cutoff = new Date(dateStr)
        console.log(`🗑️  Deleting tasks created after ${cutoff.toDateString()}...`)
        const r = await prisma.task.deleteMany({
            where: { projectId: PROJECT_ID, createdAt: { gt: cutoff } }
        })
        console.log(`✅  Deleted ${r.count} tasks.`)

    } else {
        console.log('\nUsage:')
        console.log('  PROJECT_ID=<id> node scripts/cleanup-tasks.js --all')
        console.log('  PROJECT_ID=<id> node scripts/cleanup-tasks.js --keep 50')
        console.log('  PROJECT_ID=<id> node scripts/cleanup-tasks.js --after 2026-03-06')
    }
}

main()
    .catch(e => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())
