import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const targetWs = 'myworpsacke-new';
    const myApiKeyUserId = '6f1912c8-f843-43bc-9b1f-205f370447df'; // The owner of "Test Workspace"
    const existing = await prisma.workspaceMember.findFirst({
        where: { workspace: { slug: targetWs }, userId: myApiKeyUserId }
    });
    if (!existing) {
        await prisma.workspaceMember.create({
            data: {
                workspace: { connect: { slug: targetWs } },
                user: { connect: { id: myApiKeyUserId } },
                role: 'owner'
            }
        });
        console.log('Added my API user to ' + targetWs);
    } else {
        console.log('Already a member');
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
