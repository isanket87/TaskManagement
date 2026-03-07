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

        // 1. Manually inject the gtag.js script if not present
        const scriptId = 'google-tag-manager';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
            document.head.appendChild(script);

            const inlineScript = document.createElement('script');
            inlineScript.innerHTML = `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${trackingId}');
            `;
            document.head.appendChild(inlineScript);
        }

        // 2. Initialize ReactGA
        ReactGA.initialize(trackingId);
        
        // 3. Initial pageview
        ReactGA.send({ hitType: 'pageview', page: window.location.pathname });
    }, []);

    useEffect(() => {
        // 4. Track route changes
        ReactGA.send({ hitType: 'pageview', page: location.pathname + location.search });
    }, [location]);

    return null;
};

export default AnalyticsTracker;
