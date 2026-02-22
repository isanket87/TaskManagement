const { execSync } = require('child_process');

function killProcess(query) {
    try {
        const output = execSync(`wmic process where "commandline like '%${query}%'" get processid`).toString();
        const pids = output.match(/\d+/g);
        if (pids) {
            pids.forEach(pid => {
                if (pid !== process.pid.toString()) {
                    try {
                        execSync(`taskkill /F /PID ${pid}`);
                        console.log(`Killed PID ${pid} for query ${query}`);
                    } catch (e) { }
                }
            });
        }
    } catch (e) {
        // Just ignore
    }
}

killProcess('nodemon');
killProcess('server.js');

try {
    // Also try checking the port 3001
    const netstat = execSync('netstat -ano | findstr :3001').toString();
    const portPid = netstat.split('\n')[0].match(/\d+$/);
    if (portPid && portPid[0]) {
        execSync(`taskkill /F /PID ${portPid[0]}`);
        console.log(`Killed PID ${portPid[0]} bounded to port 3001`);
    }
} catch (e) { }

console.log('Killed backend processes. Proceeding to push DB...');

try {
    execSync('npx dotenv-cli -e ../.env.development -- npx prisma db push', { stdio: 'inherit' });
    console.log('DB push successful!');
} catch (e) {
    console.error('Failed to push DB', e.message);
}
