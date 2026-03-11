import React from 'react';

const Testimonials = () => {
  return (
    <section className="br-testimonials" id="br-testimonials">
      <div className="br-testi-header rv">
        <h2 className="br-testi-h2">Trusted by teams who<br /><em>demand the best.</em></h2>
        <p className="br-testi-tagline">Join over 2,400 teams who replaced their patchwork of tools with Brioright.</p>
      </div>
      <div className="br-testi-grid">
        {[
          { av: 'AS', grad: 'linear-gradient(135deg,#C4714A,#C9A84C)', stars: 5, quote: '"We replaced four different tools with Brioright. Our team alignment improved immediately. The Kanban boards are intuitive and the time tracking has saved us hours every week in reporting."', name: 'Ananya Sharma', role: 'Operations Lead · Luminary Co.', featured: false },
          { av: 'MK', grad: 'linear-gradient(135deg,#7A9E7E,#C9A84C)', stars: 5, quote: '"The editorial feel of Brioright sets it apart from every other PM tool I\'ve tried. It feels like a workspace worthy of serious work — not a startup toy. My whole agency switched within a week."', name: 'Marcus Keane', role: 'Founder · Meridian Studio', featured: true },
          { av: 'RL', grad: 'linear-gradient(135deg,#2E2B26,#6B6560)', stars: 5, quote: '"Finally a PM tool that doesn\'t look like it was designed for kindergarteners. Brioright is elegant, fast, and our non-technical team actually uses it every day without any training."', name: 'Rhea Lakhani', role: 'CEO · Cortex Partners', featured: false },
        ].map((t) => (
          <div key={t.name} className={`testi-card rv${t.featured ? ' featured' : ''}`}>
            <div className="br-tq-mark">"</div>
            <div className="br-testi-stars">{'★'.repeat(t.stars)}</div>
            <p className="br-testi-quote">{t.quote}</p>
            <div className="br-testi-author">
              <div className="br-testi-av" style={{ background: t.grad }}>{t.av}</div>
              <div>
                <div className="br-testi-name">{t.name}</div>
                <div className="br-testi-role">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;
