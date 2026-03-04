import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Auto-recover from stale chunk hashes after a new deployment.
// When the browser has a cached index.html pointing to old asset hashes
// that no longer exist on the server, dynamically imported chunks will
// fail to load. We reload once to get the fresh index.html + new hashes.
window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    if (msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Importing a module script failed')) {
        const lastReload = sessionStorage.getItem('chunk_reload_at');
        const now = Date.now();
        // Throttle to once per 10 seconds to avoid infinite reload loops
        if (!lastReload || now - parseInt(lastReload) > 10_000) {
            sessionStorage.setItem('chunk_reload_at', String(now));
            window.location.reload();
        }
    }
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
