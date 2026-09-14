"use client";

import { useEffect, useRef } from "react";
import { LANGS, type Lang } from "@/content/types";
import { langPath, LANG_COOKIE, LANG_NAMES } from "@/lib/paths";

/** A választás sütibe (egy év), hogy a gyökér-látogatásnál a proxy ne az Accept-Language-ből találgasson. */
function remember(l: Lang) {
  try { document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`; } catch { /* a link sütik nélkül is visz */ }
}

/**
 * Nyelvváltó: három sima link ugyanarra az oldalra a másik nyelven — JS nélkül is működik.
 * `rest` az útvonal nyelvi előtag nélkül (pl. "/turak"), így a váltás nem dob a főoldalra.
 */
export function LangSwitch({ lang, rest, label, className = "", onPick, full = false }: { lang: Lang; rest: string; label: string; className?: string; onPick?: () => void; full?: boolean }) {
  return (
    <nav aria-label={label} className={`lang ${full ? "lang-full" : ""} ${className}`}>
      {LANGS.map((l) => (
        <a key={l} href={langPath(l, rest)} hrefLang={l} lang={l} aria-current={l === lang ? "page" : undefined}
          aria-label={`${l.toUpperCase()} – ${LANG_NAMES[l]}`} onClick={() => { remember(l); onPick?.(); }}>
          {full ? LANG_NAMES[l] : l}
        </a>
      ))}
    </nav>
  );
}

/**
 * Nyelvválasztó lenyíló a fejlécben, a 900–1240 px-es sávban: ott a teljes menü mellett a három kód nem fér el
 * (németül 1024 px-en ~75 px-t lógott ki a sávból, levágva a hívás-gombot). Natív <details>, így JS nélkül is nyílik;
 * JS-sel kívülre kattintva vagy Esc-re bezáródik. Az állapot a DOM-ban él (nincs React-állapot, nincs effektben setState).
 */
export function LangMenu({ lang, rest, label, className = "" }: { lang: Lang; rest: string; label: string; className?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const onPointer = (e: PointerEvent) => { const el = ref.current; if (el?.open && !el.contains(e.target as Node)) el.open = false; };
    const onKey = (e: KeyboardEvent) => {
      const el = ref.current;
      if (e.key !== "Escape" || !el?.open) return;
      const inside = el.contains(document.activeElement);
      el.open = false;
      if (inside) el.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, []);
  return (
    <details ref={ref} className={`lang-menu ${className}`} data-lang-menu>
      <summary aria-label={`${label}: ${LANG_NAMES[lang]}`}>
        <span aria-hidden="true">{lang}</span>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </summary>
      <nav aria-label={label} className="lang-menu-list">
        {LANGS.map((l) => (
          <a key={l} href={langPath(l, rest)} hrefLang={l} lang={l} aria-current={l === lang ? "page" : undefined} onClick={() => remember(l)}>
            <span>{LANG_NAMES[l]}</span><span className="lang-menu-code" aria-hidden="true">{l}</span>
          </a>
        ))}
      </nav>
    </details>
  );
}
