import express from 'express'
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

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// server/.env is the single source of truth for all environments
// In production, server/.env.production can overlay additional values
dotenv.config({ path: path.join(__dirname, '../.env') })
if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: path.join(__dirname, '../.env.production'), override: true })
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

// ── HEALTH CHECK ──
app.get('/health', (req, res) => {
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
    app.use(express.static(clientDist, {
        maxAge: '1y',
        etag: false
    }))
    app.get('*', (req, res) => {
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

export { io }

// ── START ──
const PORT = parseInt(process.env.PORT) || 5000

const start = async () => {
    try {
        await prisma.$connect()
        console.log('[Server] Database connected')

        startDueDateReminderJob(io)
        startDailyDigest()
        startWeeklyDigest()

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
    httpServer.close(async () => {
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
