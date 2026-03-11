import React from 'react';

const Footer = () => {
  return (
    <footer className="br-footer">
      <div className="br-footer-top">
        <div>
          <a href="#" className="br-ft-brand-logo">
            <div className="br-ft-brand-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 3h9c3 0 5.5 2.2 5.5 5S16 13 13 13H4V3zm0 10h10c3.3 0 6 2.4 6 5.5S17.3 24 14 24H4V13z" fill="white" /></svg>
            </div>
            <span className="br-ft-brand-name">Brioright</span>
          </a>
          <p className="br-ft-brand-desc">Project management for professionals who value clarity, beauty and precision over chaos.</p>
        </div>
        {[
          { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
          { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
          { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Contact'] },
        ].map(col => (
          <div key={col.title}>
            <div className="br-ft-col-title">{col.title}</div>
            <ul className="br-ft-links">
              {col.links.map(l => <li key={l}><a href="#">{l}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="br-footer-bottom">
        <span className="br-ft-copy">© 2026 Brioright · All rights reserved</span>
        <div className="br-ft-social">
          {[
            <svg key="tw" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" /></svg>,
            <svg key="li" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>,
            <svg key="gh" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" /></svg>,
          ].map((icon, idx) => (
            <div key={idx} className="br-ft-soc-btn">{icon}</div>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
