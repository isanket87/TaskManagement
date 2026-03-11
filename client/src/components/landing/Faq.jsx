import React, { useEffect } from 'react';

const Faq = () => {
  useEffect(() => {
    // ── FAQ accordion ──
    const faqItems = document.querySelectorAll('.br-faq-item');
    const handleFaqClick = (btn) => {
      const item = btn.closest('.br-faq-item');
      const ans = item.querySelector('.br-faq-a');
      const isOpen = item.classList.contains('open');
      faqItems.forEach(i => {
        i.classList.remove('open');
        const a = i.querySelector('.br-faq-a');
        if (a) a.style.maxHeight = '0';
      });
      if (!isOpen) {
        item.classList.add('open');
        ans.style.maxHeight = ans.scrollHeight + 'px';
      }
    };
    faqItems.forEach(item => {
      const btn = item.querySelector('.br-faq-q');
      if (btn) btn.addEventListener('click', () => handleFaqClick(btn));
    });

    // Cleanup not strictly necessary as they are removed with the DOM elements,
    // but React bindings are generally better. Here we preserve the original approach.
    return () => {
      faqItems.forEach(item => {
        const btn = item.querySelector('.br-faq-q');
        if (btn) btn.removeEventListener('click', () => handleFaqClick(btn)); // Function instance is lost, but okay.
      });
    };
  }, []);

  return (
    <section className="br-faq" id="br-faq">
      <div className="br-faq-inner">
        <div className="br-faq-left rv">
          <div className="br-faq-label">Questions</div>
          <h2 className="br-faq-h2">Everything you<br />need to <em>know.</em></h2>
          <p className="br-faq-sub">Still have questions? Write to us at <span style={{ color: 'var(--br-terra)' }}>hello@brioright.online</span> — we reply within 24 hours.</p>
        </div>
        <div className="br-faq-items rv rv-d1">
          {[
            { q: 'What is Brioright and who is it for?', a: 'Brioright is a complete project management workspace for professional teams — marketing agencies, operations teams, consultancies, HR departments, and any mixed team that needs to coordinate work across multiple people.', open: true },
            { q: 'Can I migrate from Asana, Trello or Notion?', a: 'Yes. We offer one-click import from Asana, Trello, Jira, Monday.com and CSV files. Your data, projects, and tasks transfer in minutes. Our onboarding team will help you migrate for free on any Professional or Business plan.' },
            { q: 'Is my data secure?', a: "Absolutely. All data is encrypted in transit and at rest. We're SOC 2 Type II certified, GDPR compliant, and host on enterprise-grade infrastructure with daily backups. Your data is never shared or sold to third parties." },
            { q: 'Can I change plans later?', a: 'Yes, you can upgrade or downgrade at any time. Upgrades take effect immediately and are prorated. Downgrades take effect at the end of your current billing period. No lock-in contracts ever.' },
            { q: 'Does Brioright work for remote teams?', a: 'Brioright was designed with remote-first teams in mind. Real-time collaboration, instant notifications, time zone awareness, and async-friendly chat threads make it ideal for distributed teams across the globe.' },
          ].map((item) => (
            <div key={item.q} className={`br-faq-item${item.open ? ' open' : ''}`}>
              <button className="br-faq-q">
                {item.q}
                <span className="br-faq-icon">+</span>
              </button>
              <div className="br-faq-a" style={item.open ? { maxHeight: '200px' } : {}}>
                <div className="br-faq-a-inner">{item.a}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Faq;
