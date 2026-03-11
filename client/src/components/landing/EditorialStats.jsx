import React from 'react';

const EditorialStats = () => {
  const stats = [
    { n: '01', label: 'Kanban Boards', title: 'Visual task management, reimagined', desc: 'Drag-and-drop boards that work the way your team thinks — with custom columns, priorities, due dates and real-time updates.', stat: '4×', statLbl: 'Faster delivery' },
    { n: '02', label: 'Team Chat', title: 'Conversations where your work lives', desc: 'Channels, threads, @mentions and file sharing — all inside the same workspace as your tasks, so context never gets lost.', stat: '68%', statLbl: 'Less email' },
    { n: '03', label: 'Time Tracking', title: 'Know exactly where your hours go', desc: 'One-click timers, billable hour reports, and weekly digests. Built for agencies, consultants, and teams that bill by the hour.', stat: '12h', statLbl: 'Saved per month' },
  ];

  return (
    <>
      {stats.map((item, i) => (
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
    </>
  );
};

export default EditorialStats;
