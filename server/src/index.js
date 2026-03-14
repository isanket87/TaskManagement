import express from 'express' // brioright api v2
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import compression from 'compression'
import helmet from 'helmet'
import path from 'path'
import { fileURLToPath } from 'url'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { createProxyMiddleware } from 'http-proxy-middleware'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// server/.env is the single source of truth for all environments
// In production, server/.env.production can overlay additional values
dotenv.config({ path: path.join(__dirname, '../.env') })
if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: path.join(__dirname, '../.env.production'), override: true })
}

// Limit Prisma connection pool per PM2 cluster instance.
// Default is ~9 per instance; 4 instances × 9 = 36 connections which exhausts PostgreSQL under simultaneous restarts.
// Prisma reads DATABASE_URL lazily at $connect() time, so modifying it here (after dotenv) is safe.
if (process.env.DATABASE_URL) {
    const poolSize = parseInt(process.env.DATABASE_POOL_SIZE || '3')
    const [base, existingQuery] = process.env.DATABASE_URL.split('?')
    const params = new URLSearchParams(existingQuery || '')
    params.set('connection_limit', String(poolSize))
    params.set('pool_timeout', '20')
    process.env.DATABASE_URL = `${base}?${params.toString()}`
}

console.log(`[Env] Loaded environment: ${process.env.NODE_ENV || 'not set'}`)
console.log(`[Env] Database URL host: ${process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : 'none'}`)

// ── Import ALL existing routes ──
import authRoutes from './routes/auth.js'
import workspaceRoutes from './routes/workspaces.js'
import projectRoutes from './routes/projects.js'
import taskRoutes from './routes/tasks.js'
import commentRoutes from './routes/comments.js'
import notificationRoutes from './routes/notifications.js'
import timeRoutes from './routes/timeEntries.js'
import fileRoutes from './routes/files.js'
import channelRoutes from './routes/channels.js'
import attachmentRoutes from './routes/attachments.js'
import notificationPrefRoutes from './routes/notificationPreferences.js'
import healthRoutes from './routes/health.js'
import apiKeyRoutes from './routes/apiKeys.js'
import { getRedis, closeRedis } from './utils/redis.js'

// Middleware and Utils
import prisma from './utils/prisma.js'
import auth from './middleware/auth.js'
import errorHandler from './middleware/errorHandler.js'
import { getTimesheet, exportTimesheet } from './controllers/timeEntryController.js'
import { getOrCreateDM } from './controllers/channelController.js'
import { setSocketIO } from './services/notificationService.js'

// Jobs
import { startDueDateReminderJob } from './jobs/dueDateReminder.js'
import { startDailyDigest } from './jobs/dailyDigest.js'
import { startWeeklyDigest } from './jobs/weeklyDigest.js'
import { startDatabaseBackupJob } from './jobs/databaseBackup.js'
import { runDatabaseBackup } from './services/backupService.js'


const app = express()
const httpServer = createServer(app)

// ── SOCKET.IO ──
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling']
})

// Make io available in route handlers
app.set('io', io)
setSocketIO(io)

// Trust Nginx reverse proxy — required for express-rate-limit and correct IP detection
app.set('trust proxy', 1)

// ── SECURITY ──
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}))

// ── CORS ──
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))

