import { isLang, type Lang } from "@/content/types";

type Tag = { tag: string; q: number; i: number };

/** Az `Accept-Language` nyelvcímkéi a böngésző súlyozott sorrendjében (a `*` és a q=0 nélkül). */
function tags(header: string): Tag[] {
  return header.split(",").map((part, i) => {
    const [tag = "", ...params] = part.trim().split(";");
    let q = 1;
    for (const p of params) { const m = p.trim().match(/^q=(\d*\.?\d+)$/i); if (m) q = Number(m[1]); }
    return { tag: tag.trim().toLowerCase(), q, i };
  }).filter((t) => /^[a-z]{2,8}(-[a-z0-9]{1,8})*$/.test(t.tag) && t.q > 0).sort((a, b) => b.q - a.q || a.i - b.i);
}

/** Nyelv az `Accept-Language` fejlécből: az első támogatott nyelv a böngésző súlyozott sorrendjében. */
export function negotiate(header: string | null | undefined): Lang | null {
  if (!header) return null;
  for (const t of tags(header)) { const primary = t.tag.split("-")[0]; if (isLang(primary)) return primary; }
  return null;
}

/**
 * A látogató nyelve: ha a böngésző felsorol magyart, angolt vagy németet, a legelöl állót kapja. Ha csak más nyelvet
 * kér (pl. lengyel, szlovák, cseh, francia, olasz — a hucul-közösség jó része ilyen), angolt: azt nagyobb eséllyel érti,
 * mint a magyart. Ha nincs értelmes nyelvcímke (üres fejléc vagy csak `*`), null — a hívó a magyarra esik vissza.
 */
export function preferredLang(header: string | null | undefined): Lang | null {
  if (!header) return null;
  return negotiate(header) ?? (tags(header).length ? "en" : null);
}

/** Robot és link-előnézet: a gyökéren a magyar oldalt kapja, átirányítás nélkül (a hreflang mondja meg a többit). */
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|facebot|whatsapp|telegram|twitterbot|linkedin|pinterest|discord|skype|preview|embedly|lighthouse|headless|curl\/|wget\//i;
export function isBot(userAgent: string | null | undefined): boolean { return BOT.test(userAgent ?? ""); }
