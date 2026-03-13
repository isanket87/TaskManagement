import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'Brioright',
                short_name: 'Brioright',
                description: 'Brioright — One workspace for tasks, chat, time & files.',
                theme_color: '#3b82f6',
                background_color: '#ffffff',
                display: 'standalone',
                icons: [
                    {
                        src: 'pwa-192x192.svg',
                        sizes: '192x192',
                        type: 'image/svg+xml',
                        purpose: 'any maskable'
                    },
                    {
                        src: 'pwa-512x512.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml',
                        purpose: 'any maskable'
                    }
                ]
            }
        })
    ],
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
