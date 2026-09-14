"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Dictionary, Lang } from "@/content/types";
import { langPath } from "@/lib/paths";
import { LangMenu, LangSwitch } from "./LangSwitch";

const KEYS = ["huculosveny", "turak", "oktatas", "taborok", "egyesulet", "esemenyek"] as const;

/**
 * Fejléc: a hero fölött átlátszó, teljes szélességű; görgetve lebegő üveg-pillé húzódik össze.
 * Mindig látszik (nem rejtőzik görgetésre — a megbízó kérése). A linkek alatt közös csúszka jár
 * az egér után, és az aktuális aloldalt jelöli. Telefonon teljes képernyős menü: fotó + nagy címek.
 * A belépő (márkanév, menüpontok, nyelvváltó, hívás-gomb) CSS-animáció (globals.css, P7-blokk): a fejléc nem vár a hidratálásra.
 * `menuPhoto`: a mobil menü fotója propként — így a teljes fotó-manifest (photos.json) nem kerül a kliens-csomagba.
 */
export function Header({ lang, d, phone, rest, subpage = false, menuPhoto }: { lang: Lang; d: Dictionary; phone?: string; rest: string; subpage?: boolean; menuPhoto?: { src: string; color?: string } }) {
  const [compact, setCompact] = useState(subpage);
  const [open, setOpen] = useState(false);
  /* A menü fotója csak az első nyitás után kerül a DOM-ba: a zárt menü is a nézetben áll, így a lusta betöltés is letöltené. */
  const [menuSeen, setMenuSeen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const active = KEYS.find((k) => rest === `/${k}` || rest.startsWith(`/${k}/`)) ?? null;

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
  useEffect(() => { movePill(navRef.current?.querySelector<HTMLElement>(`a[data-id="${active}"]`) ?? null); }, [active, compact]);

  const tel = phone ? `tel:${phone.replace(/\s/g, "")}` : undefined;
  const items = KEYS.map((k) => ({ id: k, href: langPath(lang, `/${k}`), label: d.nav[k] }));

  return (
    <>
      <header className={`hdr in ${compact ? "compact" : ""} ${open ? "open" : ""}`}>
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
                style={{ animationDelay: `${120 + i * 40}ms` }} onMouseEnter={(e) => movePill(e.currentTarget)}>
                <span className="hdr-link-line">{n.label}</span>
              </Link>
            ))}
          </nav>

          <div className="hdr-cta">
            {/* 1240 px fölött három kód; 900–1240 px között (álló tablet, kis laptop) egy lenyíló, hogy a hosszabb német menü is elférjen. */}
            <LangSwitch lang={lang} rest={rest} label={d.lang_.label} className="hdr-lang" />
            <LangMenu lang={lang} rest={rest} label={d.lang_.label} className="hdr-lang-menu" />
            {tel && <a href={tel} className="hdr-phone" aria-label={`${d.nav.call}: ${phone}`}><svg className="hdr-phone-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.9 2z"/></svg><span className="hdr-phone-num">{phone}</span></a>}
            <button type="button" className="burger" aria-expanded={open} aria-controls="mobile-menu" onClick={() => { setOpen((o) => !o); setMenuSeen(true); }}>
              <span className="sr-only">{open ? d.nav.menuClose : d.nav.menuOpen}</span>
              <span aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div id="mobile-menu" className="mnav" data-open={open} aria-hidden={!open}>
        <div className="mnav-photo" aria-hidden="true">
          {menuPhoto && menuSeen && <Image src={menuPhoto.src} alt="" fill sizes="50vw" quality={62} style={{ objectFit: "cover", objectPosition: "50% 30%", backgroundColor: menuPhoto.color }} />}
        </div>
        <div className="mnav-body">
          <nav aria-label={d.nav.mobileMenu}>
            {items.map((n, i) => (
              /* A zárt menü linkjei is a nézetben állnak (csak átlátszók), és a Next előre letöltené a lapjaikat — a betöltés alatt.
                 Csak nyitott menünél van előtöltés. */
              <Link key={n.id} href={n.href} prefetch={open ? null : false} onClick={() => setOpen(false)} aria-current={active === n.id ? "page" : undefined} style={{ transitionDelay: open ? `${140 + i * 50}ms` : "0ms" }}>
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
