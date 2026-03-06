import { getRedis, isRedisReady } from './redis.js'

// ── Cache helpers ──────────────────────────────────────────────────────────────
// All methods are no-ops when Redis is not available — zero impact on dev.

const cache = {
    /**
     * Get and JSON-parse a cached value.
     * Returns null on miss, Redis unavailability, or parse error.
     */
    async get(key) {
        if (!isRedisReady()) return null
        try {
            const raw = await getRedis().get(key)
            return raw ? JSON.parse(raw) : null
        } catch { return null }
    },

    /**
     * JSON-stringify and store a value with a TTL.
     * @param {string}  key
     * @param {*}       value   — any JSON-serialisable value
     * @param {number}  ttlSec  — seconds until expiry
     */
    async set(key, value, ttlSec = 60) {
        if (!isRedisReady()) return
        try {
            await getRedis().set(key, JSON.stringify(value), 'EX', ttlSec)
        } catch { /* non-fatal */ }
    },

    /**
     * Delete one or more exact keys.
     */
    async del(...keys) {
        if (!isRedisReady() || !keys.length) return
        try {
            await getRedis().del(...keys)
        } catch { /* non-fatal */ }
    },

    /**
     * SCAN + delete all keys matching a glob pattern.
     * Use sparingly — scans the keyspace.
     * Example pattern: "ws:abc123:*"
     */
    async delPattern(pattern) {
        if (!isRedisReady()) return
        try {
            const redis = getRedis()
            let cursor = '0'
            do {
                const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
                cursor = nextCursor
                if (keys.length) await redis.del(...keys)
            } while (cursor !== '0')
        } catch { /* non-fatal */ }
    },

    /**
     * Get-or-set shorthand.
     * If the key is cached, return it. Otherwise call fn(), cache the result, and return it.
     *
     * @param {string}        key
     * @param {number}        ttlSec
     * @param {() => Promise} fn     — async factory for the fresh value
     */
    async wrap(key, ttlSec, fn) {
        const cached = await cache.get(key)
        if (cached !== null) return cached
        const fresh = await fn()
        await cache.set(key, fresh, ttlSec)
        return fresh
    },
}

export default cache

// ── TTL constants (seconds) ────────────────────────────────────────────────────
export const TTL = {
    DASHBOARD: 30,    // dashboard stats — short TTL, highly dynamic
    PROJECTS: 60,    // projects list — changes when projects are added/renamed
    WORKSPACES: 60,    // my workspaces list
    WORKSPACE: 120,   // single workspace detail
    MEMBERS: 300,   // member lists — rarely change
    ANALYTICS: 300,   // heavy aggregation queries
}
