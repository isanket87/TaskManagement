import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

const Landing = () => {
  useEffect(() => {
    // Ported from original vanilla JS
    const cursor = document.getElementById('cursor');
    const ring = document.getElementById('cursor-ring');
    if (!cursor || !ring) return;

    let mx = 0, my = 0, rx = 0, ry = 0;
    let animationFrameId;

    const onMouseMove = (e) => {
      mx = e.clientX; 
      my = e.clientY;
      if (cursor) {
        cursor.style.left = mx + 'px';
        cursor.style.top = my + 'px';
      }
    };

    const animateRing = () => {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      if (ring) {
        ring.style.left = rx + 'px';
        ring.style.top = ry + 'px';
      }
      animationFrameId = requestAnimationFrame(animateRing);
    };

    document.addEventListener('mousemove', onMouseMove);
    animateRing();

    // Scroll reveal
    const revealObs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
    }, { threshold: 0.1, rootMargin: '0px 0px -48px 0px' });
    document.querySelectorAll('.rv').forEach(el => revealObs.observe(el));

    // Nav scroll shadow
    const nav = document.getElementById('nav');
    const onScroll = () => {
      if(nav) {
        nav.style.borderBottomColor = window.scrollY > 20
          ? 'rgba(17,17,16,0.1)' : 'rgba(17,17,16,0.07)';
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // Parallax blobs
    const onBlobMove = e => {
      const x = (e.clientX / window.innerWidth - 0.5) * 24;
      const y = (e.clientY / window.innerHeight - 0.5) * 24;
      document.querySelectorAll('.mesh-blob').forEach((b, i) => {
        const f = (i + 1) * 0.35;
        b.style.transform = `translate(${x*f}px,${y*f}px)`;
      });
    };
    document.addEventListener('mousemove', onBlobMove, { passive: true });

    // Animated timer
    let secs = 6129;
    const updateTimer = () => {
      secs++;
      const h = String(Math.floor(secs/3600)).padStart(2,'0');
      const m = String(Math.floor((secs%3600)/60)).padStart(2,'0');
      const s = String(secs%60).padStart(2,'0');
      const el = document.querySelector('.ss-timer-time');
      if (el) el.textContent = `${h}:${m}:${s}`;
    };
    const timerInterval = setInterval(updateTimer, 1000);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousemove', onBlobMove);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(animationFrameId);
      clearInterval(timerInterval);
    };
  }, []);

  return (
    <div className="landing-page dark:bg-[#fafaf8] dark:text-[#111110]">
      


<div id="cursor"></div>
<div id="cursor-ring"></div>


<nav id="nav">
  <a href="#" className="logo">
    <div className="logo-mark">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    </div>
    <span className="logo-name">TaskFlow</span>
  </a>

  <ul className="nav-mid">
    <li><a href="#features">Features</a></li>
    <li><a href="#showcase">How it works</a></li>
    <li><a href="#pricing">Pricing</a></li>
    <li><a href="#faq">FAQ</a></li>
  </ul>

  <div className="nav-right">
    <Link to="/login" className="btn-sm-ghost">Sign in</Link>
    <Link to="/register" className="btn-sm-dark">
      Get started
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </Link>
  </div>
</nav>


<section className="hero">
  <div className="hero-mesh">
    <div className="mesh-blob blob1"></div>
    <div className="mesh-blob blob2"></div>
    <div className="mesh-blob blob3"></div>
    <div className="mesh-blob blob4"></div>
  </div>

  <div className="hero-eyebrow">
    <span className="eyebrow-tag">New</span>
    Workspace collaboration — now live
  </div>

  <h1 className="hero-h1">
    Ship projects.<br />
    <span className="h1-line2">
      <span className="h1-word-wrap">Not excuses.</span>
    </span>
  </h1>

  <p className="hero-sub">
    TaskFlow unifies your Kanban boards, team chat, time tracking, and file management — so small teams move fast without dropping the ball.
  </p>

  <div className="hero-actions">
    <Link to="/register" className="btn-hero-primary">
      Start free — no card needed
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </Link>
    <a href="#showcase" className="btn-hero-secondary">
      <div className="play-icon">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </div>
      Watch 2-min demo
    </a>
  </div>

  <div className="hero-social-proof">
    <div className="avatar-stack">
      <div className="avatar-stack-item" style={{"background":"#6366f1"}}>SC</div>
      <div className="avatar-stack-item" style={{"background":"#059669"}}>MR</div>
      <div className="avatar-stack-item" style={{"background":"#d97706"}}>AL</div>
      <div className="avatar-stack-item" style={{"background":"#e11d48"}}>JK</div>
      <div className="avatar-stack-item" style={{"background":"#0284c7"}}>RN</div>
    </div>
    <span>Loved by <strong style={{"color":"var(--ink)"}}>2,400+</strong> teams</span>
    <div className="proof-divider"></div>
    <div className="star-row">★★★★★</div>
    <span><strong style={{"color":"var(--ink)"}}>4.9</strong> / 5 rating</span>
  </div>

  
  <div className="hero-screenshot">
    <div className="ss-window">
      <div className="ss-titlebar">
        <div className="ss-dot ss-dot-r"></div>
        <div className="ss-dot ss-dot-y"></div>
        <div className="ss-dot ss-dot-g"></div>
        <div className="ss-url">
          <span className="ss-url-lock">🔒</span>
          app.taskflow.io/workspace/acme-corp/projects/website-redesign
        </div>
      </div>

      <div className="ss-app">
        
        <div className="ss-sidebar">
          <div className="ss-ws-switcher">
            <div className="ss-ws-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>
            </div>
            <span className="ss-ws-name">Acme Corp</span>
            <span className="ss-ws-chevron">⌄</span>
          </div>

          <div className="ss-nav-section">Main</div>
          <div className="ss-nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Dashboard
          </div>
          <div className="ss-nav-item active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            Projects
          </div>
          <div className="ss-nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            Calendar
          </div>

          <div className="ss-nav-section">Team</div>
          <div className="ss-nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Messages
            <span className="ss-nav-badge">5</span>
          </div>
          <div className="ss-nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            Members
            <span className="ss-nav-badge green">8</span>
          </div>

          <div className="ss-nav-section">Track</div>
          <div className="ss-nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Timesheets
          </div>

          <div className="ss-nav-user">
            <div className="ss-user-av">JD</div>
            <div className="ss-user-info">
              <div className="ss-user-name">John Doe</div>
              <div className="ss-user-role">Owner</div>
            </div>
            <div className="ss-status-dot"></div>
          </div>
        </div>

        
        <div className="ss-main" style={{"position":"relative"}}>
          <div className="ss-topbar">
            <span className="ss-topbar-breadcrumb">Projects /</span>
            <span className="ss-topbar-title">Website Redesign</span>
            <div style={{"display":"flex","gap":"6px","marginLeft":"auto"}}>
              <div style={{"padding":"5px 10px","background":"var(--c1)","border":"1px solid var(--c2)","borderRadius":"7px","fontSize":"11px","color":"var(--ink3)","fontWeight":"600"}}>☰ List</div>
              <div style={{"padding":"5px 10px","background":"var(--c1)","border":"1px solid var(--c2)","borderRadius":"7px","fontSize":"11px","color":"var(--ink3)","fontWeight":"600"}}>⚙ Filter</div>
              <div style={{"padding":"5px 12px","background":"var(--ink)","borderRadius":"7px","fontSize":"11px","color":"white","fontWeight":"700"}}>+ Task</div>
            </div>
          </div>

          <div className="ss-filter-bar">
            <div className="ss-filter-chip active">All tasks</div>
            <div className="ss-filter-chip"><span className="chip-dot" style={{"background":"#dc2626"}}></span> Overdue 2</div>
            <div className="ss-filter-chip"><span className="chip-dot" style={{"background":"#2563eb"}}></span> Today 3</div>
            <div className="ss-filter-chip"><span className="chip-dot" style={{"background":"#d97706"}}></span> This week</div>
            <div className="ss-filter-chip"><span className="chip-dot" style={{"background":"#94a3b8"}}></span> No date</div>
          </div>

          <div className="ss-board">
            
            <div className="ss-col">
              <div className="ss-col-head">
                <div className="ss-col-dot" style={{"background":"#94a3b8"}}></div>
                To Do
                <span className="ss-col-count">3</span>
                <div className="ss-col-add">+</div>
              </div>
              <div className="ss-card">
                <div className="ss-card-stripe" style={{"background":"#ef4444"}}></div>
                <div className="ss-card-title">Design new homepage hero & navigation flow</div>
                <div className="ss-card-tags">
                  <span className="ss-tag tag-r">High</span>
                  <span className="ss-tag tag-p">Design</span>
                </div>
                <div className="ss-card-footer">
                  <div className="ss-due due-today">📅 Today</div>
                  <div className="ss-mini-av" style={{"background":"#6366f1"}}>SM</div>
                </div>
              </div>
              <div className="ss-card">
                <div className="ss-card-stripe" style={{"background":"#f59e0b"}}></div>
                <div className="ss-card-title">Update design token system</div>
                <div className="ss-card-tags">
                  <span className="ss-tag tag-a">Med</span>
                  <span className="ss-tag tag-b">Dev</span>
                </div>
                <div className="ss-card-footer">
                  <div className="ss-due due-soon">📅 Mar 18</div>
                  <div className="ss-mini-av" style={{"background":"#059669"}}>JD</div>
                </div>
              </div>
              <div className="ss-card">
                <div className="ss-card-stripe" style={{"background":"#22c55e"}}></div>
                <div className="ss-card-title">Write API documentation</div>
                <div className="ss-card-tags">
                  <span className="ss-tag tag-g">Low</span>
                </div>
                <div className="ss-card-footer">
                  <div className="ss-due due-ok">📅 Mar 25</div>
                  <div className="ss-mini-av" style={{"background":"#d97706"}}>MK</div>
                </div>
              </div>
            </div>

            
            <div className="ss-col">
              <div className="ss-col-head">
                <div className="ss-col-dot" style={{"background":"#3b82f6"}}></div>
                In Progress
                <span className="ss-col-count">2</span>
                <div className="ss-col-add">+</div>
              </div>
              <div className="ss-card" style={{"borderColor":"rgba(220,38,38,0.2)","boxShadow":"0 0 0 2px rgba(220,38,38,0.06)"}}>
                <div className="ss-card-stripe" style={{"background":"#ef4444"}}></div>
                <div className="ss-card-title">Fix auth redirect on mobile browsers</div>
                <div className="ss-card-tags">
                  <span className="ss-tag tag-r">Critical</span>
                  <span className="ss-tag tag-b">Bug</span>
                </div>
                <div className="ss-card-footer">
                  <div className="ss-due due-over">⚠️ Overdue 2d</div>
                  <div className="ss-mini-av" style={{"background":"#e11d48"}}>AL</div>
                </div>
              </div>
              <div className="ss-card">
                <div className="ss-card-stripe" style={{"background":"#f59e0b"}}></div>
                <div className="ss-card-title">Integrate Stripe checkout & webhooks</div>
                <div className="ss-card-tags">
                  <span className="ss-tag tag-a">High</span>
                  <span className="ss-tag tag-g">Backend</span>
                </div>
                <div className="ss-card-footer">
                  <div className="ss-due due-today">📅 Today</div>
                  <div className="ss-mini-av" style={{"background":"#0284c7"}}>RN</div>
                </div>
              </div>
            </div>

            
            <div className="ss-col">
              <div className="ss-col-head">
                <div className="ss-col-dot" style={{"background":"#a855f7"}}></div>
                In Review
                <span className="ss-col-count">1</span>
                <div className="ss-col-add">+</div>
              </div>
              <div className="ss-card">
                <div className="ss-card-stripe" style={{"background":"#22c55e"}}></div>
                <div className="ss-card-title">Performance audit & optimization</div>
                <div className="ss-card-tags">
                  <span className="ss-tag tag-g">Low</span>
                  <span className="ss-tag tag-p">Perf</span>
                </div>
                <div className="ss-card-footer">
                  <div className="ss-due due-ok">📅 Mar 20</div>
                  <div className="ss-mini-av" style={{"background":"#6366f1"}}>SM</div>
                </div>
              </div>
            </div>

            
            <div className="ss-col">
              <div className="ss-col-head">
                <div className="ss-col-dot" style={{"background":"#10b981"}}></div>
                Done
                <span className="ss-col-count">5</span>
              </div>
              <div className="ss-card" style={{"opacity":"0.55"}}>
                <div className="ss-card-stripe" style={{"background":"#10b981"}}></div>
                <div className="ss-card-title" style={{"textDecoration":"line-through","color":"#94a3b8"}}>Setup CI/CD pipeline</div>
                <div className="ss-card-tags"><span className="ss-tag tag-done">✓ Done</span></div>
              </div>
              <div className="ss-card" style={{"opacity":"0.55"}}>
                <div className="ss-card-stripe" style={{"background":"#10b981"}}></div>
                <div className="ss-card-title" style={{"textDecoration":"line-through","color":"#94a3b8"}}>Database schema & migrations</div>
                <div className="ss-card-tags"><span className="ss-tag tag-done">✓ Done</span></div>
              </div>
            </div>
          </div>

          
          <div className="ss-timer-bar">
            <div className="ss-timer-dot"></div>
            <div className="ss-timer-label">Tracking:</div>
            <div className="ss-timer-task">Stripe integration</div>
            <div className="ss-timer-time">01:42:09</div>
            <button className="ss-timer-stop">■ Stop</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>


<div className="logos-strip">
  <div className="logos-label">Trusted by teams at</div>
  <div className="logos-scroll">
    <span className="logo-co">Designly</span>
    <span className="logo-co">Recraft</span>
    <span className="logo-co">Vantage</span>
    <span className="logo-co">Pulselab</span>
    <span className="logo-co">Nordvik</span>
    <span className="logo-co">Crewbase</span>
    <span className="logo-co">Lumio</span>
  </div>
</div>


<section className="bento-section" id="features">
  <div className="container">
    <div className="rv">
      <div className="section-eyebrow">Everything you need</div>
      <h2 className="section-h2">One tool.<br />Your whole workflow.</h2>
      <p className="section-p">Replace the five apps your team uses with one workspace that actually connects them together.</p>
    </div>

    <div className="bento-grid">
      
      <div className="bento-card b1 rv rv-d1">
        <div className="bento-icon" style={{"background":"rgba(67,56,202,0.08)"}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#4338ca" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg>
        </div>
        <div className="bento-card-title">Kanban Boards</div>
        <div className="bento-card-desc">Drag-and-drop task management. Four columns, infinite flexibility. See your whole sprint at a glance.</div>
        <div className="bento-preview-kanban">
          <div className="bp-col">
            <div className="bp-col-h"><div className="bp-dot" style={{"background":"#94a3b8"}}></div> Todo</div>
            <div className="bp-card red">Homepage redesign</div>
            <div className="bp-card amber">API docs</div>
          </div>
          <div className="bp-col">
            <div className="bp-col-h"><div className="bp-dot" style={{"background":"#3b82f6"}}></div> Active</div>
            <div className="bp-card red">Fix auth bug</div>
          </div>
          <div className="bp-col">
            <div className="bp-col-h"><div className="bp-dot" style={{"background":"#10b981"}}></div> Done</div>
            <div className="bp-card done">CI/CD setup</div>
            <div className="bp-card done">DB schema</div>
          </div>
        </div>
      </div>

      
      <div className="bento-card b2 rv rv-d2">
        <div className="bento-icon" style={{"background":"rgba(5,150,105,0.08)"}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        </div>
        <div className="bento-card-title">Team Chat</div>
        <div className="bento-card-desc">Real-time channels, threads, @mentions, emoji reactions. Right next to your work.</div>
      </div>

      
      <div className="bento-card b3 rv rv-d3">
        <div className="bento-icon" style={{"background":"rgba(217,119,6,0.08)"}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div className="bento-card-title">Time Tracking</div>
        <div className="bento-card-desc">One-click timers. Billable hour reports. Weekly timesheets.</div>
      </div>

      
      <div className="bento-card b4 rv rv-d1">
        <div className="bento-icon" style={{"background":"rgba(225,29,72,0.08)"}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        </div>
        <div className="bento-card-title">Smart Due Dates</div>
        <div className="bento-card-desc">Overdue alerts, smart reminders, full calendar view. Zero missed deadlines.</div>
      </div>

      
      <div className="bento-card b5 rv rv-d2">
        <div className="bento-icon" style={{"background":"rgba(2,132,199,0.08)"}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
        </div>
        <div className="bento-card-title">File Management</div>
        <div className="bento-card-desc">Upload, preview, and version files on any task.</div>
      </div>

      
      <div className="bento-card b6 rv rv-d3">
        <div style={{"flex":"1"}}>
          <div className="bento-icon" style={{"background":"rgba(255,255,255,0.1)"}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          </div>
          <div className="bento-card-title">Analytics & Reports</div>
          <div className="bento-card-desc">Team velocity, workload balance, project health. Data that actually helps you ship.</div>
        </div>
        <div className="b6-visual">
          <div className="b6-stat-row">
            <span className="b6-stat-label">Sarah</span>
            <div className="b6-bar-wrap"><div className="b6-bar" style={{"width":"80%","background":"linear-gradient(90deg,#6366f1,#8b5cf6)"}}></div></div>
            <span className="b6-stat-val">8 tasks</span>
          </div>
          <div className="b6-stat-row">
            <span className="b6-stat-label">Mike</span>
            <div className="b6-bar-wrap"><div className="b6-bar" style={{"width":"55%","background":"linear-gradient(90deg,#059669,#10b981)"}}></div></div>
            <span className="b6-stat-val">5 tasks</span>
          </div>
          <div className="b6-stat-row">
            <span className="b6-stat-label">Alex</span>
            <div className="b6-bar-wrap"><div className="b6-bar" style={{"width":"30%","background":"linear-gradient(90deg,#d97706,#f59e0b)"}}></div></div>
            <span className="b6-stat-val">3 tasks</span>
          </div>
          <div className="b6-stat-row">
            <span className="b6-stat-label">John</span>
            <div className="b6-bar-wrap"><div className="b6-bar" style={{"width":"95%","background":"linear-gradient(90deg,#e11d48,#f43f5e)"}}></div></div>
            <span className="b6-stat-val">12 tasks ⚠</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>


<section className="showcase-alt" id="showcase">
  <div className="container">

    
    <div className="sa-row rv">
      <div>
        <div className="sa-label">💬 Real-time Chat</div>
        <h3 className="sa-h3">Talk where<br />work lives</h3>
        <p className="sa-p">Stop context-switching between Slack and your project tools. TaskFlow brings conversations directly alongside your tasks.</p>
        <div className="sa-points">
          <div className="sa-point">
            <div className="sa-point-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 8h10M7 12h6"/><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            </div>
            <div className="sa-point-text"><strong>Threaded replies</strong> Keep discussions organized without losing context inside channels</div>
          </div>
          <div className="sa-point">
            <div className="sa-point-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            </div>
            <div className="sa-point-text"><strong>@mentions with fallback</strong> Notify teammates in-app, by email, and via Slack if they're offline</div>
          </div>
          <div className="sa-point">
            <div className="sa-point-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            </div>
            <div className="sa-point-text"><strong>Emoji reactions</strong> React to messages instantly — no clutter, full expression</div>
          </div>
        </div>
      </div>
      <div className="sa-visual rv rv-d2">
        <div className="chat-ui">
          <div className="chat-sidebar">
            <div className="chat-ws">Acme Corp</div>
            <div className="chat-section-lbl">Channels</div>
            <div className="chat-channel active"># general</div>
            <div className="chat-channel"># project-alpha <span className="chat-unread">3</span></div>
            <div className="chat-channel"># design</div>
            <div className="chat-section-lbl" style={{"marginTop":"12px"}}>DMs</div>
            <div className="chat-channel">👤 Sarah <span className="chat-unread">1</span></div>
            <div className="chat-channel">👤 Mike</div>
          </div>
          <div className="chat-main">
            <div className="chat-header">
              # project-alpha
              <div className="chat-online"><div className="chat-online-dot"></div> 4 online</div>
            </div>
            <div className="chat-msgs">
              <div className="chat-msg">
                <div className="chat-av" style={{"background":"#6366f1"}}>SM</div>
                <div className="chat-bubble">Hero redesign is ready for review 🎨 Figma link in the task</div>
              </div>
              <div className="chat-msg">
                <div className="chat-av" style={{"background":"#059669"}}>JD</div>
                <div className="chat-bubble">Looks clean! Left some notes on the spacing</div>
              </div>
              <div className="chat-msg self">
                <div className="chat-av" style={{"background":"#d97706"}}>MK</div>
                <div className="chat-bubble"><span className="mention">@SM</span> can you fix the mobile nav? Due today!</div>
              </div>
              <div className="chat-msg">
                <div className="chat-av" style={{"background":"#6366f1"}}>SM</div>
                <div className="chat-bubble">On it, pushing in 30 min ⚡️</div>
              </div>
            </div>
            <div className="chat-input-row">
              <div className="chat-input">Message #project-alpha...</div>
              <div className="chat-send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    
    <div className="sa-row flip rv">
      <div>
        <div className="sa-label">⏱️ Time Tracking</div>
        <h3 className="sa-h3">Know where<br />every hour went</h3>
        <p className="sa-p">One-click timers, beautiful weekly timesheets, and billable hour exports. Built for agencies, freelancers, and focused teams.</p>
        <div className="sa-points">
          <div className="sa-point">
            <div className="sa-point-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
            <div className="sa-point-text"><strong>Start from any task card</strong> Hover any task on the Kanban and hit play — timer starts instantly</div>
          </div>
          <div className="sa-point">
            <div className="sa-point-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
            <div className="sa-point-text"><strong>Billable tracking</strong> Mark hours as billable, export clean CSV reports for client invoicing</div>
          </div>
          <div className="sa-point">
            <div className="sa-point-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
            <div className="sa-point-text"><strong>Team workload view</strong> See who's at capacity and redistribute before burnout happens</div>
          </div>
        </div>
      </div>
      <div className="sa-visual rv rv-d2">
        <div className="time-ui">
          <div className="time-running">
            <div className="time-run-left">
              <div className="time-run-label">Now tracking</div>
              <div className="time-run-task">Stripe checkout integration</div>
              <div className="time-run-proj">Website Redesign · Project Alpha</div>
            </div>
            <div className="time-run-right">
              <div className="time-run-clock">01:42:09</div>
              <button className="time-stop-btn">■ STOP TIMER</button>
            </div>
          </div>
          <div className="time-section-head">Today's entries</div>
          <div className="time-entry">
            <div className="time-entry-av" style={{"background":"#6366f1"}}>SM</div>
            <div className="time-entry-info">
              <div className="time-entry-task">Design review session</div>
              <div className="time-entry-proj">Website Redesign</div>
            </div>
            <div>
              <div className="time-entry-dur">2:30</div>
              <div className="time-entry-bill">Billable</div>
            </div>
          </div>
          <div className="time-entry">
            <div className="time-entry-av" style={{"background":"#059669"}}>JD</div>
            <div className="time-entry-info">
              <div className="time-entry-task">Team standup</div>
              <div className="time-entry-proj">General</div>
            </div>
            <div><div className="time-entry-dur">0:45</div></div>
          </div>
          <div className="time-entry">
            <div className="time-entry-av" style={{"background":"#d97706"}}>MK</div>
            <div className="time-entry-info">
              <div className="time-entry-task">API integration work</div>
              <div className="time-entry-proj">Website Redesign</div>
            </div>
            <div>
              <div className="time-entry-dur">3:15</div>
              <div className="time-entry-bill">Billable</div>
            </div>
          </div>
          <div className="time-totals">
            <div className="time-total-item">
              <div className="time-total-val">7:54</div>
              <div className="time-total-lbl">Today</div>
            </div>
            <div className="time-total-item">
              <div className="time-total-val">34:20</div>
              <div className="time-total-lbl">This week</div>
            </div>
            <div className="time-total-item">
              <div className="time-total-val" style={{"color":"var(--green)"}}>$2,840</div>
              <div className="time-total-lbl">Billable</div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</section>


<section className="stats-section">
  <div className="container" style={{"maxWidth":"1100px","margin":"0 auto","position":"relative"}}>
    <div className="stats-blob stats-blob-1"></div>
    <div className="stats-blob stats-blob-2"></div>
    <div className="stats-eyebrow rv">BY THE NUMBERS</div>
    <div className="stats-grid rv">
      <div className="stat-cell">
        <div className="stat-icon">🚀</div>
        <div className="stat-num" data-count="2400" data-suffix="+">2400+</div>
        <div className="stat-lbl">Teams using TaskFlow</div>
      </div>
      <div className="stat-cell">
        <div className="stat-icon">⚡</div>
        <div className="stat-num">&lt;1s</div>
        <div className="stat-lbl">Every API response</div>
      </div>
      <div className="stat-cell">
        <div className="stat-icon">⭐</div>
        <div className="stat-num">4.9</div>
        <div className="stat-lbl">Average rating</div>
      </div>
      <div className="stat-cell">
        <div className="stat-icon">✅</div>
        <div className="stat-num">98%</div>
        <div className="stat-lbl">Customer satisfaction</div>
      </div>
    </div>
  </div>
</section>


<section className="testi-section" id="testimonials">
  <div className="container">
    <div className="rv" style={{"textAlign":"center","marginBottom":"64px"}}>
      <div className="section-eyebrow" style={{"justifyContent":"center"}}>Testimonials</div>
      <h2 className="section-h2">Teams that switched<br />never looked back</h2>
    </div>
    <div className="testi-grid">
      <div className="testi-card rv rv-d1">
        <div className="testi-stars">★★★★★</div>
        <p className="testi-text">"We replaced Asana, Slack, and Harvest with TaskFlow. One tool, half the cost, and somehow twice the productivity. I didn't think that was actually possible."</p>
        <div className="testi-author">
          <div className="testi-av" style={{"background":"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>SC</div>
          <div>
            <div className="testi-name">Sarah Chen</div>
            <div className="testi-role">CTO · Designly</div>
          </div>
        </div>
      </div>

      <div className="testi-card featured rv rv-d2">
        <div className="testi-stars">★★★★★</div>
        <p className="testi-text">"The time tracking alone saved us from billing disputes with clients. The Kanban board is honestly the best I've used in 8 years of building products."</p>
        <div className="testi-author">
          <div className="testi-av" style={{"background":"rgba(255,255,255,0.2)"}}>MR</div>
          <div>
            <div className="testi-name">Marcus Reid</div>
            <div className="testi-role">Founder · Crewbase Agency</div>
          </div>
        </div>
      </div>

      <div className="testi-card rv rv-d3">
        <div className="testi-stars">★★★★★</div>
        <p className="testi-text">"Setup took 10 minutes. Within a week our whole 8-person team was fully onboarded. The workspace invitation flow is incredibly smooth — it just works."</p>
        <div className="testi-author">
          <div className="testi-av" style={{"background":"linear-gradient(135deg,#d97706,#f59e0b)"}}>AL</div>
          <div>
            <div className="testi-name">Aisha Lorentz</div>
            <div className="testi-role">Product Manager · Vantage</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>


<section className="pricing-section" id="pricing">
  <div className="container">
    <div className="rv">
      <div className="section-eyebrow">Pricing</div>
      <h2 className="section-h2">Simple, honest pricing.</h2>
      <p className="section-p">Start free. Upgrade when your team is ready. No hidden fees. Cancel any time.</p>
      <div className="pricing-toggle">
        <button className="ptoggle-btn active">Monthly</button>
        <button className="ptoggle-btn">Yearly <span className="ptoggle-save">Save 20%</span></button>
      </div>
    </div>

    <div className="pricing-cards">
      <div className="p-card rv rv-d1">
        <div className="p-plan">Free</div>
        <div className="p-price"><sup>$</sup>0</div>
        <div className="p-period">forever · no credit card</div>
        <div className="p-divider"></div>
        <ul className="p-features">
          <li className="p-feat"><div className="p-feat-check">✓</div> Up to 3 members</li>
          <li className="p-feat"><div className="p-feat-check">✓</div> 5 active projects</li>
          <li className="p-feat"><div className="p-feat-check">✓</div> Kanban board</li>
          <li className="p-feat"><div className="p-feat-check">✓</div> Basic time tracking</li>
          <li className="p-feat"><div className="p-feat-check">✓</div> 100 MB storage</li>
        </ul>
        <a href="#" className="p-btn p-btn-outline">Start for free</a>
      </div>

      <div className="p-card featured rv rv-d2">
        <div className="p-popular">Most Popular</div>
        <div className="p-plan">Pro</div>
        <div className="p-price"><sup>$</sup>12</div>
        <div className="p-period">per member / month</div>
        <div className="p-divider"></div>
        <ul className="p-features">
          <li className="p-feat"><div className="p-feat-check">✓</div> Unlimited members</li>
          <li className="p-feat"><div className="p-feat-check">✓</div> Unlimited projects</li>
          <li className="p-feat"><div className="p-feat-check">✓</div> Team chat + threads</li>
          <li className="p-feat"><div className="p-feat-check">✓</div> Advanced time reports</li>
          <li className="p-feat"><div className="p-feat-check">✓</div> Email + Slack alerts</li>
          <li className="p-feat"><div className="p-feat-check">✓</div> 20 GB storage</li>
          <li className="p-feat"><div className="p-feat-check">✓</div> Priority support</li>
        </ul>
        <a href="#" className="p-btn p-btn-white">Start 14-day trial</a>
      </div>

      <div className="p-card rv rv-d3">
        <div className="p-plan">Team</div>
        <div className="p-price"><sup>$</sup>29</div>
        <div className="p-period">per member / month</div>
        <div className="p-divider"></div>
        <ul className="p-features">
          <li className="p-feat"><div className="p-feat-check">✓</div> Everything in Pro</li>
          <li className="p-feat"><div className="p-feat-check">✓</div> Multiple workspaces</li>
          <li className="p-feat"><div className="p-feat-check">✓</div> Advanced analytics</li>
          <li className="p-feat"><div className="p-feat-check">✓</div> Custom roles</li>
          <li className="p-feat"><div className="p-feat-check">✓</div> 100 GB storage</li>
          <li className="p-feat"><div className="p-feat-check">✓</div> Dedicated manager</li>
        </ul>
        <a href="#" className="p-btn p-btn-outline">Contact sales</a>
      </div>
    </div>
  </div>
</section>


<section className="faq-section" id="faq">
  <div className="container">
    <div className="rv" style={{"textAlign":"center"}}>
      <div className="section-eyebrow" style={{"justifyContent":"center"}}>FAQ</div>
      <h2 className="section-h2">Questions, answered</h2>
    </div>
    <div className="faq-list rv rv-d1">
      <div className="faq-item open">
        <button className="faq-question">
          Is TaskFlow really free to start?
          <div className="faq-q-icon">+</div>
        </button>
        <div className="faq-answer">
          <div className="faq-answer-inner">Yes, completely. No credit card required. The free plan gives you 3 team members, 5 projects, and full access to the Kanban board, time tracking, and notifications. Upgrade only when you need more.</div>
        </div>
      </div>
      <div className="faq-item">
        <button className="faq-question">
          Can I import data from Asana or Trello?
          <div className="faq-q-icon">+</div>
        </button>
        <div className="faq-answer">
          <div className="faq-answer-inner">Yes. TaskFlow supports CSV import from Asana, Trello, and Jira. You can also use our REST API to migrate data programmatically. Our onboarding team can help if you're migrating a large workspace.</div>
        </div>
      </div>
      <div className="faq-item">
        <button className="faq-question">
          How does the Workspace system work?
          <div className="faq-q-icon">+</div>
        </button>
        <div className="faq-answer">
          <div className="faq-answer-inner">Each Workspace is an isolated environment with its own members, projects, and billing. You can belong to multiple workspaces (e.g. your company and a side project). Invite teammates via email with role-based access: Owner, Admin, or Member.</div>
        </div>
      </div>
      <div className="faq-item">
        <button className="faq-question">
          Is my data secure?
          <div className="faq-q-icon">+</div>
        </button>
        <div className="faq-answer">
          <div className="faq-answer-inner">All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We use row-level security so workspace data is completely isolated between customers. Daily automated backups with 30-day retention.</div>
        </div>
      </div>
      <div className="faq-item">
        <button className="faq-question">
          What happens if I cancel?
          <div className="faq-q-icon">+</div>
        </button>
        <div className="faq-answer">
          <div className="faq-answer-inner">You keep access until the end of your billing period. After that, your workspace downgrades to the free plan (not deleted). You can export all your data at any time, no questions asked.</div>
        </div>
      </div>
    </div>
  </div>
</section>


<section className="cta-section">
  <div className="container">
    <div className="cta-card rv">
      <h2 className="cta-h2">Ready to ship<br />faster together?</h2>
      <p className="cta-p">Join 2,400+ teams who use TaskFlow every day.</p>
      <div className="cta-btns">
        <Link to="/register" className="btn-cta-w">
          Start free — no card needed
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </Link>
        <a href="#" className="btn-cta-ghost">Schedule a demo →</a>
      </div>
    </div>
  </div>
</section>


<footer>
  <div className="footer-inner">
    <div className="footer-top">
      <div className="ft-brand">
        <a href="#" className="ft-logo">
          <div className="ft-logo-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          </div>
          <span className="ft-logo-name">TaskFlow</span>
        </a>
        <p className="ft-desc">Where small teams ship great work. Built with care for the people who build things.</p>
      </div>
      <div>
        <div className="ft-col-title">Product</div>
        <ul className="ft-links">
          <li><a href="#">Features</a></li>
          <li><a href="#">Pricing</a></li>
          <li><a href="#">Changelog</a></li>
          <li><a href="#">Roadmap</a></li>
          <li><a href="#">Status</a></li>
        </ul>
      </div>
      <div>
        <div className="ft-col-title">Company</div>
        <ul className="ft-links">
          <li><a href="#">About</a></li>
          <li><a href="#">Blog</a></li>
          <li><a href="#">Careers</a></li>
          <li><a href="#">Press kit</a></li>
          <li><a href="#">Contact</a></li>
        </ul>
      </div>
      <div>
        <div className="ft-col-title">Legal</div>
        <ul className="ft-links">
          <li><a href="#">Privacy</a></li>
          <li><a href="#">Terms</a></li>
          <li><a href="#">Cookies</a></li>
          <li><a href="#">Security</a></li>
          <li><a href="#">GDPR</a></li>
        </ul>
      </div>
    </div>
    <div className="footer-bottom">
      <span className="ft-copy">© 2026 TaskFlow. Built for small teams who move fast.</span>
      <div className="ft-social">
        <div className="ft-social-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>
        </div>
        <div className="ft-social-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg>
        </div>
        <div className="ft-social-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
        </div>
      </div>
    </div>
  </div>
</footer>


    </div>
  );
};

export default Landing;
