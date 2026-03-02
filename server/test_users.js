import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function main() {
    const data = {
        users: await prisma.user.findMany({ select: { id: true, name: true, email: true } }),
        workspaceMembers: await prisma.workspaceMember.findMany(),
        projectMembers: await prisma.projectMember.findMany(),
    };
    fs.writeFileSync('out_users.json', JSON.stringify(data, null, 2), 'utf8');
}

main().catch(console.error).finally(() => prisma.$disconnect());
