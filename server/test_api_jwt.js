import { signAccessToken } from './src/utils/jwt.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
    const token = signAccessToken({
        id: '1a1f08d3-d35a-4bf7-a4dd-ae15f940d7d5',
        email: 'user1@gmail.com',
        role: 'user',
        name: 'user'
    });

    console.log("Generated token:", token.substring(0, 20) + "...");

    const backupRes = await fetch(`http://localhost:3001/api/system/backup`, {
        method: 'POST',
        headers: {
            'Cookie': `accessToken=${token}`
        }
    });

    const backupData = await backupRes.json();
    console.log('Backup Response payload:', JSON.stringify(backupData, null, 2));
}

run().catch(err => console.error(err));
