/**
 * Dedup Tasks Script
 * ------------------
 * Finds duplicate tasks (same title + projectId) created by repeated CSV imports.
 * Keeps the OLDEST copy (lowest createdAt) and deletes the rest.
 *
 * Run:  node scripts/dedup-tasks.js
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Scanning for duplicate tasks...\n')

    // Fetch all tasks, ordered oldest first
    const allTasks = await prisma.task.findMany({
        select: { id: true, title: true, projectId: true, status: true, createdAt: true },
        orderBy: { createdAt: 'asc' }
    })

    console.log(`   Total tasks in database: ${allTasks.length}`)

    // Group by projectId + title (case-insensitive)
    const seen = new Map()
    const toDelete = []

    for (const task of allTasks) {
        const key = `${task.projectId}::${task.title.toLowerCase().trim()}`
        if (seen.has(key)) {
            toDelete.push(task.id)
        } else {
            seen.set(key, task.id)
        }
    }

    const uniqueCount = allTasks.length - toDelete.length
    console.log(`   Unique tasks (to keep):  ${uniqueCount}`)
    console.log(`   Duplicates (to delete):  ${toDelete.length}\n`)

    if (toDelete.length === 0) {
        console.log('✅ No duplicates found. Nothing to do.')
        return
    }

    // Warn and delete in batches of 100
    console.log(`🗑️  Deleting ${toDelete.length} duplicate tasks...`)

    const BATCH = 100
    let deleted = 0
    for (let i = 0; i < toDelete.length; i += BATCH) {
        const batch = toDelete.slice(i, i + BATCH)
        const result = await prisma.task.deleteMany({ where: { id: { in: batch } } })
        deleted += result.count
        process.stdout.write(`\r   Deleted ${deleted} / ${toDelete.length}`)
    }

    console.log(`\n\n✅ Done! Removed ${deleted} duplicates. ${uniqueCount} tasks remain.`)
}

main()
    .catch((e) => { console.error('❌ Error:', e.message); process.exit(1) })
    .finally(() => prisma.$disconnect())
