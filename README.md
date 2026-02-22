# TaskFlow 🚀

> A full-stack project management SaaS built for
> small teams who move fast.

**🌐 Live Demo:** [taskflow.up.railway.app](https://taskflow.up.railway.app)

![TaskFlow Screenshot](docs/screenshot.png)

## ✨ Features

- 🏢 **Workspaces** — Multi-team with role-based access
- 📋 **Kanban Boards** — Drag-and-drop with real-time sync
- 💬 **Team Chat** — Channels, threads, @mentions, reactions
- ⏱️ **Time Tracking** — Timers, timesheets, billable hours
- 📁 **File Management** — Upload, preview, version control
- 📅 **Smart Due Dates** — Reminders, overdue alerts, calendar
- 🔔 **Notifications** — In-app, email (Resend), Slack
- 📊 **Analytics** — Team velocity, workload, project health
- ⚡ **Performance** — Sub-1s APIs, Redis caching, optimistic UI

## 🛠 Tech Stack

| Layer       | Technologies                                      |
|-------------|---------------------------------------------------|
| Frontend    | React 18, Vite, Tailwind CSS, Framer Motion       |
| State       | Zustand, TanStack Query                           |
| Backend     | Node.js, Express, Socket.io                       |
| Database    | PostgreSQL, Prisma ORM                            |
| Cache       | Redis (ioredis)                                   |
| Auth        | JWT, bcrypt                                       |
| Files       | Cloudinary                                        |
| Email       | Resend                                            |
| Deployment  | Railway                                           |

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis

### Setup

# Clone
git clone https://github.com/YOUR_USERNAME/taskflow.git
cd taskflow

# Server setup
cd server
npm install
cp .env.example .env
# Edit .env with your values

# Client setup
cd ../client
npm install
cp .env.example .env

# Database setup
cd ../server
npx prisma migrate dev
npm run seed

# Start (run in 2 terminals)
cd server && npm run dev     # → localhost:5000
cd client && npm run dev     # → localhost:5173

## 📦 Deployment

Deployed on Railway with:
- Node.js backend service
- React frontend service
- PostgreSQL managed database
- Redis managed cache

## 📄 License
MIT — built as a portfolio project.