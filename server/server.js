const path = require('path');
const dotenv = require('dotenv');

// Load environment-specific file first
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: path.join(__dirname, `../${envFile}`) });

// Load default .env as fallback for any missing shared variables
dotenv.config({ path: path.join(__dirname, '../.env') });
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const socketHandler = require('./src/socket/socketHandler');
const { startDueDateReminderJob } = require('./src/jobs/dueDateReminder');
const { startDailyDigest } = require('./src/jobs/dailyDigest');
const { startWeeklyDigest } = require('./src/jobs/weeklyDigest');
const { setSocketIO } = require('./src/services/notificationService');
const prisma = require('./src/utils/prisma');
const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true,
    },
});

// Make io available in route handlers
app.set('io', io);

// Initialize Socket.io handler
socketHandler(io);

// Initialize notification service with socket
setSocketIO(io);

const start = async () => {
    try {
        // Run migrations in production
        if (process.env.NODE_ENV === 'production') {
            const { execSync } = require('child_process');
            execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        }

        await prisma.$connect();
        console.log('[Server] Database connected');

        // Start cron jobs
        startDueDateReminderJob(io);
        startDailyDigest();
        startWeeklyDigest();


        server.listen(PORT, () => {
            console.log(`[Server] Running on http://localhost:${PORT}`);
            console.log(`[Server] Environment: ${process.env.NODE_ENV}`);
        });
    } catch (err) {
        console.error('[Server] Failed to start:', err);
        process.exit(1);
    }
};

start();
