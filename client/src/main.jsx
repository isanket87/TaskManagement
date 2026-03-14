import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Auto-recover from stale chunk hashes after a new deployment.
window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    if (msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Importing a module script failed')) {
        const lastReload = sessionStorage.getItem('chunk_reload_at');
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload) > 10_000) {
            sessionStorage.setItem('chunk_reload_at', String(now));
            window.location.reload();
        }
    }
});

// PWA Service Worker Registration & Auto-Update
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then(registration => {
                console.log('SW registered:', registration);
                // If there's an updated service worker waiting, skip waiting and reload
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('New content available, reloading...');
                            window.location.reload();
                        }
                    });
                });
            })
            .catch(error => console.error('SW registration failed:', error));
    });
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
