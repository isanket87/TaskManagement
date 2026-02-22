const { execSync } = require('child_process');

try {
    console.log('Pushing Prisma schema to local database...');
    execSync('npx prisma db push --skip-generate', {
        stdio: 'inherit',
        env: {
            ...process.env,
            DATABASE_URL: "postgresql://postgres:root@localhost:5432/project_management?schema=public",
            DIRECT_URL: "postgresql://postgres:root@localhost:5432/project_management?schema=public"
        }
    });
    console.log('Successfully pushed schema to local database!');
} catch (e) {
    console.error('Failed:', e.message);
}
