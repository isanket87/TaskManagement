import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
    plugins: [
        react(),
        // VitePWA plugin disabled to fix preload/caching issues
        /*
        VitePWA({
            registerType: 'autoUpdate',
            ...
        })
        */
    ],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.js',
    },
    server: {
        proxy: mode === 'development' ? {
            '/api': { target: 'http://localhost:3001', changeOrigin: true },
            '/socket.io': {
                target: 'http://localhost:3001',
                ws: true,
                changeOrigin: true,
                configure: (proxy) => {
                    proxy.on('error', () => { }); // suppress ECONNREFUSED log spam on startup
                }
            }
        } : {}
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    router: ['react-router-dom'],
                    query: ['@tanstack/react-query'],
                    ui: ['framer-motion', 'lucide-react']
                }
            }
        }
    }
}))
