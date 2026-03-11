import React, { useEffect } from 'react';
import './Landing.css';

import Navigation from '../components/landing/Navigation';
import Hero from '../components/landing/Hero';
import EditorialStats from '../components/landing/EditorialStats';
import Features from '../components/landing/Features';
import Testimonials from '../components/landing/Testimonials';
import Pricing from '../components/landing/Pricing';
import Faq from '../components/landing/Faq';
import Cta from '../components/landing/Cta';
import Footer from '../components/landing/Footer';

const Landing = () => {
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
      cancelAnimationFrame(rafId);
      obs.disconnect();
      cards.forEach(c => {
        c.removeEventListener('mousemove', onCardMove);
        c.removeEventListener('mouseleave', onCardLeave);
      });
    };
  }, []);

  return (
    <div className="br">
      <div id="br-cur"></div>
      <div id="br-cur-r"></div>

      {/* ── NAVIGATION ── */}
      <Navigation />

      {/* ── HERO ── */}
      <Hero />

      {/* ── EDITORIAL STATS ── */}
      <EditorialStats />

      {/* ── FEATURES ── */}
      <Features />

      {/* ── TESTIMONIALS ── */}
      <Testimonials />

      {/* ── PRICING ── */}
      <Pricing />

      {/* ── FAQ ── */}
      <Faq />

      {/* ── CTA ── */}
      <Cta />

      {/* ── FOOTER ── */}
      <Footer />
    </div>
  );
};

export default Landing;
