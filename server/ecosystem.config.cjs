module.exports = {
    apps: [
        {
            name: 'brioright-api',
            script: './src/index.js',
            instances: 4,
            exec_mode: 'cluster',
            autorestart: true,
            watch: false,
            kill_timeout: 5000,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'development'
            },
            env_production: {
                NODE_ENV: 'production'
            }
        }
    ]
};
