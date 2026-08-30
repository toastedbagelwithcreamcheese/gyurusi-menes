"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { PHOTOS } from "@/components/Photo";

const NAV = [
  { href: "#programok", label: "Programok", id: "programok" },
  { href: "#menes", label: "A ménes", id: "menes" },
  { href: "#huculosveny", label: "Huculösvény", id: "huculosveny" },
  { href: "#esemenyek", label: "Események", id: "esemenyek" },
  { href: "#galeria", label: "Galéria", id: "galeria" },
  { href: "#kapcsolat", label: "Kapcsolat", id: "kapcsolat" },
];

/**
 * Fejléc három állapottal:
 *   · a hero fölött: átlátszó, teljes szélességű, világos szöveg;
 *   · görgetve: a fejléc egy lebegő, üveges pillé húzódik össze középen;
 *   · lefelé görgetve elbújik, fölfelé visszajön (nem takarja a tartalmat olvasás közben).
 * A linkek alatt egy közös „csúszka" jár az egér után, és az aktuális szekciót jelöli.
 * Telefonon teljes képernyős menü: fotó + nagy címek, lépcsősen. Görgetés-figyelő
 * helyett rAF-fal ritkított scroll, a szekciót IntersectionObserver követi.
 */
export function Header({ phone, subpage = false }: { phone?: string; subpage?: boolean }) {
  const [compact, setCompact] = useState(subpage);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => { const r = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(r); }, []);

  /* Rejtés hiszterézissel: csak akkor bújik el, ha legalább 28 px-t görgettél LEFELÉ egyhuzamban
     (és túl vagy a herón), és csak akkor jön vissza, ha 12 px-t FÖLFELÉ. Egy-két pixeles
     irányváltás így nem kapcsolgatja — ez adta a villogást. */
  /* A fejléc mindig látszik; görgetve csak a formája vált (teljes sáv → lebegő pill). */
  useEffect(() => {
    const onScroll = () => setCompact(subpage || window.scrollY > 64);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [subpage]);

  useEffect(() => {
    if (subpage) return;
    const secs = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    if (!secs.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (vis) setActive(vis.target.id);
    }, { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.2, 0.5] });
    secs.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [subpage]);

  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);

  /* A csúszka: az egér alatti linkre úszik; egér nélkül az aktív szekción áll. */
  function movePill(target: HTMLElement | null) {
    const pill = pillRef.current, nav = navRef.current;
    if (!pill || !nav) return;
    if (!target) { pill.style.opacity = "0"; return; }
    const r = target.getBoundingClientRect(), n = nav.getBoundingClientRect();
    pill.style.opacity = "1";
    pill.style.transform = `translateX(${r.left - n.left}px)`;
    pill.style.width = `${r.width}px`;
  }
  useEffect(() => {
    const el = navRef.current?.querySelector<HTMLElement>(`a[data-id="${active}"]`) ?? null;
    movePill(el);
  }, [active, compact]);

  const tel = phone ? `tel:${phone.replace(/\s/g, "")}` : undefined;
  const foal = PHOTOS["csiko-portre"];

  return (
    <>
      <header className={`hdr ${compact ? "compact" : ""} ${open ? "open" : ""} ${mounted ? "in" : ""}`}>
        <div className="hdr-bar">
          <Link href={subpage ? "/" : "#top"} className="brand" onClick={() => setOpen(false)} aria-label="Gyűrűsi Ménes – főoldal">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" width="22" height="22"><path d="M6 26c1-7 4-12 9-15l2-5 3 4c3 1 5 3 6 7l-4-1c-1 4-4 8-8 10H6z" fill="currentColor"/></svg>
            </span>
            <span className="brand-name"><span className="brand-line">Gyűrűsi Ménes</span></span>
          </Link>

          <nav ref={navRef} className="hdr-nav" aria-label="Fő menü" onMouseLeave={() => movePill(navRef.current?.querySelector(`a[data-id="${active}"]`) ?? null)}>
            <span ref={pillRef} className="hdr-pill" aria-hidden="true" />
            {NAV.map((n, i) => (
              <Link key={n.id} href={subpage ? `/${n.href}` : n.href} data-id={n.id} aria-current={active === n.id ? "location" : undefined}
                style={{ transitionDelay: `${120 + i * 45}ms` }} onMouseEnter={(e) => movePill(e.currentTarget)}>
                <span className="hdr-link-line">{n.label}</span>
              </Link>
            ))}
          </nav>

          <div className="hdr-cta">
            {tel && <a href={tel} className="hdr-phone"><span className="hdr-phone-dot" aria-hidden="true" />{phone}</a>}
            <button type="button" className="burger" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)}>
              <span className="sr-only">{open ? "Menü bezárása" : "Menü megnyitása"}</span>
              <span aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div id="mobile-menu" className="mnav" data-open={open} aria-hidden={!open}>
        <div className="mnav-photo" aria-hidden="true">
          {foal && <Image src={foal.src} alt="" fill sizes="50vw" style={{ objectFit: "cover", objectPosition: "50% 30%" }} />}
        </div>
        <div className="mnav-body">
          <nav aria-label="Mobil menü">
            {NAV.map((n, i) => (
              <Link key={n.id} href={subpage ? `/${n.href}` : n.href} onClick={() => setOpen(false)} style={{ transitionDelay: open ? `${140 + i * 55}ms` : "0ms" }}>
                <span className="mnav-idx" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <span className="mnav-label">{n.label}</span>
              </Link>
            ))}
          </nav>
          <div className="mnav-foot" style={{ transitionDelay: open ? "520ms" : "0ms" }}>
            <p className="eyebrow">Gyűrűs, Zala</p>
            {tel && <a href={tel} className="btn btn-light" onClick={() => setOpen(false)}>Hívás: {phone}</a>}
          </div>
        </div>
      </div>
    </>
  );
}
