"use client";

import { useEffect, useRef } from "react";

/**
 * A hero képe lassabban gördül, mint a szöveg — mélység egy sík fotóból. Csak asztalon (≥ 640 px) és mozgás-csökkentés nélkül:
 * a GSAP + ScrollTrigger dinamikus importtal, a lap betöltése után, tétlen időben töltődik le. Telefonon és reduced-motion
 * mellett egyáltalán nem (P7: ~46 KB JS, amit korábban a mobil LCP is megfizetett). A mód a betöltéskor dől el.
 */
export function HeroParallax({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !window.matchMedia("(min-width: 640px) and (prefers-reduced-motion: no-preference)").matches) return;
    let cancelled = false;
    let revert: (() => void) | undefined;
    const start = async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: 0.4 } });
        tl.to(root.querySelector("[data-layer='media']"), { yPercent: 28, ease: "none" }, 0)
          .to(root.querySelector("[data-layer='text']"), { yPercent: 14, autoAlpha: 0.15, ease: "none" }, 0);
      }, root);
      revert = () => ctx.revert();
    };
    /* A parallaxnak csak görgetéskor van dolga: a betöltés (load) után, tétlen időben indul, hogy ne versenyezzen a lap képeivel. */
    const ric = typeof window.requestIdleCallback === "function" ? window.requestIdleCallback.bind(window) : null;
    let idleId: number | undefined;
    const kick = () => { idleId = ric ? ric(() => { void start(); }, { timeout: 2000 }) : window.setTimeout(() => { void start(); }, 200); };
    if (document.readyState === "complete") kick(); else window.addEventListener("load", kick, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", kick);
      if (idleId !== undefined) { if (ric) window.cancelIdleCallback(idleId); else window.clearTimeout(idleId); }
      revert?.();
    };
  }, []);
  return <div ref={ref} className="hero-layers">{children}</div>;
}
