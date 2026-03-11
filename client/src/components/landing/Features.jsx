import React from 'react';

const Features = () => {
  return (
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
  );
};

export default Features;
