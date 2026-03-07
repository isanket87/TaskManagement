import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

const trackingId = import.meta.env.VITE_GA_TRACKING_ID;

const AnalyticsTracker = () => {
    const location = useLocation();

    useEffect(() => {
        if (!trackingId) {
            console.warn('Google Analytics Tracking ID (VITE_GA_TRACKING_ID) is missing.');
            return;
        }
        
        // Initialize GA4
        ReactGA.initialize(trackingId);
        
        // Track the initial page load
        ReactGA.send({ 
            hitType: 'pageview', 
            page: window.location.pathname + window.location.search 
        });
    }, []);

    useEffect(() => {
        // Track subsequent page changes
        ReactGA.send({ 
            hitType: 'pageview', 
            page: location.pathname + location.search 
        });
    }, [location]);

    return null;
};

export default AnalyticsTracker;
