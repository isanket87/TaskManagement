import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

const trackingId = import.meta.env.VITE_GA_TRACKING_ID;

const AnalyticsTracker = () => {
    const location = useLocation();
    const isInitialized = useRef(false);

    useEffect(() => {
        // Skip analytics if no tracking ID is provided
        if (!trackingId) {
            console.warn('[Analytics] Google Analytics Tracking ID (VITE_GA_TRACKING_ID) is missing.');
            return;
        }

        // Avoid double-initialization
        if (isInitialized.current) return;

        try {
            // Use highly obfuscated system-like path
            ReactGA.initialize(trackingId, {
                gtagUrl: `/sys/cdn/utils.js?id=${trackingId}`
            });
            isInitialized.current = true;

            // Use highly obfuscated health/report path for collection
            ReactGA.set({
                transport_url: window.location.origin + '/sys/api/health/report'
            });

            // Send initial pageview
            ReactGA.send({
                hitType: 'pageview',
                page: window.location.pathname + window.location.search
            });
        } catch (err) {
            // This won't catch ERR_BLOCKED_BY_CLIENT (which is a browser-level network error),
            // but it will catch internal initialization errors.
            console.warn('[Analytics] Failed to initialize Google Analytics:', err);
        }
    }, []);

    useEffect(() => {
        if (!isInitialized.current) return;

        try {
            ReactGA.send({
                hitType: 'pageview',
                page: location.pathname + location.search
            });
        } catch (err) {
            // Fail silently on subsequent page views to avoid cluttering the console
        }
    }, [location]);

    return null;
};

export default AnalyticsTracker;
