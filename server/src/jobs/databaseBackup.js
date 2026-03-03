import cron from 'node-cron';
import { runDatabaseBackup } from '../services/backupService.js';

export const startDatabaseBackupJob = () => {
    console.log('[CronJob] Database backup job started — runs daily at 03:00 UTC');

    // Run every day at 03:00 AM UTC
    const task = cron.schedule('0 3 * * *', async () => {
        const now = new Date();
        console.log(`[CronJob] Running database backup at ${now.toISOString()}`);

        try {
            const result = await runDatabaseBackup();
            if (result.success) {
                console.log('[CronJob] Database backup completed successfully:', result.key);
            }
        } catch (err) {
            console.error('[CronJob] Error in database backup job:', err);
            // Here we could add an email alert to the admin about the backup failure
        }
    });

    return task;
};
