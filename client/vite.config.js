import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    plugins: [
        react(),
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
    },
    define: {
        // Force-inject critical IDs and URLs at build time. 
        // This is the most reliable way to ensure they are picked up by the client-side code
        // and bypasses potential .env loading issues on the VPS.
        'import.meta.env.VITE_GA_TRACKING_ID': JSON.stringify(process.env.VITE_GA_TRACKING_ID || 'G-P5NHCX77XB'),
        'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(process.env.VITE_GOOGLE_CLIENT_ID || '120937748446-lk6idvcr4p87ht89idvk89idv.apps.googleusercontent.com'),
        'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || (mode === 'production' ? 'https://brioright.online/api' : ''))
    }
}))
