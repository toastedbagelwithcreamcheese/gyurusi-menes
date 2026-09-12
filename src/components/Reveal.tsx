"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Belépő animáció kapcsoló. A rejtett kezdőállapot a szerveren renderelt
 * HTML-ben van (data-in="false"), a layout <noscript>-je visszakapcsolja, ha
 * nem fut JS. `variant="unveil"` a képekhez: clip-path takarás húzódik le.
 */
export function Reveal({
  children, className = "", as: Tag = "div", trigger = "view", delay, variant = "rise", ...rest
}: {
  children: ReactNode; className?: string;
  as?: "div" | "section" | "article" | "header" | "h1" | "h2" | "p" | "figure" | "li";
  trigger?: "view" | "mount"; delay?: number; variant?: "rise" | "unveil";
} & Record<`data-${string}`, string | boolean>) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (trigger === "mount" || !("IntersectionObserver" in window)) {
      const raf = requestAnimationFrame(() => { el.dataset.in = "true"; });
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { el.dataset.in = "true"; io.disconnect(); }
    }, { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [trigger]);
  return (
    <Tag ref={ref as never} {...rest} className={`${variant} ${className}`} data-in="false"
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  );
}
