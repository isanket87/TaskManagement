import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function main() {
    const data = {
        projects: await prisma.project.findMany(),
        workspaces: await prisma.workspace.findMany(),
    };
    fs.writeFileSync('out.json', JSON.stringify(data, null, 2), 'utf8');
}

main().catch(console.error).finally(() => prisma.$disconnect());
