/**
 * Check Task Counts Per Project
 * Run: node scripts/check-task-counts.js
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const projects = await prisma.project.findMany({
        select: {
            id: true,
            name: true,
            _count: { select: { tasks: true } }
        },
        orderBy: { updatedAt: 'desc' }
    })

    console.log('\n📊 Task counts per project:\n')
    for (const p of projects) {
        console.log(`  ${p.name.padEnd(40)} → ${p._count.tasks} tasks`)
    }

    const total = projects.reduce((s, p) => s + p._count.tasks, 0)
    console.log(`\n  TOTAL: ${total} tasks across ${projects.length} projects\n`)
}

main()
    .catch(e => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())
