"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { PHOTOS } from "@/components/Photo";
import type { Dictionary, Lang } from "@/content/types";
import { langPath } from "@/lib/paths";
import { LangMenu, LangSwitch } from "./LangSwitch";

const KEYS = ["huculosveny", "turak", "oktatas", "taborok", "egyesulet", "esemenyek"] as const;

/**
 * Fejléc: a hero fölött átlátszó, teljes szélességű; görgetve lebegő üveg-pillé húzódik össze.
 * Mindig látszik (nem rejtőzik görgetésre — a megbízó kérése). A linkek alatt közös csúszka jár
 * az egér után, és az aktuális aloldalt jelöli. Telefonon teljes képernyős menü: fotó + nagy címek.
 */
export function Header({ lang, d, phone, rest, subpage = false }: { lang: Lang; d: Dictionary; phone?: string; rest: string; subpage?: boolean }) {
  const [compact, setCompact] = useState(subpage);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const active = KEYS.find((k) => rest === `/${k}` || rest.startsWith(`/${k}/`)) ?? null;

  useEffect(() => { const r = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(r); }, []);
  useEffect(() => {
    const onScroll = () => setCompact(subpage || window.scrollY > 64);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [subpage]);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);

  function movePill(target: HTMLElement | null) {
    const pill = pillRef.current, nav = navRef.current;
    if (!pill || !nav) return;
    if (!target) { pill.style.opacity = "0"; return; }
    const r = target.getBoundingClientRect(), n = nav.getBoundingClientRect();
    pill.style.opacity = "1"; pill.style.transform = `translateX(${r.left - n.left}px)`; pill.style.width = `${r.width}px`;
  }
  useEffect(() => { movePill(navRef.current?.querySelector<HTMLElement>(`a[data-id="${active}"]`) ?? null); }, [active, compact, mounted]);

  const tel = phone ? `tel:${phone.replace(/\s/g, "")}` : undefined;
  const foal = PHOTOS["csiko-portre"];
  const items = KEYS.map((k) => ({ id: k, href: langPath(lang, `/${k}`), label: d.nav[k] }));

  return (
    <>
      <header className={`hdr ${compact ? "compact" : ""} ${open ? "open" : ""} ${mounted ? "in" : ""}`}>
        <div className="hdr-bar">
          <Link href={langPath(lang)} className="brand" onClick={() => setOpen(false)} aria-label={d.nav.home}>
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" width="22" height="22"><path d="M6 26c1-7 4-12 9-15l2-5 3 4c3 1 5 3 6 7l-4-1c-1 4-4 8-8 10H6z" fill="currentColor"/></svg>
            </span>
            <span className="brand-name"><span className="brand-line">Gyűrűsi Ménes</span></span>
          </Link>

          <nav ref={navRef} className="hdr-nav" aria-label={d.nav.mainMenu} onMouseLeave={() => movePill(navRef.current?.querySelector(`a[data-id="${active}"]`) ?? null)}>
            <span ref={pillRef} className="hdr-pill" aria-hidden="true" />
            {items.map((n, i) => (
              <Link key={n.id} href={n.href} data-id={n.id} aria-current={active === n.id ? "page" : undefined}
                style={{ transitionDelay: `${120 + i * 40}ms` }} onMouseEnter={(e) => movePill(e.currentTarget)}>
                <span className="hdr-link-line">{n.label}</span>
              </Link>
            ))}
          </nav>

          <div className="hdr-cta">
            {/* 1240 px fölött három kód; 900–1240 px között (álló tablet, kis laptop) egy lenyíló, hogy a hosszabb német menü is elférjen. */}
            <LangSwitch lang={lang} rest={rest} label={d.lang_.label} className="hdr-lang" />
            <LangMenu lang={lang} rest={rest} label={d.lang_.label} className="hdr-lang-menu" />
            {tel && <a href={tel} className="hdr-phone" aria-label={`${d.nav.call}: ${phone}`}><svg className="hdr-phone-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.9 2z"/></svg><span className="hdr-phone-num">{phone}</span></a>}
            <button type="button" className="burger" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)}>
              <span className="sr-only">{open ? d.nav.menuClose : d.nav.menuOpen}</span>
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
          <nav aria-label={d.nav.mobileMenu}>
            {items.map((n, i) => (
              <Link key={n.id} href={n.href} onClick={() => setOpen(false)} aria-current={active === n.id ? "page" : undefined} style={{ transitionDelay: open ? `${140 + i * 50}ms` : "0ms" }}>
                <span className="mnav-idx" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <span className="mnav-label">{n.label}</span>
              </Link>
            ))}
          </nav>
          <div className="mnav-foot" style={{ transitionDelay: open ? "500ms" : "0ms" }}>
            <LangSwitch lang={lang} rest={rest} label={d.lang_.label} className="mnav-lang" onPick={() => setOpen(false)} />
            <p className="eyebrow">{d.nav.place}</p>
            {tel && <a href={tel} className="btn btn-light" onClick={() => setOpen(false)}>{d.nav.call}: {phone}</a>}
          </div>
        </div>
      </div>
    </>
  );
}
