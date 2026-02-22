const { PrismaClient } = require('@prisma/client');
const { successResponse, errorResponse } = require('../utils/helpers');
const { startOfWeek, endOfWeek, startOfDay, endOfDay, parseISO, format } = require('date-fns');

const prisma = new PrismaClient();

// GET /api/time-entries
const getTimeEntries = async (req, res, next) => {
    try {
        const { projectId, taskId, from, to, billable } = req.query;
        const where = { userId: req.user.id };
        if (projectId) where.projectId = projectId;
        if (taskId) where.taskId = taskId;
        if (from || to) where.startTime = {};
        if (from) where.startTime.gte = new Date(from);
        if (to) where.startTime.lte = new Date(to);
        if (billable !== undefined) where.billable = billable === 'true';

        const entries = await prisma.timeEntry.findMany({
            where,
            orderBy: { startTime: 'desc' },
            include: {
                project: { select: { id: true, name: true, color: true } },
                task: { select: { id: true, title: true } },
            },
        });
        return successResponse(res, { entries });
    } catch (err) { next(err); }
};

// GET /api/time-entries/active
const getActive = async (req, res, next) => {
    try {
        const entry = await prisma.timeEntry.findFirst({
            where: { userId: req.user.id, endTime: null },
            include: {
                project: { select: { id: true, name: true, color: true } },
                task: { select: { id: true, title: true } },
            },
        });
        return successResponse(res, { entry });
    } catch (err) { next(err); }
};

// POST /api/time-entries — start a timer OR create manual entry
const createEntry = async (req, res, next) => {
    try {
        const { description, projectId, taskId, billable = false, hourlyRate, startTime, endTime } = req.body;
        if (!projectId) return errorResponse(res, 'projectId required', 400);

        // Enforce single active timer
        const existing = await prisma.timeEntry.findFirst({ where: { userId: req.user.id, endTime: null } });
        if (existing && !endTime) {
            // Auto-stop the running one first
            const dur = Math.round((Date.now() - new Date(existing.startTime).getTime()) / 1000);
            await prisma.timeEntry.update({
                where: { id: existing.id },
                data: { endTime: new Date(), duration: dur },
            });
        }

        const start = startTime ? new Date(startTime) : new Date();
        const end = endTime ? new Date(endTime) : null;
        const duration = end ? Math.round((end.getTime() - start.getTime()) / 1000) : null;

        const entry = await prisma.timeEntry.create({
            data: { description, projectId, taskId: taskId || null, userId: req.user.id, billable, hourlyRate, startTime: start, endTime: end, duration },
            include: {
                project: { select: { id: true, name: true, color: true } },
                task: { select: { id: true, title: true } },
            },
        });

        return successResponse(res, { entry }, 'Timer started', 201);
    } catch (err) { next(err); }
};

// PATCH /api/time-entries/:id/stop
const stopTimer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const entry = await prisma.timeEntry.findUnique({ where: { id } });
        if (!entry || entry.userId !== req.user.id) return errorResponse(res, 'Not found', 404);
        if (entry.endTime) return errorResponse(res, 'Timer already stopped', 400);

        const now = new Date();
        const duration = Math.round((now.getTime() - new Date(entry.startTime).getTime()) / 1000);

        const updated = await prisma.timeEntry.update({
            where: { id },
            data: { endTime: now, duration },
            include: {
                project: { select: { id: true, name: true, color: true } },
                task: { select: { id: true, title: true } },
            },
        });

        return successResponse(res, { entry: updated }, 'Timer stopped');
    } catch (err) { next(err); }
};

// PUT /api/time-entries/:id
const updateEntry = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { description, billable, hourlyRate, startTime, endTime } = req.body;
        const entry = await prisma.timeEntry.findUnique({ where: { id } });
        if (!entry || entry.userId !== req.user.id) return errorResponse(res, 'Not found', 404);

        const start = startTime ? new Date(startTime) : entry.startTime;
        const end = endTime ? new Date(endTime) : entry.endTime;
        const duration = start && end ? Math.round((end.getTime() - start.getTime()) / 1000) : entry.duration;

        const updated = await prisma.timeEntry.update({
            where: { id },
            data: { description, billable, hourlyRate, startTime: start, endTime: end, duration },
            include: {
                project: { select: { id: true, name: true, color: true } },
                task: { select: { id: true, title: true } },
            },
        });
        return successResponse(res, { entry: updated });
    } catch (err) { next(err); }
};

