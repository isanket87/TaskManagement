const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

const computeStatus = (dueDate, taskStatus) => {
    if (taskStatus === 'done') return 'completed';
    if (!dueDate) return 'none';
    const now = new Date();
    const due = new Date(dueDate);
    if (due < now) return 'overdue';
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    if (due <= todayEnd) return 'due_today';
    if (due <= addDays(now, 3)) return 'due_soon';
    return 'on_track';
};

async function main() {
    console.log('🌱 Seeding database...');

    await prisma.activityLog.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.workspaceInvite.deleteMany();
    await prisma.workspaceMember.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.user.deleteMany();

    const hashedPassword = await bcrypt.hash('Demo@123', 12);

    // Create users
    const admin = await prisma.user.create({
        data: {
            name: 'Alex Admin',
            email: 'admin@demo.com',
            password: hashedPassword,
            role: 'admin',
            avatar: null,
        },
    });

    const member = await prisma.user.create({
        data: {
            name: 'Morgan Member',
            email: 'member@demo.com',
            password: hashedPassword,
            role: 'user',
        },
    });

    const viewer = await prisma.user.create({
        data: {
            name: 'Victor Viewer',
            email: 'viewer@demo.com',
            password: hashedPassword,
            role: 'user',
        },
    });

    console.log('✅ Users created');

    // Create 1 workspace
    const workspace = await prisma.workspace.create({
        data: {
            name: 'Demo Workspace',
            slug: 'demo-workspace',
            ownerId: admin.id,
            members: {
                create: [
                    { userId: admin.id, role: 'owner' },
                    { userId: member.id, role: 'admin' },
                    { userId: viewer.id, role: 'member' },
                ],
            },
        },
    });

    // Create 1 pending invite
    await prisma.workspaceInvite.create({
        data: {
            workspaceId: workspace.id,
            email: 'pending@demo.com',
            role: 'member',
            invitedById: admin.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });

    console.log('✅ Workspace created');

    // Create projects
    const now = new Date();
    const project1 = await prisma.project.create({
        data: {
            name: 'Website Redesign',
            description: 'Complete redesign of the company website with modern UI/UX',
            workspaceId: workspace.id,
            color: '#6366f1',
            status: 'active',
            ownerId: admin.id,
            members: {
                create: [
                    { userId: admin.id, role: 'owner' },
                    { userId: member.id, role: 'member' },
                    { userId: viewer.id, role: 'viewer' },
                ],
            },
        },
    });

    const project2 = await prisma.project.create({
        data: {
            name: 'Mobile App v2',
            description: 'Next generation mobile application with React Native',
            workspaceId: workspace.id,
            color: '#10b981',
            status: 'active',
            ownerId: admin.id,
            members: {
                create: [
                    { userId: admin.id, role: 'owner' },
                    { userId: member.id, role: 'admin' },
                ],
            },
        },
    });

    const project3 = await prisma.project.create({
        data: {
            name: 'Marketing Campaign',
            description: 'Q1 2026 marketing campaign planning and execution',
            workspaceId: workspace.id,
            color: '#f59e0b',
            status: 'active',
            ownerId: member.id,
            members: {
                create: [
                    { userId: member.id, role: 'owner' },
                    { userId: admin.id, role: 'member' },
                ],
            },
        },
    });

    const project4 = await prisma.project.create({
        data: {
            name: 'API Integration',
            description: 'Third-party API integrations for payment and analytics',
            workspaceId: workspace.id,
            color: '#ef4444',
            status: 'active',
            ownerId: admin.id,
            members: {
                create: [{ userId: admin.id, role: 'owner' }, { userId: member.id, role: 'member' }],
            },
        },
    });

    console.log('✅ Projects created');

    // Create tasks with varied due dates
    const taskDefs = [
        // Overdue tasks (3)
        { title: 'Fix login page bug', status: 'todo', priority: 'critical', dueDate: addDays(now, -5), projectId: project1.id, assigneeId: admin.id, tags: ['bug', 'frontend'] },
        { title: 'Update API documentation', status: 'in_progress', priority: 'high', dueDate: addDays(now, -2), projectId: project2.id, assigneeId: admin.id, tags: ['docs'] },
        { title: 'Security audit report', status: 'todo', priority: 'critical', dueDate: addDays(now, -1), projectId: project4.id, assigneeId: member.id, tags: ['security'] },

        // Due today (2)
        { title: 'Deploy hotfix to production', status: 'todo', priority: 'high', dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0), hasDueTime: true, projectId: project1.id, assigneeId: admin.id, tags: ['deployment'] },
        { title: 'Client presentation prep', status: 'in_progress', priority: 'high', dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 30, 0), hasDueTime: true, projectId: project3.id, assigneeId: member.id, tags: ['client'] },

        // Due soon 1-3 days (4)
        { title: 'Design home page mockup', status: 'in_progress', priority: 'medium', dueDate: addDays(now, 1), projectId: project1.id, assigneeId: admin.id, tags: ['design'] },
        { title: 'User authentication flow', status: 'todo', priority: 'high', dueDate: addDays(now, 2), projectId: project2.id, assigneeId: member.id, tags: ['auth'] },
        { title: 'Social media content calendar', status: 'todo', priority: 'medium', dueDate: addDays(now, 2), projectId: project3.id, assigneeId: member.id, tags: ['social'] },
        { title: 'Stripe payment integration', status: 'in_progress', priority: 'high', dueDate: addDays(now, 3), projectId: project4.id, assigneeId: admin.id, tags: ['payment', 'api'] },

        // On track 4-14 days (5)
        { title: 'Responsive mobile styling', status: 'todo', priority: 'medium', dueDate: addDays(now, 5), projectId: project1.id, assigneeId: admin.id, tags: ['css', 'mobile'] },
        { title: 'Push notification system', status: 'todo', priority: 'medium', dueDate: addDays(now, 7), projectId: project2.id, assigneeId: member.id, tags: ['notifications'] },
        { title: 'Email campaign design', status: 'in_progress', priority: 'low', dueDate: addDays(now, 8), projectId: project3.id, assigneeId: member.id, tags: ['email', 'design'] },
        { title: 'Analytics dashboard integration', status: 'todo', priority: 'medium', dueDate: addDays(now, 10), projectId: project4.id, assigneeId: admin.id, tags: ['analytics'] },
        { title: 'SEO optimization', status: 'todo', priority: 'low', dueDate: addDays(now, 14), projectId: project1.id, assigneeId: admin.id, tags: ['seo'] },

        // No due date (3)
        { title: 'Refactor database queries', status: 'todo', priority: 'medium', dueDate: null, projectId: project2.id, assigneeId: admin.id, tags: ['backend'] },
        { title: 'Team retrospective notes', status: 'todo', priority: 'low', dueDate: null, projectId: project3.id, assigneeId: member.id, tags: [] },
        { title: 'Code review guidelines', status: 'todo', priority: 'low', dueDate: null, projectId: project4.id, assigneeId: member.id, tags: ['docs'] },

        // Done tasks
        { title: 'Setup CI/CD pipeline', status: 'done', priority: 'high', dueDate: addDays(now, -10), projectId: project1.id, assigneeId: admin.id, tags: ['devops'] },
        { title: 'Initial wireframes', status: 'done', priority: 'medium', dueDate: addDays(now, -7), projectId: project1.id, assigneeId: admin.id, tags: ['design'] },
        { title: 'Project kickoff meeting', status: 'done', priority: 'low', dueDate: addDays(now, -14), projectId: project3.id, assigneeId: member.id, tags: [] },
        { title: 'Database schema design', status: 'done', priority: 'high', dueDate: addDays(now, -8), projectId: project4.id, assigneeId: admin.id, tags: ['database'] },
        { title: 'App store listing', status: 'in_review', priority: 'medium', dueDate: addDays(now, 6), projectId: project2.id, assigneeId: admin.id, tags: ['mobile'] },
        { title: 'Competitor analysis report', status: 'in_review', priority: 'medium', dueDate: addDays(now, 4), projectId: project3.id, assigneeId: viewer.id, tags: ['research'] },
    ];

    const createdTasks = [];
    for (let i = 0; i < taskDefs.length; i++) {
        const def = taskDefs[i];
        const dueDateStatus = computeStatus(def.dueDate, def.status);
        const task = await prisma.task.create({
            data: {
                title: def.title,
                status: def.status,
                priority: def.priority,
                dueDate: def.dueDate,
                hasDueTime: def.hasDueTime || false,
                dueDateStatus,
                projectId: def.projectId,
                assigneeId: def.assigneeId,
                createdById: admin.id,
                position: i + 1,
                tags: def.tags || [],
                description: `This is the description for "${def.title}". Contains detailed implementation notes and acceptance criteria.`,
            },
        });
        createdTasks.push(task);
    }

    console.log(`✅ ${createdTasks.length} tasks created`);

    // Create comments
    await prisma.comment.createMany({
        data: [
            { text: 'Starting work on this today!', taskId: createdTasks[0].id, authorId: admin.id },
            { text: 'This is blocking the release, please prioritize.', taskId: createdTasks[0].id, authorId: member.id },
            { text: 'I have the hotfix ready, just needs review.', taskId: createdTasks[3].id, authorId: admin.id },
            { text: 'Slides look great, minor tweaks needed on slide 5.', taskId: createdTasks[4].id, authorId: viewer.id },
            { text: 'Payment flow tested successfully in sandbox.', taskId: createdTasks[8].id, authorId: admin.id },
        ],
    });

    console.log('✅ Comments created');

    // Create activity logs
    await prisma.activityLog.createMany({
        data: [
            { projectId: project1.id, userId: admin.id, type: 'project_created', message: 'Created the project' },
            { projectId: project1.id, userId: member.id, type: 'member_joined', message: 'Morgan Member joined the project' },
            { projectId: project1.id, userId: admin.id, type: 'task_created', message: 'Created task "Fix login page bug"' },
            { projectId: project2.id, userId: admin.id, type: 'project_created', message: 'Created the project' },
            { projectId: project3.id, userId: member.id, type: 'project_created', message: 'Created the project' },
            { projectId: project4.id, userId: admin.id, type: 'task_updated', message: 'Updated task priority to Critical' },
        ],
    });

    // Create notifications
    await prisma.notification.createMany({
        data: [
            { userId: admin.id, type: 'overdue', message: 'Task "Fix login page bug" is overdue', taskId: createdTasks[0].id, projectId: project1.id, taskTitle: 'Fix login page bug', projectName: 'Website Redesign', read: false },
            { userId: admin.id, type: 'overdue', message: 'Task "Update API documentation" is overdue', taskId: createdTasks[1].id, projectId: project2.id, taskTitle: 'Update API documentation', projectName: 'Mobile App v2', read: false },
            { userId: member.id, type: 'overdue', message: 'Task "Security audit report" is overdue', taskId: createdTasks[2].id, projectId: project4.id, taskTitle: 'Security audit report', projectName: 'API Integration', read: false },
            { userId: admin.id, type: 'due_today', message: 'Task "Deploy hotfix to production" is due today', taskId: createdTasks[3].id, projectId: project1.id, taskTitle: 'Deploy hotfix to production', projectName: 'Website Redesign', read: false },
            { userId: admin.id, type: 'member_added', message: 'You were added to "Mobile App v2"', projectId: project2.id, projectName: 'Mobile App v2', read: true },
        ],
    });

    console.log('✅ Activity logs and notifications created');
    console.log('');
    console.log('🎉 Database seeded successfully!');
    console.log('');
    console.log('Demo accounts:');
    console.log('  admin@demo.com  / Demo@123  (admin)');
    console.log('  member@demo.com / Demo@123  (member)');
    console.log('  viewer@demo.com / Demo@123  (viewer)');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
