module.exports = {
    apps: [
        {
            name: 'brioright-api',
            script: './src/index.js',

            // 2 instances fit a 3.8 GB VPS alongside PostgreSQL + Nginx.
            // 4 instances allowed each to balloon to 1 GB before restart → OOM.
            instances: 2,
            exec_mode: 'cluster',

            autorestart: true,
            watch: false,
            kill_timeout: 5000,

            // Restart an instance once it exceeds 400 MB.
            // Keeps total Node.js footprint under ~800 MB.
            max_memory_restart: '400M',

            // Hard cap on the V8 heap per instance.
            // Triggers GC earlier and prevents silent runaway leaks.
            node_args: '--max-old-space-size=350',

            env: {
                NODE_ENV: 'development'
            },
            env_production: {
                NODE_ENV: 'production'
            }
        }
    ]
};
