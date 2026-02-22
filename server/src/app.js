require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { generalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const commentRoutes = require('./routes/comments');
const notificationRoutes = require('./routes/notifications');
const attachmentRoutes = require('./routes/attachments');
const channelRoutes = require('./routes/channels');
const timeEntryRoutes = require('./routes/timeEntries');
const fileRoutes = require('./routes/files');
const notifPrefRoutes = require('./routes/notificationPreferences');
const workspaceRoutes = require('./routes/workspaces');
const { getDashboardStats } = require('./controllers/taskController');
const { getProjectFiles, getTaskFiles } = require('./controllers/fileController');
const { getTimeEntries: getProjectTimeEntries } = require('./controllers/timeEntryController');
const { getTimesheet, exportTimesheet } = require('./controllers/timeEntryController');
const auth = require('./middleware/auth');
const { requireWorkspace } = require('./middleware/workspace');

const app = express();

// Security — allow file serving
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
}));

// Logging & parsing
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(generalLimiter);

// User search route
app.get('/api/users/search', auth, async (req, res, next) => {
    try {
        const prisma = require('./utils/prisma');
        const { q } = req.query;
        const users = await prisma.user.findMany({
            where: { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] },
            select: { id: true, name: true, email: true, avatar: true },
            take: 10,
        });
        res.json({ success: true, data: { users } });
    } catch (err) { next(err); }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);

// The remaining project, task, and analytics routes are accessed via the Workspace parent router (e.g. /workspaces/:slug/projects) 

// New routes
app.get('/api/direct-messages/:userId', auth, require('./controllers/channelController').getOrCreateDM);
app.get('/api/timesheets', auth, getTimesheet);
app.get('/api/timesheets/export', auth, exportTimesheet);
app.use('/api/files', fileRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ success: true, message: 'Server running' }));

// Error handler
app.use(errorHandler);

module.exports = app;
