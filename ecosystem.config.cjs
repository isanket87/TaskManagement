module.exports = {
    apps: [
        {
            name: 'brioright-api',
            cwd: './server',
            script: 'src/index.js',
            interpreter: 'node',
            instances: 2,               // 2 instances fit a 3.8 GB VPS alongside PostgreSQL + Nginx.
            exec_mode: 'cluster',       // Cluster mode for multi-core
            watch: false,               // Don't watch files in production
            max_memory_restart: '400M', // Restart if RAM exceeds 400MB
            node_args: '--max-old-space-size=350', // Hard cap on V8 heap
            env_production: {
                NODE_ENV: 'production',
                PORT: 5000
            },
            error_file: '/var/log/brioright/error.log',
            out_file: '/var/log/brioright/out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            merge_logs: true,
            // Auto restart settings
            autorestart: true,
            restart_delay: 3000,
            max_restarts: 10,
            min_uptime: '10s'
        }
    ]
}
