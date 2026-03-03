import { PrismaClient } from '@prisma/client'

// In PM2 cluster mode, each instance creates its own PrismaClient with its own connection pool.
// Default pool size is ~9 per instance → 4 instances × 9 = 36 connections.
// We cap it at a lower value so all instances share the DB safely.
// Override with DATABASE_POOL_SIZE env var if needed.
const poolSize = parseInt(process.env.DATABASE_POOL_SIZE || '3')

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL
                ? `${process.env.DATABASE_URL.split('?')[0]}?connection_limit=${poolSize}&pool_timeout=20`
                : undefined
        }
    }
})

export default prisma
