const email = 'user1@gmail.com';
const password = 'password123';
const baseUrl = 'http://localhost:3001/api';

async function run() {
    console.log('Logging in...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    console.log('Login:', loginData.status);

    const cookies = loginRes.headers.get('set-cookie');

    console.log('Fetching projects...');
    const projRes = await fetch(`${baseUrl}/workspaces/project-management/projects`, {
        headers: {
            'Cookie': cookies
        }
    });

    const projData = await projRes.json();
    console.log('Projects payload:', JSON.stringify(projData, null, 2));
}

run().catch(err => console.error(err));
