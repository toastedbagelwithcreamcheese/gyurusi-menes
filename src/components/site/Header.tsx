"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/#programok", label: "Programok" },
  { href: "/#menes", label: "A ménes" },
  { href: "/#esemenyek", label: "Események" },
  { href: "/#galeria", label: "Galéria" },
  { href: "/#kapcsolat", label: "Kapcsolat" },
];

/** Fejléc: a hero fölött átlátszó, görgetésre csontfehér. Mobilon teljes képernyős menü. */
export function Header({ phone }: { phone?: string }) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);

  return (
    <header className={`hdr ${solid || open ? "solid" : ""}`}>
      <div className="wrap hdr-in">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="28" height="28"><path d="M6 26c1-7 4-12 9-15l2-5 3 4c3 1 5 3 6 7l-4-1c-1 4-4 8-8 10H6z" fill="currentColor"/></svg>
          </span>
          <span>Gyűrűsi Ménes</span>
        </Link>
        <nav className="hdr-nav" aria-label="Fő menü">
          {NAV.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
        </nav>
        <div className="hdr-cta">
          {phone && <a href={`tel:${phone.replace(/\s/g, "")}`} className="btn btn-sm hdr-phone">{phone}</a>}
          <button type="button" className="burger" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)}>
            <span className="sr-only">{open ? "Menü bezárása" : "Menü megnyitása"}</span>
            <span aria-hidden="true" />
          </button>
        </div>
      </div>
      <div id="mobile-menu" className="mnav" data-open={open}>
        <nav aria-label="Mobil menü">
          {NAV.map((n, i) => <Link key={n.href} href={n.href} onClick={() => setOpen(false)} style={{ transitionDelay: open ? `${60 + i * 40}ms` : "0ms" }}>{n.label}</Link>)}
        </nav>
        {phone && <a href={`tel:${phone.replace(/\s/g, "")}`} className="btn btn-light" onClick={() => setOpen(false)}>Hívás: {phone}</a>}
      </div>
    </header>
  );
}
