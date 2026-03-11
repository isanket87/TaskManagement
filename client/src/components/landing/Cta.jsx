import React from 'react';
import { Link } from 'react-router-dom';

const Cta = () => {
  return (
    <section className="br-cta">
      <div className="br-cta-inner">
        <div className="rv">
          <div className="br-cta-label">Get started today</div>
          <h2 className="br-cta-h2">Work better.<br /><em>Together.</em></h2>
          <p className="br-cta-p">Join 2,400+ teams who stopped juggling tools and started actually getting things done.</p>
        </div>
        <div className="rv rv-d2">
          <div className="br-cta-big-num">BR</div>
          <div className="br-cta-form">
            <Link to="/register" className="br-cta-submit">Start for free — no card needed</Link>
            <p className="br-cta-disclaimer">14-day trial · Cancel anytime · Setup in 2 minutes</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Cta;
