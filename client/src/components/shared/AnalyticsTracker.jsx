import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

const trackingId = import.meta.env.VITE_GA_TRACKING_ID;

const AnalyticsTracker = () => {
    const location = useLocation();
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (!trackingId) {
            console.warn('Google Analytics Tracking ID (VITE_GA_TRACKING_ID) is missing.');
            return;
        }
        ReactGA.initialize(trackingId);
        setInitialized(true);
    }, []);

    useEffect(() => {
        if (initialized) {
            ReactGA.send({ hitType: 'pageview', page: location.pathname + location.search });
        }
    }, [initialized, location]);

    return null;
};

export default AnalyticsTracker;
