import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const Navigation = () => {
  useEffect(() => {
    const nav = document.getElementById('br-mainNav');
    const onScroll = () => {
      if (nav) nav.style.borderBottomColor = window.scrollY > 30 ? 'rgba(28,26,23,0.18)' : 'rgba(28,26,23,0.12)';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav id="br-mainNav">
      <a href="#" className="br-nav-logo">
        <div className="br-nav-logomark">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 3h9c3 0 5.5 2.2 5.5 5S16 13 13 13H4V3zm0 10h10c3.3 0 6 2.4 6 5.5S17.3 24 14 24H4V13z" fill="#F7F4EF" />
          </svg>
        </div>
        <span className="br-nav-wordmark"><em>brio</em>right</span>
      </a>

      <ul className="br-nav-center">
        <li><a href="#br-features">Features</a></li>
        <li><a href="#br-pricing">Pricing</a></li>
        <li><a href="#br-testimonials">Stories</a></li>
        <li><a href="#br-faq">FAQ</a></li>
      </ul>

      <div className="br-nav-right">
        <Link to="/login" className="br-nav-link">Sign in</Link>
        <Link to="/register" className="br-nav-cta">Start free — 2 min setup →</Link>
      </div>
    </nav>
  );
};

export default Navigation;
