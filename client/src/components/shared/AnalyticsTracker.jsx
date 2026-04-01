import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

const trackingId = 'G-P5NHCX77XB'; // Hardcoded fallback for production

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
            // Standard GA4 initialization
            ReactGA.initialize(trackingId);
            isInitialized.current = true;

            // Send initial pageview
            ReactGA.send({
                hitType: 'pageview',
                page: window.location.pathname + window.location.search
            });
        } catch (err) {
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
