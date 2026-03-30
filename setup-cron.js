const { exec } = require('child_process');
const cronJob = '0 3 * * * /var/www/brioright/server/scripts/backup.sh >> /var/log/brioright/backup.log 2>&1';

exec('crontab -l', (err, stdout, stderr) => {
    let currentCron = stdout || '';
    if (currentCron.includes('/var/www/brioright/server/scripts/backup.sh')) {
        console.log('Cron job already exists');
        process.exit(0);
    }
    const newCron = currentCron + (currentCron.endsWith('\n') ? '' : '\n') + cronJob + '\n';
    const fs = require('fs');
    fs.writeFileSync('/tmp/newcron', newCron);
    exec('crontab /tmp/newcron', (err, stdout, stderr) => {
        if (err) {
            console.error('Error setting crontab:', err);
            process.exit(1);
        }
        console.log('Cron job scheduled successfully');
        process.exit(0);
    });
});
