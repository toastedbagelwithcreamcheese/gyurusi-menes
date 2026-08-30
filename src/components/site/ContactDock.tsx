"use client";

import { useEffect, useState } from "react";

/** Telefonon: alsó kapcsolatsáv, ami akkor úszik fel, amikor a hero gombjai már kigördültek. */
export function ContactDock({ phone }: { phone: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const s = document.getElementById("hero-cta");
    if (!s) { const r = requestAnimationFrame(() => setShow(true)); return () => cancelAnimationFrame(r); }
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(s);
    return () => io.disconnect();
  }, []);
  return (
    <div className="dock" data-in={show} aria-hidden={!show}>
      <div className="dock-in">
        <a href="#kapcsolat">Üzenet</a>
        <a href={`tel:${phone.replace(/\s/g, "")}`} className="primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.9 2z"/></svg>
          Hívás
        </a>
      </div>
    </div>
  );
}
