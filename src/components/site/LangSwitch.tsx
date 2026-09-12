"use client";

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
