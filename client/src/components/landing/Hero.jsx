import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const Hero = () => {
  const timerRef = useRef(null);

  useEffect(() => {
    let t = 5078;
    timerRef.current = setInterval(() => {
      t++;
      const h = String(Math.floor(t / 3600)).padStart(2, '0');
      const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
      const s = String(t % 60).padStart(2, '0');
      const el = document.getElementById('br-timer');
      if (el) el.textContent = `${h}:${m}:${s}`;
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  return (
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
  );
};

export default Hero;
