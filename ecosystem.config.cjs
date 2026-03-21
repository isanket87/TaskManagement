module.exports = {
    apps: [
        {
            name: 'brioright-api',
            cwd: './server',
            script: 'src/index.js',
            interpreter: 'node',
            instances: 2,               
            exec_mode: 'cluster',       
            watch: false,               
            max_memory_restart: '500M', 
            node_args: '--max-old-space-size=450',
            wait_ready: true,           // Wait for process.send('ready')
            listen_timeout: 10000,      // Wait 10s for ready signal
            kill_timeout: 5000,         // Wait 5s before force kill
            env_production: {
                NODE_ENV: 'production',
                PORT: 5000
            },
            error_file: '/var/log/brioright/error.log',
            out_file: '/var/log/brioright/out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            merge_logs: true,
            autorestart: true,
            restart_delay: 3000
        }
    ]
}