// DELETE /api/time-entries/:id
const deleteEntry = async (req, res, next) => {
    try {
        const { id } = req.params;
        const entry = await prisma.timeEntry.findUnique({ where: { id } });
        if (!entry || entry.userId !== req.user.id) return errorResponse(res, 'Not found', 404);
        await prisma.timeEntry.delete({ where: { id } });
        return successResponse(res, null, 'Deleted');
    } catch (err) { next(err); }
};

// GET /api/time-entries/summary
const getSummary = async (req, res, next) => {
    try {
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        const dayStart = startOfDay(now);
        const dayEnd = endOfDay(now);

        const base = { userId: req.user.id, endTime: { not: null } };

        // All aggregations run in parallel — no full row fetches needed
        const [todayAgg, weekAgg, billableAgg, projectsCount] = await Promise.all([
            prisma.timeEntry.aggregate({
                where: { ...base, startTime: { gte: dayStart, lte: dayEnd } },
                _sum: { duration: true },
            }),
            prisma.timeEntry.aggregate({
                where: { ...base, startTime: { gte: weekStart, lte: weekEnd } },
                _sum: { duration: true },
            }),
            prisma.timeEntry.aggregate({
                where: { ...base, billable: true, startTime: { gte: weekStart, lte: weekEnd } },
                _sum: { duration: true },
            }),
            prisma.timeEntry.groupBy({
                by: ['projectId'],
                where: { ...base, startTime: { gte: weekStart, lte: weekEnd } },
            }),
        ]);

        return successResponse(res, {
            todaySeconds: todayAgg._sum.duration || 0,
            weekSeconds: weekAgg._sum.duration || 0,
            billableSeconds: billableAgg._sum.duration || 0,
            projectCount: projectsCount.length,
        });
    } catch (err) { next(err); }
};

// GET /api/timesheets?week=2025-W08
const getTimesheet = async (req, res, next) => {
    try {
        const { week } = req.query;
        let weekStart;
        if (week) {
            const [year, wk] = week.split('-W');
            const jan4 = new Date(parseInt(year), 0, 4);
            const dayOfWeek = jan4.getDay() || 7;
            weekStart = new Date(jan4.getTime() - (dayOfWeek - 1) * 86400000 + (parseInt(wk) - 1) * 7 * 86400000);
        } else {
            weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        }
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

        const entries = await prisma.timeEntry.findMany({
            where: { userId: req.user.id, startTime: { gte: weekStart, lte: weekEnd } },
            orderBy: { startTime: 'asc' },
            include: {
                project: { select: { id: true, name: true, color: true } },
                task: { select: { id: true, title: true } },
            },
        });

        // Group by day
        const grouped = {};
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart.getTime() + i * 86400000);
            const key = format(day, 'yyyy-MM-dd');
            grouped[key] = { date: day, entries: [], totalSeconds: 0 };
        }
        entries.forEach(e => {
            const key = format(new Date(e.startTime), 'yyyy-MM-dd');
            if (grouped[key]) {
                grouped[key].entries.push(e);
                grouped[key].totalSeconds += e.duration || 0;
            }
        });

        return successResponse(res, { weekStart, weekEnd, days: Object.values(grouped) });
    } catch (err) { next(err); }
};

// GET /api/timesheets/export?format=csv
const exportTimesheet = async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const where = { userId: req.user.id };
        if (from) where.startTime = { ...where.startTime, gte: new Date(from) };
        if (to) where.startTime = { ...where.startTime, lte: new Date(to) };

        const entries = await prisma.timeEntry.findMany({
            where,
            orderBy: { startTime: 'asc' },
            include: {
                project: { select: { name: true } },
                task: { select: { title: true } },
                user: { select: { name: true } },
            },
        });

        const header = 'Date,Start Time,End Time,Duration (min),Description,Project,Task,User,Billable\n';
        const rows = entries.map(e => [
            format(new Date(e.startTime), 'yyyy-MM-dd'),
            format(new Date(e.startTime), 'HH:mm'),
            e.endTime ? format(new Date(e.endTime), 'HH:mm') : '',
            e.duration ? Math.round(e.duration / 60) : '',
            `"${(e.description || '').replace(/"/g, '""')}"`,
            `"${e.project.name}"`,
            `"${e.task?.title || ''}"`,
            `"${e.user.name}"`,
            e.billable ? 'Yes' : 'No',
        ].join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="timesheet.csv"');
        res.send(header + rows);
    } catch (err) { next(err); }
};

module.exports = { getTimeEntries, getActive, createEntry, stopTimer, updateEntry, deleteEntry, getSummary, getTimesheet, exportTimesheet };