// ── MIDDLEWARE ──
app.use(compression({ level: 6, threshold: 1024 }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())
app.use(morgan('dev'))

// ── ANALYTICS PROXY ──
// Extension-less generic names and content obfuscation to bypass uBlock Origin/Ad-blockers
app.get('/assets/main-runtime-config', async (req, res) => {
    try {
        const gaId = req.query.id;
        if (!gaId) return res.status(400).send('/* missing id */');

        const response = await fetch(`https://www.googletagmanager.com/gtag/js?id=${gaId}`, {
            headers: {
                'User-Agent': req.headers['user-agent'] || '',
                'X-Forwarded-For': req.ip || ''
            }
        });

        let script = await response.text();
        
        // Obfuscate: Rename the global dataLayer to something unique to this app
        // This is a common pattern that ad-blockers look for.
        script = script.replace(/dataLayer/g, 'brioright_data_layer');
        
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.send(script);
    } catch (error) {
        res.status(200).send('/* system config load failed */');
    }
});

app.all('/api/v1/sys/sync-state', async (req, res) => {
    try {
        const urlParams = new URLSearchParams(req.query).toString();
        const targetUrl = `https://www.google-analytics.com/g/collect?${urlParams}`;

        let body = undefined;
        if (req.method === 'POST') {
            body = req.body;
            if (typeof body === 'object') {
                body = JSON.stringify(body);
            }
        }

        const response = await fetch(targetUrl, {
            method: req.method,
            body: body,
            headers: {
                'User-Agent': req.headers['user-agent'] || '',
                'X-Forwarded-For': req.ip || '',
                'Content-Type': req.headers['content-type'] || 'text/plain'
            }
        });

        res.status(response.status).send();
    } catch (error) {
        res.status(200).send();
    }
});

// ── RESPONSE TIMER & DEBUG ──
app.use((req, res, next) => {
    const start = process.hrtime.bigint()

    // Safety for the timing header (must be set before body is sent)
    const originalWriteHead = res.writeHead
    res.writeHead = function (...args) {
        const ms = Number(process.hrtime.bigint() - start) / 1_000_000
        res.setHeader('X-Response-Time', `${ms.toFixed(1)}ms`)
        return originalWriteHead.apply(this, args)
    }

    res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - start) / 1_000_000
        if (ms > 1000) {
            console.warn(`🐢 SLOW: ${req.method} ${req.originalUrl} ${ms.toFixed(0)}ms`)
        }
        if (res.statusCode === 404) {
            console.log(`🔍 404 NOT FOUND: ${req.method} ${req.originalUrl}`)
        }
    })
    next()
})

// ── PING / LIVENESS CHECK ──
// Renamed from /health → /api/ping so the React dashboard at /health
// is served correctly in production (Express was intercepting it first).
// Full metrics are available at /api/health/status.
app.get('/api/ping', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV,
        memory: process.memoryUsage()
    })
})

// ── API ROUTES ──
app.get('/api/users/search', auth, async (req, res, next) => {
    try {
        const { q } = req.query
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { email: { contains: q, mode: 'insensitive' } },
                    { name: { contains: q, mode: 'insensitive' } }
                ]
            },
            select: { id: true, name: true, email: true, avatar: true },
            take: 10
        })
        res.json({ success: true, data: { users } })
    } catch (err) {
        next(err)
    }
})

app.use('/api/auth', authRoutes)
app.use('/api/workspaces', workspaceRoutes)

