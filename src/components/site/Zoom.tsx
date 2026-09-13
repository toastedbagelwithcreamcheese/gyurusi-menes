"use client";

import Image from "next/image";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ImageMeta } from "@/lib/images";

type Labels = { open: string; close: string; prev: string; next: string; of: string };
const Ctx = createContext<{ open: (i: number) => void } | null>(null);

/**
 * Képnagyító (lightbox) az aloldalak képeihez: a ZoomProvider tartja a képlistát és a nagy nézetet,
 * a ZoomButton bármely képet kattinthatóvá tesz az indexével. Billentyű: Esc, ←, →. Nincs könyvtár.
 */
export function ZoomProvider({ items, labels, children }: { items: ImageMeta[]; labels: Labels; children: React.ReactNode }) {
  const [i, setI] = useState<number | null>(null);
  const open = useCallback((n: number) => setI(n), []);
  const close = useCallback(() => setI(null), []);
  const step = useCallback((d: number) => setI((c) => (c === null ? c : (c + d + items.length) % items.length)), [items.length]);
  useEffect(() => {
    if (i === null) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(); if (e.key === "ArrowLeft") step(-1); if (e.key === "ArrowRight") step(1); };
    window.addEventListener("keydown", k); document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [i, close, step]);
  const im = i === null ? null : items[i];
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <div className="zoom" data-open={i !== null} role="dialog" aria-modal="true" aria-label={labels.open} aria-hidden={i === null} onClick={close}>
        {im && (
          <figure className="zoom-fig" onClick={(e) => e.stopPropagation()}>
            <Image key={im.src} src={im.src} alt={im.alt} width={im.width} height={im.height} sizes="100vw" quality={78} placeholder={im.blur ? "blur" : "empty"} blurDataURL={im.blur} style={{ backgroundColor: im.color }} priority />
            <figcaption className="zoom-cap"><span>{im.alt}</span><span className="tabular">{(i ?? 0) + 1} {labels.of} {items.length}</span></figcaption>
          </figure>
        )}
        <button type="button" className="zoom-x" aria-label={labels.close} onClick={close}>×</button>
        {items.length > 1 && <>
          <button type="button" className="zoom-nav zoom-prev" aria-label={labels.prev} onClick={(e) => { e.stopPropagation(); step(-1); }}>‹</button>
          <button type="button" className="zoom-nav zoom-next" aria-label={labels.next} onClick={(e) => { e.stopPropagation(); step(1); }}>›</button>
        </>}
      </div>
    </Ctx.Provider>
  );
}

export function ZoomButton({ index, label, className = "", children }: { index: number; label: string; className?: string; children: React.ReactNode }) {
  const ctx = useContext(Ctx);
  return <button type="button" className={`zoom-btn ${className}`} data-zoom={index} aria-label={label} onClick={() => ctx?.open(index)}>{children}</button>;
}
