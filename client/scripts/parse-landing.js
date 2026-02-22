import fs from 'fs';
import path from 'path';

const htmlFilePath = process.argv[2];
const outputJsxPath = process.argv[3];
const outputCssPath = process.argv[4];

console.log(`Reading from: ${htmlFilePath}`);
const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

// Extract CSS
const cssMatch = htmlContent.match(/<style>([\s\S]*?)<\/style>/);
let css = cssMatch ? cssMatch[1] : '';

// Handle CSS scoping
css = css.replace(/^body\s*\{/gm, '.landing-page {');

// Extract HTML
const bodyMatch = htmlContent.match(/<body>([\s\S]*?)<script>/);
let bodyHtml = bodyMatch ? bodyMatch[1] : '';

// Convert HTML to JSX
let jsx = bodyHtml.replace(/class=/g, 'className=');
jsx = jsx.replace(/style="([^"]+)"/g, (match, styleString) => {
    const styleObj = {};
    styleString.split(';').forEach(rule => {
        if (!rule.trim()) return;
        const [key, value] = rule.split(':');
        if (key && value) {
            const camelKey = key.trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
            styleObj[camelKey] = value.trim();
        }
    });
    return `style={${JSON.stringify(styleObj)}}`;
});
jsx = jsx.replace(/<br>/g, '<br />');

// Clean up some problematic specific HTML parts for React
jsx = jsx.replace(/<!--[\s\S]*?-->/g, ''); // replace comments completely
jsx = jsx.replace(/<svg[\s\S]*?<\/svg>/g, (match) => {
    // Basic SVG cleanup for JSX (e.g. stroke-width -> strokeWidth)
    let m = match.replace(/stroke-width/g, 'strokeWidth');
    m = m.replace(/stroke-linecap/g, 'strokeLinecap');
    m = m.replace(/fill-rule/g, 'fillRule');
    m = m.replace(/clip-rule/g, 'clipRule');
    m = m.replace(/stroke-linejoin/g, 'strokeLinejoin');
    return m;
});


const jsxComponent = `import React, { useEffect } from 'react';
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
        b.style.transform = \`translate(\${x*f}px,\${y*f}px)\`;
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
      if (el) el.textContent = \`\${h}:\${m}:\${s}\`;
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
      ${jsx.replace(/<a href="#" className="btn-sm-ghost">Sign in<\/a>/g, '<Link to="/login" className="btn-sm-ghost">Sign in</Link>')
        .replace(/<a href="#" className="btn-sm-dark">([\s\S]*?)<\/a>/g, '<Link to="/register" className="btn-sm-dark">$1</Link>')
        .replace(/<a href="#" className="btn-hero-primary">([\s\S]*?)<\/a>/g, '<Link to="/register" className="btn-hero-primary">$1</Link>')
        .replace(/<a href="#" className="btn-cta-w">([\s\S]*?)<\/a>/g, '<Link to="/register" className="btn-cta-w">$1</Link>')}
    </div>
  );
};

export default Landing;
`;

fs.writeFileSync(outputJsxPath, jsxComponent);
fs.writeFileSync(outputCssPath, css);
console.log('Successfully generated Landing.jsx and Landing.css');
