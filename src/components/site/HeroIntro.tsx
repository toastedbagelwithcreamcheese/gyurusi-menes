"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * A hero szövegének belépő koreográfiája — a vezesdakamionod HeroIntro mintája,
 * a mi palettánkra fordítva: a címsor sorai egy balról jobbra futó szalma→csontfehér
 * fénysáv mögül tűnnek elő (background-clip: text), a többi elem lépcsőben emelkedik.
 * Kezdőállapot a szerver HTML-jében rejtett (.hero-seq), JS nélkül data-js="false" mutat mindent.
 */
const BAND_HALF = 16;
const SWEEP = ["#d9c48f", "#f7f4ee", "#ffffff"];

function gradient(pos: number, finalColor: string) {
  const a = pos - BAND_HALF, b = pos + BAND_HALF;
  if (a >= 100) return `linear-gradient(90deg, ${finalColor}, ${finalColor})`;
  const parts: string[] = [];
  if (a > 0) parts.push(`${finalColor} 0%`, `${finalColor} ${a.toFixed(2)}%`);
  SWEEP.forEach((c, i) => parts.push(`${c} ${(a + (i / (SWEEP.length - 1)) * BAND_HALF * 2).toFixed(2)}%`));
  if (b < 100) parts.push(`transparent ${b.toFixed(2)}%`, `transparent 100%`);
  return `linear-gradient(90deg, ${parts.join(", ")})`;
}

export function HeroIntro({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.dataset.js = "true";
    const hero = root.closest(".hero");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* Telefonon a CSS-belépő fut (globals.css), a GSAP-koreográfia csak 640 px fölött. */
    if (window.matchMedia("(max-width: 639px)").matches) { hero?.classList.add("in"); return; }
    const sweeps = Array.from(root.querySelectorAll<HTMLElement>("[data-sweep]"));
    const seqs = Array.from(root.querySelectorAll<HTMLElement>("[data-seq]"));
    const finish = (el: HTMLElement, color: string) => { el.style.backgroundImage = "none"; el.style.color = color; };

    const ctx = gsap.context(() => {
      if (reduced) { sweeps.forEach((el) => finish(el, el.dataset.sweep || "#f3efe6")); gsap.set(seqs, { autoAlpha: 1, y: 0 }); hero?.classList.add("in"); return; }
      requestAnimationFrame(() => hero?.classList.add("in"));
      const tl = gsap.timeline({ delay: 0.05, defaults: { ease: "expo.out" } });
      const first = seqs.filter((e) => e.dataset.seq === "first");
      const rest = seqs.filter((e) => e.dataset.seq !== "first");
      if (first.length) tl.to(first, { autoAlpha: 1, y: 0, duration: 0.7 }, 0);
      sweeps.forEach((el, i) => {
        const finalColor = el.dataset.sweep || "#f3efe6";
        const state = { pos: -BAND_HALF };
        el.style.backgroundImage = gradient(state.pos, finalColor);
        tl.to(state, { pos: 100 + BAND_HALF, duration: 1.0, ease: "power2.inOut",
          onUpdate: () => { el.style.backgroundImage = gradient(state.pos, finalColor); }, onComplete: () => finish(el, finalColor) }, i === 0 ? 0.05 : "-=0.7");
      });
      tl.to(rest, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1 }, "-=0.55");
    }, root);
    return () => ctx.revert();
  }, []);
  return <div ref={ref} className="hero-seq" data-js="false">{children}</div>;
}
