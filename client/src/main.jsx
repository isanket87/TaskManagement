import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Auto-recover from stale chunk hashes after a new deployment.
window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    if (msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('error loading dynamically imported module') ||
        msg.includes('Importing a module script failed')) {
        const lastReload = sessionStorage.getItem('chunk_reload_at');
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload) > 10_000) {
            sessionStorage.setItem('chunk_reload_at', String(now));
            window.location.reload();
        }
    }
});

// ── EMERGENCY CACHE CLEAR ──
// Run this once to kill any rogue service workers and clear old caches
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
            registration.unregister();
        }
    });
}
if ('caches' in window) {
    caches.keys().then((names) => {
        for (let name of names) caches.delete(name);
    });
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
