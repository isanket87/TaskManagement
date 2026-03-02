import { spawn } from 'child_process';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';

// Reusing R2 client setup from r2Service.js but utilizing @aws-sdk/lib-storage 
// for streaming large files without holding them entirely in memory.
const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

const BUCKET = process.env.R2_BUCKET_NAME;

/**
 * Creates a PostgreSQL database backup and uploads it to Cloudflare R2
 * @returns {Promise<{ success: boolean, key?: string, error?: string }>}
 */
export const runDatabaseBackup = async () => {
    return new Promise(async (resolve, reject) => {
        console.log('[Backup] Starting PostgreSQL database backup...');

        // Parse connection string
        // Ex: postgresql://postgres:root@localhost:5432/project_management?schema=public
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            console.error('[Backup] No DATABASE_URL found in environment variables.');
            return reject('DATABASE_URL is missing');
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(dbUrl);
        } catch (e) {
            console.error('[Backup] Failed to parse DATABASE_URL', e);
            return reject('Invalid DATABASE_URL format');
        }

        const username = decodeURIComponent(parsedUrl.username || '');
        const password = decodeURIComponent(parsedUrl.password || '');
        const host = parsedUrl.hostname;
        const port = parsedUrl.port || '5432';
        const database = parsedUrl.pathname.replace(/^\//, ''); // Remove leading slash

        // Format filename: brioright-db-backup-2025-05-15T12-30-00Z.sql.gz
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `brioright-db-backup-${timestamp}.sql.gz`;
        const s3Key = `backups/${filename}`;

        console.log(`[Backup] Host: ${host}, Database: ${database}`);

        // Construct pg_dump command arguments
        // Custom format (-Fc) is usually better, but for simplicity we'll use plain SQL compressed with gzip natively by pg_dump
        // -Z 9 gives maximum gzip compression
        const pgDumpArgs = [
            '--host', host,
            '--port', port,
            '--username', username,
            '--no-password', // We pass password via env var
            '--format=custom', // Custom format is smaller and safer to restore via pg_restore
            '--compress=9',    // Max gzip compression
            database
        ];

        // Ensure env has PGPASSWORD for pg_dump to read automatically without prompting
        const env = { ...process.env, PGPASSWORD: password };

        console.log('[Backup] Invoking pg_dump...');

        const pgDumpCmd = process.env.PG_DUMP_PATH || 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe';

        // Spawn pg_dump process
        const dumpProcess = spawn(pgDumpCmd, pgDumpArgs, { env });

        // Stream handling: pg_dump stdout -> S3 Upload
        try {
            // We use @aws-sdk/lib-storage Upload class which allows streaming directly to S3/R2
            // Since pg_dump standard output is a readable stream, we can pipe it seamlessly!
            const uploadToR2 = new Upload({
                client: r2Client,
                params: {
                    Bucket: BUCKET,
                    Key: s3Key,
                    Body: dumpProcess.stdout, // Stream dumped rows directly into R2
                },
            });

            uploadToR2.on('httpUploadProgress', (progress) => {
                if (progress.loaded) {
                    const mb = (progress.loaded / (1024 * 1024)).toFixed(2);
                    console.log(`[Backup] Upload progress: ${mb} MB`);
                }
            });

            // Handle dump process exit
            dumpProcess.on('exit', (code, signal) => {
                if (code !== 0) {
                    console.error(`[Backup] pg_dump exited with code ${code} and signal ${signal}`);
                    return reject(`pg_dump failed with code ${code}`);
                }
                console.log('[Backup] pg_dump process finished successfully.');
            });

            dumpProcess.stderr.on('data', (data) => {
                console.warn(`[Backup - pg_dump stderr]: ${data.toString()}`);
            });

            dumpProcess.on('error', (err) => {
                console.error('[Backup] Failed to start pg_dump process. Is it installed in the system PATH?', err);
                reject(err);
            });

            console.log('[Backup] Upload streaming started...');

            // Wait for upload to complete
            const uploadResult = await uploadToR2.done();

            console.log(`[Backup] Successfully uploaded backup to R2: ${s3Key}`);
            resolve({ success: true, key: s3Key, result: uploadResult });

        } catch (err) {
            console.error('[Backup] Upload to R2 failed', err);
            reject(err);
        }
    });
};
