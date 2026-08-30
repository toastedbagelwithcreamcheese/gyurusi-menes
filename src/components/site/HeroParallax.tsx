"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** A hero képe lassabban gördül, mint a szöveg — mélység egy sík fotóból. Reduced-motionra áll. */
export function HeroParallax({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: 0.4 } });
      tl.to(root.querySelector("[data-layer='media']"), { yPercent: 28, ease: "none" }, 0)
        .to(root.querySelector("[data-layer='text']"), { yPercent: 14, autoAlpha: 0.15, ease: "none" }, 0);
    }, root);
    return () => ctx.revert();
  }, []);
  return <div ref={ref} className="hero-layers">{children}</div>;
}
