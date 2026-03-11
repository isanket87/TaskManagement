import React from 'react';
import { Link } from 'react-router-dom';

const Pricing = () => {
  const togglePrice = (mode) => {
    const proPrice = document.getElementById('br-pro-price');
    const bizPrice = document.getElementById('br-biz-price');
    const proPeriod = document.getElementById('br-pro-period');
    const bizPeriod = document.getElementById('br-biz-period');
    document.querySelectorAll('.br .pt-opt').forEach(b => b.classList.remove('active'));
    document.querySelector(`.br .pt-opt[data-mode="${mode}"]`)?.classList.add('active');
    if (mode === 'yearly') {
      if (proPrice) proPrice.innerHTML = '<sup>$</sup>10';
      if (bizPrice) bizPrice.innerHTML = '<sup>$</sup>23';
      if (proPeriod) proPeriod.textContent = 'per member / month, billed yearly';
      if (bizPeriod) bizPeriod.textContent = 'per member / month, billed yearly';
    } else {
      if (proPrice) proPrice.innerHTML = '<sup>$</sup>12';
      if (bizPrice) bizPrice.innerHTML = '<sup>$</sup>29';
      if (proPeriod) proPeriod.textContent = 'per member / month';
      if (bizPeriod) bizPeriod.textContent = 'per member / month';
    }
  };

  return (
    <section className="br-pricing" id="br-pricing">
      <div className="br-pricing-header rv">
        <div className="br-pricing-label">Pricing</div>
        <h2 className="br-pricing-h2">Simple, <em>honest</em> pricing.</h2>
        <div className="br-price-toggle">
          <button className="pt-opt active" data-mode="monthly" onClick={() => togglePrice('monthly')}>Monthly</button>
          <button className="pt-opt" data-mode="yearly" onClick={() => togglePrice('yearly')}>Yearly <span className="br-pt-save">Save 20%</span></button>
        </div>
      </div>
      <div className="br-pricing-grid">
        {/* Starter */}
        <div className="price-card rv rv-d1">
          <div className="br-price-plan">// Starter</div>
          <div className="br-price-num"><sup>$</sup>0</div>
          <div className="br-price-period">forever — no card required</div>
          <div className="br-price-divider"></div>
          <ul className="br-price-features">
            {['Up to 3 team members', '5 active projects', 'Kanban boards', 'Basic time tracking', '100MB file storage'].map(f => (
              <li key={f} className="br-pf-item"><div className="br-pf-check">✓</div>{f}</li>
            ))}
          </ul>
          <Link to="/register" className="br-price-btn-outline">Start free →</Link>
        </div>

        {/* Professional */}
        <div className="price-card featured rv rv-d2">
          <div className="br-price-popular">Most popular</div>
          <div className="br-price-plan">// Professional</div>
          <div className="br-price-num" id="br-pro-price"><sup>$</sup>12</div>
          <div className="br-price-period" id="br-pro-period">per member / month</div>
          <div className="br-price-divider"></div>
          <ul className="br-price-features">
            {['Unlimited members', 'Unlimited projects', 'Team chat + threads', 'Advanced time tracking', 'Analytics dashboard', '20GB file storage', 'Priority support'].map(f => (
              <li key={f} className="br-pf-item"><div className="br-pf-check">✓</div>{f}</li>
            ))}
          </ul>
          <Link to="/register" className="br-price-btn-light">Start 14-day trial →</Link>
        </div>

        {/* Business */}
        <div className="price-card rv rv-d3">
          <div className="br-price-plan">// Business</div>
          <div className="br-price-num" id="br-biz-price"><sup>$</sup>29</div>
          <div className="br-price-period" id="br-biz-period">per member / month</div>
          <div className="br-price-divider"></div>
          <ul className="br-price-features">
            {['Everything in Professional', 'Multiple workspaces', 'SSO / SAML login', 'Custom roles & permissions', '100GB file storage', 'Dedicated account manager'].map(f => (
              <li key={f} className="br-pf-item"><div className="br-pf-check">✓</div>{f}</li>
            ))}
          </ul>
          <Link to="/register" className="br-price-btn-dark">Contact sales →</Link>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
