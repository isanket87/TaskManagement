import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

const trackingId = import.meta.env.VITE_GA_TRACKING_ID;

const AnalyticsTracker = () => {
    const location = useLocation();
    const isInitialized = useRef(false);

    useEffect(() => {
        // Skip analytics in development or if no tracking ID is provided
        if (import.meta.env.DEV || !trackingId) {
            if (!trackingId && !import.meta.env.DEV) {
                console.warn('[Analytics] Google Analytics Tracking ID (VITE_GA_TRACKING_ID) is missing.');
            }
            return;
        }

        // Avoid double-initialization
        if (isInitialized.current) return;

        try {
            // Explicitly set the gtagUrl to ensure correct parameter structure (?id=)
            // and handle potential issues with older versions of the library.
            ReactGA.initialize(trackingId, {
                gtagUrl: `https://www.googletagmanager.com/gtag/js?id=${trackingId}`
            });
            isInitialized.current = true;
            
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
        if (import.meta.env.DEV || !isInitialized.current) return;
        
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