// Legacy top-level mounts for specific non-scoped calls if any
app.use('/api/notifications', notificationRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/notification-preferences', notificationPrefRoutes)
app.use('/api/health', healthRoutes)   // public — no auth required
app.use('/api/api-keys', apiKeyRoutes) // API key management

// ── SYSTEM TRIGGER ──
app.post('/api/system/backup', auth, async (req, res, next) => {
    try {
        const result = await runDatabaseBackup()
        res.json({ success: true, data: result })
    } catch (err) {
        next(err)
    }
})

// 404 Handler for API routes to help debug
app.use('/api/*', (req, res) => {
    console.log(`🔍 [API 404] No route matched: ${req.method} ${req.originalUrl}`)
    res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` })
})

app.get('/api/direct-messages/:userId', auth, getOrCreateDM)
app.get('/api/timesheets', auth, getTimesheet)
app.get('/api/timesheets/export', auth, exportTimesheet)

// ── SERVE REACT IN PRODUCTION ──
if (process.env.NODE_ENV === 'production') {
    const clientDist = path.join(__dirname, '../../client/dist')
    
    // Serve static assets with long-term caching
    app.use(express.static(clientDist, {
        maxAge: '1y',
        immutable: true,
        index: false // Don't serve index.html via express.static
    }))

    // Serve index.html for all other routes, but NEVER cache it
    app.get('*', (req, res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        res.setHeader('Pragma', 'no-cache')
        res.setHeader('Expires', '0')
        res.sendFile(path.join(clientDist, 'index.html'))
    })
}

// ── ERROR HANDLER ──
app.use((err, req, res, next) => {
    const isDev = process.env.NODE_ENV !== 'production'
    console.error(`❌ [${err.statusCode || 500}] ${err.message}`)
    res.status(err.statusCode || 500).json({
        success: false,
        message: isDev ? err.message : 'Something went wrong',
        ...(isDev && { stack: err.stack })
    })
})
app.use(errorHandler)

// ── SOCKET.IO HANDLERS ──
io.on('connection', (socket) => {
    socket.on('join:workspace', (id) => socket.join(`workspace:${id}`))
    socket.on('join:project', (id) => socket.join(`project:${id}`))
    socket.on('join:channel', (id) => socket.join(`channel:${id}`))

    socket.on('task:updated', (d) => socket.to(`project:${d.projectId}`).emit('task:updated', d))
    socket.on('task:moved', (d) => socket.to(`project:${d.projectId}`).emit('task:moved', d))
    socket.on('task:created', (d) => socket.to(`project:${d.projectId}`).emit('task:created', d))
    socket.on('task:deleted', (d) => socket.to(`project:${d.projectId}`).emit('task:deleted', d))

    socket.on('message:new', (d) => socket.to(`channel:${d.channelId}`).emit('message:new', d))
    socket.on('message:updated', (d) => socket.to(`channel:${d.channelId}`).emit('message:updated', d))
    socket.on('message:deleted', (d) => socket.to(`channel:${d.channelId}`).emit('message:deleted', d))
    socket.on('message:reaction', (d) => socket.to(`channel:${d.channelId}`).emit('message:reaction', d))

    socket.on('typing:start', ({ channelId, user }) => socket.to(`channel:${channelId}`).emit('typing:start', { user }))
    socket.on('typing:stop', ({ channelId, userId }) => socket.to(`channel:${channelId}`).emit('typing:stop', { userId }))

    socket.on('presence:update', (data) => socket.to(`workspace:${data.workspaceId}`).emit('presence:update', data))

    socket.on('disconnect', () => console.log('Socket disconnected:', socket.id))
})

export { io, app, httpServer }

// ── START ──
const PORT = parseInt(process.env.PORT) || 5000

const start = async () => {
    // Skip auto-start if we are in a test environment
    if (process.env.NODE_ENV === 'test') {
        console.log('[Server] Test mode: skipping auto-start')
        return
    }
    try {
        await prisma.$connect()
        console.log('[Server] Database connected')

        // Connect Redis (non-blocking: failures are logged but don't prevent startup)
        try {
            await getRedis().connect()
        } catch (e) {
            console.warn('[Redis] Could not connect on startup — caching disabled:', e.message)
        }

        // Only run cron jobs on PM2 instance 0 (or in dev where NODE_APP_INSTANCE is undefined)
        if (process.env.NODE_APP_INSTANCE === undefined || process.env.NODE_APP_INSTANCE === '0') {
            global._cronJobs = [
                startDueDateReminderJob(io),
                startDailyDigest(),
                startWeeklyDigest(),
                startDatabaseBackupJob()
            ]
        }

        httpServer.listen(PORT, '0.0.0.0', () => {
            console.log(`
  ┌─────────────────────────────────────────┐
  │          🚀 Brioright Server            │
  ├─────────────────────────────────────────┤
  │  Port:     ${PORT}                         │
  │  Env:      ${process.env.NODE_ENV}             │
  │  Health:   /health                      │
  │  PID:      ${process.pid}                    │
  └─────────────────────────────────────────┘
  `)
        })
    } catch (err) {
        console.error('Failed to start:', err)
        process.exit(1)
    }
}

start()

// ── GRACEFUL SHUTDOWN ──
const shutdown = async (signal) => {
    console.log(`\n${signal} — shutting down gracefully...`)
    // Stop all cron jobs so they don't fire during shutdown
    if (global._cronJobs) {
        global._cronJobs.forEach(t => t?.stop())
    }
    // Close Socket.IO first — httpServer.close() won't complete if WS clients are connected
    io.close()
    httpServer.close(async () => {
        await closeRedis()
        await prisma.$disconnect()
        console.log('✅ Shutdown complete')
        process.exit(0)
    })
    setTimeout(() => process.exit(1), 10000)
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('unhandledRejection', (r) => console.error('Unhandled Rejection:', r))
process.on('uncaughtException', (e) => { console.error('Uncaught Exception:', e); process.exit(1) })
