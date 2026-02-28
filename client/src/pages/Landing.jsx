import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

const Landing = () => {
  const timerRef = useRef(null);

  useEffect(() => {
    // ── Custom cursor ──
    const cur = document.getElementById('br-cur');
    const curR = document.getElementById('br-cur-r');
    let mx = 0, my = 0, rx = 0, ry = 0;
    let rafId;

    const onMouseMove = (e) => {
      mx = e.clientX; my = e.clientY;
      if (cur) { cur.style.left = mx + 'px'; cur.style.top = my + 'px'; }
    };
    const loop = () => {
      rx += (mx - rx) * 0.1; ry += (my - ry) * 0.1;
      if (curR) { curR.style.left = rx + 'px'; curR.style.top = ry + 'px'; }
      rafId = requestAnimationFrame(loop);
    };
    document.addEventListener('mousemove', onMouseMove);
    loop();

    // ── Scroll reveal ──
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.br .rv').forEach(el => obs.observe(el));

    // ── Nav border on scroll ──
    const nav = document.getElementById('br-mainNav');
    const onScroll = () => {
      if (nav) nav.style.borderBottomColor = scrollY > 30 ? 'rgba(28,26,23,0.18)' : 'rgba(28,26,23,0.12)';
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // ── Live timer ──
    let t = 5078;
    timerRef.current = setInterval(() => {
      t++;
      const h = String(Math.floor(t / 3600)).padStart(2, '0');
      const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
      const s = String(t % 60).padStart(2, '0');
      const el = document.getElementById('br-timer');
      if (el) el.textContent = `${h}:${m}:${s}`;
    }, 1000);

    // ── FAQ accordion ──
    const faqItems = document.querySelectorAll('.br .br-faq-item');
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

    // ── 3-D card tilt ──
    const cards = document.querySelectorAll('.br .feat-card, .br .price-card, .br .testi-card');
    const onCardMove = (e) => {
      const card = e.currentTarget;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `translateY(-4px) rotateX(${-y * 3}deg) rotateY(${x * 3}deg)`;
    };
    const onCardLeave = (e) => { e.currentTarget.style.transform = ''; };
    cards.forEach(c => {
      c.addEventListener('mousemove', onCardMove);
      c.addEventListener('mouseleave', onCardLeave);
    });

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
      clearInterval(timerRef.current);
      obs.disconnect();
      cards.forEach(c => {
        c.removeEventListener('mousemove', onCardMove);
        c.removeEventListener('mouseleave', onCardLeave);
      });
    };
  }, []);

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
    <div className="br">
      <div id="br-cur"></div>
      <div id="br-cur-r"></div>

      {/* ── NAVIGATION ── */}
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

      {/* ── HERO ── */}
      <section className="br-hero">
        <div className="br-hero-left">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'var(--br-terra-pale)', border: '1px solid rgba(196,113,74,0.25)', borderRadius: '100px', padding: '8px 18px', marginBottom: '36px', width: 'fit-content' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--br-terra)', animation: 'br-pulse 2s infinite' }}></div>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--br-terra)', letterSpacing: '.01em' }}>Stop managing work across 4 different apps</span>
          </div>

          <div className="br-hero-kicker">Introducing Brioright</div>

          <h1 className="br-hero-h1">
            From scattered<br />
            <span className="br-italic">to sorted —</span><br />
            <span className="br-underline-gold">in one workspace.</span>
          </h1>

          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(17px,1.8vw,22px)', fontWeight: '400', fontStyle: 'italic', color: 'var(--br-ink-muted)', marginBottom: '24px', letterSpacing: '-.3px', lineHeight: '1.35' }}>
            Your team's tasks, chat, time &amp; files. Finally connected.
          </p>

          {/* Tool stack visual */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '28px', padding: '14px 18px', background: 'white', border: '1px solid var(--br-rule-bold)', borderRadius: '12px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-10px', left: '16px', fontFamily: "'DM Mono',monospace", fontSize: '9px', fontWeight: '500', color: 'var(--br-terra)', background: 'var(--br-terra-pale)', padding: '2px 8px', borderRadius: '100px', letterSpacing: '.12em' }}>REPLACE ALL OF THESE</div>
            {[['📋', 'Trello', '#F3F4F6'], ['💬', 'Slack', '#F0FDF4'], ['⏱', 'Toggl', '#FFF7ED'], ['📁', 'Drive', '#EFF6FF']].map(([emoji, label, bg]) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', flex: '1', borderRight: '1px solid var(--br-rule)', padding: '0 8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>{emoji}</div>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '8px', color: 'var(--br-ink-muted)', fontWeight: '500' }}>{label}</span>
              </div>
            ))}
            <span style={{ fontSize: '18px', color: 'var(--br-terra)', fontWeight: '700', margin: '0 12px', flexShrink: '0' }}>→</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', paddingLeft: '4px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'var(--br-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 3h9c3 0 5.5 2.2 5.5 5S16 13 13 13H4V3zm0 10h10c3.3 0 6 2.4 6 5.5S17.3 24 14 24H4V13z" fill="#F7F4EF" /></svg>
              </div>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '8px', color: 'var(--br-terra)', fontWeight: '700' }}>Brioright</span>
            </div>
          </div>

          <p className="br-hero-sub">
            Brioright replaces your patchwork of tools with <strong>one calm, connected workspace</strong> — so your team always knows what to do, who owns it, and how long it takes.
          </p>

          <div className="br-hero-btns">
            <Link to="/register" className="br-btn-primary">
              Set up your workspace free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </Link>
            <a href="#br-features" className="br-btn-ghost">See how it works</a>
          </div>

          <div className="br-hero-trust">
            <div className="br-trust-faces">
              {[['#C4714A', 'R'], ['#7A9E7E', 'S'], ['#C9A84C', 'P'], ['#6B6560', 'A'], ['#2E2B26', 'M']].map(([bg, l]) => (
                <div key={l} className="br-trust-face" style={{ background: bg }}>{l}</div>
              ))}
            </div>
            <p className="br-trust-text"><strong>2,400+ teams</strong> replaced their tool stack<br />with Brioright. Setup takes 2 minutes.</p>
          </div>
        </div>

        <div className="br-hero-right">
          {/* Floating chips */}
          <div className="br-mock-chip br-chip1">
            <div className="br-chip-icon" style={{ background: 'var(--br-sage-pale)' }}>✓</div>
            <div><div className="br-chip-text">Sprint completed</div><div className="br-chip-sub">Marketing · 2 min ago</div></div>
          </div>
          <div className="br-mock-chip br-chip2">
            <div className="br-chip-icon" style={{ background: 'var(--br-terra-pale)' }}>💬</div>
            <div><div className="br-chip-text">3 new messages</div><div className="br-chip-sub">#design-team</div></div>
          </div>
          <div className="br-mock-chip br-chip3">
            <div className="br-chip-icon" style={{ background: 'var(--br-gold-pale)' }}>⏱</div>
            <div><div className="br-chip-text">Timer running</div><div className="br-chip-sub">Brand refresh</div></div>
          </div>

          {/* App mockup */}
          <div className="br-app-mockup">
            <div className="br-mock-header">
              <div className="br-mock-dots">
                <div className="br-mock-dot" style={{ background: '#E57373' }}></div>
                <div className="br-mock-dot" style={{ background: '#FFB74D' }}></div>
                <div className="br-mock-dot" style={{ background: '#81C784' }}></div>
              </div>
              <span className="br-mock-title">brioright · Q1 Sprint</span>
              <div className="br-mock-avatar">S</div>
            </div>
            <div className="br-mock-body">
              <div className="br-mock-cols">
                <div>
                  <div className="br-mock-col-head"><div className="br-mch-dot" style={{ background: 'var(--br-ink-faint)' }}></div>Backlog</div>
                  <div className="br-mock-task" style={{ borderLeftColor: 'var(--br-terra)' }}>
                    <div className="br-mt-title">Brand refresh proposal</div>
                    <div className="br-mt-meta"><span className="br-mt-tag" style={{ background: 'var(--br-terra-pale)', color: 'var(--br-terra)' }}>Design</span><div className="br-mt-av" style={{ background: 'var(--br-terra)' }}>A</div></div>
                  </div>
                  <div className="br-mock-task" style={{ borderLeftColor: 'var(--br-ink-faint)' }}>
                    <div className="br-mt-title">Client onboarding flow</div>
                    <div className="br-mt-meta"><span className="br-mt-tag" style={{ background: 'var(--br-parch-deep)', color: 'var(--br-ink-muted)' }}>Ops</span><div className="br-mt-av" style={{ background: 'var(--br-ink-muted)' }}>M</div></div>
                  </div>
                </div>
                <div>
                  <div className="br-mock-col-head"><div className="br-mch-dot" style={{ background: 'var(--br-gold)' }}></div>In Progress</div>
                  <div className="br-mock-task" style={{ borderLeftColor: 'var(--br-gold)' }}>
                    <div className="br-mt-title">Q1 budget review</div>
                    <div className="br-mt-meta"><span className="br-mt-tag" style={{ background: 'var(--br-gold-pale)', color: '#8B6914' }}>Finance</span><div className="br-mt-av" style={{ background: 'var(--br-gold)' }}>R</div></div>
                  </div>
                  <div className="br-mock-task" style={{ borderLeftColor: 'var(--br-sage)' }}>
                    <div className="br-mt-title">Hire UX lead</div>
                    <div className="br-mt-meta"><span className="br-mt-tag" style={{ background: 'var(--br-sage-pale)', color: 'var(--br-sage)' }}>HR</span><div className="br-mt-av" style={{ background: 'var(--br-sage)' }}>S</div></div>
                  </div>
                </div>
                <div>
                  <div className="br-mock-col-head"><div className="br-mch-dot" style={{ background: 'var(--br-sage)' }}></div>Done</div>
                  <div className="br-mock-task" style={{ opacity: 0.5 }}>
                    <div className="br-mt-title" style={{ textDecoration: 'line-through' }}>Set up workspace</div>
                    <div className="br-mt-meta"><span className="br-mt-tag" style={{ background: 'var(--br-sage-pale)', color: 'var(--br-sage)' }}>✓</span></div>
                  </div>
                  <div className="br-mock-task" style={{ opacity: 0.5 }}>
                    <div className="br-mt-title" style={{ textDecoration: 'line-through' }}>Invite team members</div>
                    <div className="br-mt-meta"><span className="br-mt-tag" style={{ background: 'var(--br-sage-pale)', color: 'var(--br-sage)' }}>✓</span></div>
                  </div>
                </div>
              </div>
              <div className="br-mock-timer">
                <div>
                  <div className="br-timer-label">Currently tracking</div>
                  <div style={{ fontSize: '11px', color: 'rgba(247,244,239,0.6)', marginTop: '2px' }}>Brand refresh proposal</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="br-timer-dot"></div>
                  <div className="br-timer-time" id="br-timer">01:24:38</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── EDITORIAL STATS ── */}
      {[
        { n: '01', label: 'Kanban Boards', title: 'Visual task management, reimagined', desc: 'Drag-and-drop boards that work the way your team thinks — with custom columns, priorities, due dates and real-time updates.', stat: '4×', statLbl: 'Faster delivery' },
        { n: '02', label: 'Team Chat', title: 'Conversations where your work lives', desc: 'Channels, threads, @mentions and file sharing — all inside the same workspace as your tasks, so context never gets lost.', stat: '68%', statLbl: 'Less email' },
        { n: '03', label: 'Time Tracking', title: 'Know exactly where your hours go', desc: 'One-click timers, billable hour reports, and weekly digests. Built for agencies, consultants, and teams that bill by the hour.', stat: '12h', statLbl: 'Saved per month' },
      ].map((item, i) => (
        <div key={item.n} className={`br-editorial-rule rv${i > 0 ? ' rv-d' + i : ''}`}>
          <div className="br-er-number">{item.n}</div>
          <div className="br-er-content">
            <div className="br-er-label">{item.label}</div>
            <div className="br-er-title">{item.title}</div>
            <div className="br-er-desc">{item.desc}</div>
          </div>
          <div className="br-er-stat">
            <div className="br-er-stat-num">{item.stat}</div>
            <div className="br-er-stat-lbl">{item.statLbl}</div>
          </div>
        </div>
      ))}

      {/* ── FEATURES ── */}
      <section className="br-features" id="br-features">
        <div className="br-feat-header rv">
          <div>
            <div className="br-feat-label">Everything you need</div>
            <h2 className="br-feat-h2">One workspace.<br /><em>All the tools.</em></h2>
          </div>
          <div>
            <p className="br-feat-intro">Most teams use five different tools to manage their work. Brioright replaces all of them with one elegant, connected workspace that actually makes sense.</p>
            <div className="br-feat-pull">"Replace your patchwork of apps with one place that simply works."</div>
          </div>
        </div>

        <div className="br-feat-grid">
          {/* Card 1: Kanban (tall) */}
          <div className="feat-card large rv rv-d1">
            <div className="br-fc-num">01</div>
            <div className="br-fc-icon" style={{ background: 'var(--br-terra-pale)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="5" height="18" rx="1" /><rect x="10" y="3" width="5" height="12" rx="1" /><rect x="17" y="3" width="5" height="15" rx="1" /></svg>
            </div>
            <div className="br-fc-title">Kanban Boards</div>
            <div className="br-fc-desc">Visual boards with drag-and-drop simplicity. Custom columns, task details, file attachments, subtasks, and real-time sync for your entire team.</div>
            <div className="br-fc-board">
              {[['Todo', ['Brand identity refresh', 'Content calendar Q2'], 'var(--br-terra)'], ['Doing', ['Website redesign'], 'var(--br-gold)'], ['Done', ['Logo update', 'Brand guidelines'], 'var(--br-sage)']].map(([col, tasks, color]) => (
                <div key={col} className="br-fc-col">
                  <div className="br-fc-col-label">{col}</div>
                  {tasks.map(t => (
                    <div key={t} className="br-fc-task-card" style={{ borderLeftColor: color, opacity: col === 'Done' ? 0.5 : 1, textDecoration: col === 'Done' ? 'line-through' : 'none' }}>{t}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Chat (dark) */}
          <div className="feat-card accent-card rv rv-d2">
            <div className="br-fc-num">02</div>
            <div className="br-fc-icon" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(247,244,239,0.8)" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
            </div>
            <div className="br-fc-title">Team Chat</div>
            <div className="br-fc-desc">Organised channels, threads and @mentions — right next to your tasks.</div>
            <div className="br-fc-chat">
              {[['A', 'var(--br-terra)', 'Ananya', 'Design review at 3pm?'], ['M', 'var(--br-sage)', 'Marcus', 'Works for me 👍'], ['R', 'var(--br-gold)', 'Riya', 'Added to calendar!']].map(([av, bg, name, msg]) => (
                <div key={name} className="br-fc-msg">
                  <div className="br-fc-msg-av" style={{ background: bg }}>{av}</div>
                  <div className="br-fc-msg-bubble"><strong>{name}</strong>{msg}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Time (terracotta) */}
          <div className="feat-card terra-card rv rv-d3">
            <div className="br-fc-num">03</div>
            <div className="br-fc-icon" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <div className="br-fc-title">Time Tracking</div>
            <div className="br-fc-desc">One-click timers. Billable hour reports. Weekly summaries sent automatically.</div>
          </div>

          {/* Card 4: Files */}
          <div className="feat-card rv rv-d1">
            <div className="br-fc-num">04</div>
            <div className="br-fc-icon" style={{ background: 'var(--br-gold-pale)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            </div>
            <div className="br-fc-title">File Management</div>
            <div className="br-fc-desc">Attach files to any task, share with your team, version control included. All in one place.</div>
          </div>

          {/* Card 5: Analytics */}
          <div className="feat-card rv rv-d2">
            <div className="br-fc-num">05</div>
            <div className="br-fc-icon" style={{ background: 'var(--br-sage-pale)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7A9E7E" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>
            </div>
            <div className="br-fc-title">Analytics &amp; Reporting</div>
            <div className="br-fc-desc">Team velocity, workload, overdue tasks, burndown charts — everything your leadership needs.</div>
          </div>

          {/* Card 6: Notifications */}
          <div className="feat-card rv rv-d3">
            <div className="br-fc-num">06</div>
            <div className="br-fc-icon" style={{ background: 'var(--br-parch-deep)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B6560" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
            </div>
            <div className="br-fc-title">Smart Notifications</div>
            <div className="br-fc-desc">Only the alerts that matter. In-app, email and Slack — you choose what, when and how.</div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
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

      {/* ── PRICING ── */}
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

      {/* ── FAQ ── */}
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

      {/* ── CTA ── */}
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

      {/* ── FOOTER ── */}
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
            ].map(icon => (
              <div key={icon.key} className="br-ft-soc-btn">{icon}</div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
