import Redis from 'ioredis'

// ── Redis singleton ────────────────────────────────────────────────────────────
// Connects lazily on first use. Falls back to a no-op stub when Redis is
// unavailable so the app keeps running in dev environments without Redis.

let client = null
let _ready = false

function createClient() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379'

    const redis = new Redis(url, {
        // Retry 3 times with short backoff, then give up (don't block startup)
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
            if (times > 3) return null   // stop retrying — let the error propagate
            return Math.min(times * 100, 500)
        },
        lazyConnect: true,
        enableOfflineQueue: false,
        connectTimeout: 3000,
    })

    redis.on('connect', () => {
        _ready = true
        console.log('[Redis] Connected ✅')
    })

    redis.on('ready', () => { _ready = true })

    redis.on('error', (err) => {
        _ready = false
        // Only log the message — avoid spamming stack traces on every retry
        console.warn(`[Redis] ${err.message}`)
    })

    redis.on('close', () => { _ready = false })

    return redis
}

export function getRedis() {
    if (!client) client = createClient()
    return client
}

/** True only after a successful connection handshake */
export function isRedisReady() { return _ready }

// Graceful shutdown — called from index.js
export async function closeRedis() {
    if (client) {
        await client.quit().catch(() => { })
        client = null
        _ready = false
    }
}

export default getRedis
