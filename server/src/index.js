require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { generalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// ── Existing Route Imports ──
const authRoutes = require('./routes/auth');
const workspaceRoutes = require('./routes/workspaces');
const fileRoutes = require('./routes/files');
const auth = require('./middleware/auth');
const { getTimesheet, exportTimesheet } = require('./controllers/timeEntryController');

const prisma = require('./utils/prisma');

const app = express();
const httpServer = createServer(app);

// ── SOCKET.IO (supports WebSockets on Railway) ──
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Make io available in route handlers
app.set('io', io);

// ── SECURITY ──
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// ── CORS ──
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── COMPRESSION ──
app.use(compression({ level: 6, threshold: 1024 }));

// ── BODY PARSING ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(generalLimiter);

// ── RESPONSE TIMING ──
app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
        res.setHeader('X-Response-Time', `${ms.toFixed(1)}ms`);
        if (ms > 1000) {
            console.warn(`🐢 SLOW API: ${req.method} ${req.path} ${ms.toFixed(0)}ms`);
        }
    });
    next();
});

// ── HEALTH CHECK ──
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0'
    });
});

// ── EXISTING ROUTES ──
app.get('/api/users/search', auth, async (req, res, next) => {
    try {
        const { q } = req.query;
        const users = await prisma.user.findMany({
            where: { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] },
            select: { id: true, name: true, email: true, avatar: true },
            take: 10,
        });
        res.json({ success: true, data: { users } });
    } catch (err) { next(err); }
});

app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);

app.get('/api/direct-messages/:userId', auth, require('./controllers/channelController').getOrCreateDM);
app.get('/api/timesheets', auth, getTimesheet);
app.get('/api/timesheets/export', auth, exportTimesheet);
app.use('/api/files', fileRoutes);
app.get('/api/health', (req, res) => res.json({ success: true, message: 'Server running' }));

// ── SERVE REACT IN PRODUCTION ──
if (process.env.NODE_ENV === 'production') {
    const clientDist = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientDist, {
        maxAge: '1y',
        etag: false
    }));
    app.get('*', (req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'));
    });
}

// ── GLOBAL ERROR HANDLER ──
app.use((err, req, res, next) => {
    const isDev = process.env.NODE_ENV !== 'production';
    console.error(`❌ Error [${err.statusCode || 500}]:`, err.message);

    res.status(err.statusCode || 500).json({
        success: false,
        message: isDev ? err.message : 'Something went wrong',
        ...(isDev && { stack: err.stack })
    });
});
app.use(errorHandler);

// ── SOCKET.IO EVENT HANDLERS (merged with existing) ──
const socketHandler = require('./socket/socketHandler');
socketHandler(io); // Existing handlers
const { setSocketIO } = require('./services/notificationService');
setSocketIO(io);

io.on('connection', (socket) => {
    // Join rooms
    socket.on('join:workspace', (id) => socket.join(`workspace:${id}`));
    socket.on('join:project', (id) => socket.join(`project:${id}`));
    socket.on('join:channel', (id) => socket.join(`channel:${id}`));

    // Task events
    socket.on('task:updated', (data) => socket.to(`project:${data.projectId}`).emit('task:updated', data));
    socket.on('task:moved', (data) => socket.to(`project:${data.projectId}`).emit('task:moved', data));
    socket.on('task:created', (data) => socket.to(`project:${data.projectId}`).emit('task:created', data));
    socket.on('task:deleted', (data) => socket.to(`project:${data.projectId}`).emit('task:deleted', data));

    // Chat events
    socket.on('message:new', (data) => socket.to(`channel:${data.channelId}`).emit('message:new', data));
    socket.on('message:updated', (data) => socket.to(`channel:${data.channelId}`).emit('message:updated', data));
    socket.on('message:deleted', (data) => socket.to(`channel:${data.channelId}`).emit('message:deleted', data));
    socket.on('message:reaction', (data) => socket.to(`channel:${data.channelId}`).emit('message:reaction', data));

    // Typing indicators
    socket.on('typing:start', ({ channelId, user }) => socket.to(`channel:${channelId}`).emit('typing:start', { user }));
    socket.on('typing:stop', ({ channelId, userId }) => socket.to(`channel:${channelId}`).emit('typing:stop', { userId }));

    // Presence
    socket.on('presence:update', (data) => socket.to(`workspace:${data.workspaceId}`).emit('presence:update', data));

    socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

module.exports.io = io;

// ── START SERVER ──
const PORT = parseInt(process.env.PORT) || 5000;

const { startDueDateReminderJob } = require('./jobs/dueDateReminder');
const { startDailyDigest } = require('./jobs/dailyDigest');
const { startWeeklyDigest } = require('./jobs/weeklyDigest');

const start = async () => {
    try {
        if (process.env.NODE_ENV === 'production' && process.env.RAILWAY_ENVIRONMENT) {
            const { execSync } = require('child_process');
            execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        }

        await prisma.$connect();
        console.log('[Server] Database connected');
        startDueDateReminderJob(io);
        startDailyDigest();
        startWeeklyDigest();

        httpServer.listen(PORT, '0.0.0.0', () => {
            console.log(`
          ┌─────────────────────────────────────────┐
          │          🚀 TaskFlow Server             │
          ├─────────────────────────────────────────┤
          │  Port:        ${PORT}                      │
          │  Environment: ${process.env.NODE_ENV || 'development'}            │
          │  Health:      http://localhost:${PORT}/health│
          └─────────────────────────────────────────┘
          `);
        });
    } catch (err) {
        console.error('Failed to start:', err);
        process.exit(1);
    }
};

start();

// ── GRACEFUL SHUTDOWN ──
const shutdown = async (signal) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    httpServer.close(async () => {
        try {
            await prisma.$disconnect();
            console.log('✅ Database disconnected cleanly');
        } catch (e) {
            console.error('Error during shutdown:', e);
        }
        process.exit(0);
    });
    setTimeout(() => {
        console.error('⚠️ Force shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
