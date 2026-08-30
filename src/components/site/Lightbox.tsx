"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import type { ImageMeta } from "@/lib/images";

/**
 * Natív <dialog> alapú lightbox, függőség nélkül. Billentyű: ←/→/Esc.
 * A galériarács gombjai nyitják; a képek csak megnyitáskor töltődnek.
 */
export function Gallery({ items }: { items: Array<{ id: string } & ImageMeta & { caption?: string }> }) {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  const step = useCallback((d: number) => setOpen((i) => (i === null ? null : (i + d + items.length) % items.length)), [items.length]);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open !== null && !dlg.open) dlg.showModal();
    if (open === null && dlg.open) dlg.close();
  }, [open]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, step]);

  const cur = open !== null ? items[open] : null;

  return (
    <>
      <ul className="gal" role="list">
        {items.map((im, i) => (
          <li key={im.id} className={im.height > im.width ? "tall" : ""}>
            <button type="button" className="gal-btn" onClick={() => setOpen(i)} aria-label={`${im.alt} – nagyítás`}>
              <Image src={im.src} alt={im.alt} width={im.width} height={im.height} sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 400px" quality={62} placeholder={im.blur ? "blur" : "empty"} blurDataURL={im.blur} style={{ backgroundColor: im.color }} loading="lazy" />
            </button>
          </li>
        ))}
      </ul>
      <dialog ref={ref} className="lb" onClose={() => setOpen(null)} onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }} aria-label="Képnéző">
        {cur && (
          <figure className="lb-fig">
            <Image key={cur.id} src={cur.src} alt={cur.alt} width={cur.width} height={cur.height} sizes="100vw" priority style={{ backgroundColor: cur.color }} />
            <figcaption className="lb-cap">{cur.caption ?? cur.alt}<span className="tabular"> · {open! + 1}/{items.length}</span></figcaption>
          </figure>
        )}
        <button type="button" className="lb-x" onClick={() => setOpen(null)} aria-label="Bezárás">×</button>
        <button type="button" className="lb-nav lb-prev" onClick={() => step(-1)} aria-label="Előző kép">‹</button>
        <button type="button" className="lb-nav lb-next" onClick={() => step(1)} aria-label="Következő kép">›</button>
      </dialog>
    </>
  );
}
