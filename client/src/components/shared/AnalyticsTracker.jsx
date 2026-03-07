import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

const trackingId = import.meta.env.VITE_GA_TRACKING_ID;

const AnalyticsTracker = () => {
    const location = useLocation();
    const isInitialized = useRef(false);

    useEffect(() => {
        if (!trackingId) {
            console.warn('[Analytics] Google Analytics Tracking ID (VITE_GA_TRACKING_ID) is missing.');
            return;
        }

        if (isInitialized.current) return;

        // ReactGA.initialize handles loading the gtag script internally
        try {
            ReactGA.initialize(trackingId);
            isInitialized.current = true;

            // Send initial pageview
            ReactGA.send({ hitType: 'pageview', page: window.location.pathname });
        } catch (err) {
            console.warn('[Analytics] Failed to initialize ReactGA:', err);
        }
    }, []);

    useEffect(() => {
        // 4. Track subsequent route changes only (skip the very first render)
        if (!isInitialized.current) return;
        ReactGA.send({ hitType: 'pageview', page: location.pathname + location.search });
    }, [location]);

    return null;
};

export default AnalyticsTracker;
