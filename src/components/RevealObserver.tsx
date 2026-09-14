"use client";

import { useEffect } from "react";

/**
 * A görgetésre induló belépők (Reveal, trigger="view") EGYETLEN megfigyelője, a gyökér-layoutban egyszer (P7).
 * Korábban minden Reveal külön kliens-komponens volt (laponként ~20 hidratálandó példány, mindegyik saját IntersectionObserverrel) —
 * a mobil LCP előtti fő szálas munka jelentős része. Most a Reveal sima szerveroldali elem data-in="false"-szal, és ez a komponens
 * kapcsolja data-in="true"-ra, amikor képbe ér. A később a DOM-ba kerülő elemeket (kliens-oldali navigáció, a betöltött
 * Google-értékelések) MutationObserver veszi fel. IntersectionObserver nélkül mindent azonnal megjelenít; JS nélkül a layout
 * <noscript>-je.
 */
export function RevealObserver() {
  useEffect(() => {
    const SEL = '[data-in="false"]';
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll<HTMLElement>(SEL).forEach((el) => { el.dataset.in = "true"; });
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { (e.target as HTMLElement).dataset.in = "true"; io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -10% 0px" });
    const watch = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.matches(SEL)) io.observe(root);
      root.querySelectorAll<HTMLElement>(SEL).forEach((el) => io.observe(el));
    };
    watch(document);
    const mo = new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach((n) => { if (n instanceof HTMLElement) watch(n); });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); io.disconnect(); };
  }, []);
  return null;
}
