import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
    console.log("Starting direct backup invocation...");
    try {
        const { runDatabaseBackup } = await import('./src/services/backupService.js');
        const result = await runDatabaseBackup();
        console.log("Direct backup succeeded!", result);
    } catch (err) {
        console.error("Direct backup failed:", err);
    }
}

run();
