"use client";

import { useEffect } from "react";

/** Egérkövető fény a program-kártyákon: egy mozgás egy képkocka (rAF), csak egérrel. */
export function Sheen() {
  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>(".prog-link");
      if (!card) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { const r = card.getBoundingClientRect(); card.style.setProperty("--mx", `${e.clientX - r.left}px`); card.style.setProperty("--my", `${e.clientY - r.top}px`); });
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => { document.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, []);
  return null;
}
