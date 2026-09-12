import { isLang, type Lang } from "@/content/types";

/** Nyelv az `Accept-Language` fejlécből: az első támogatott nyelv a böngésző súlyozott sorrendjében. */
export function negotiate(header: string | null | undefined): Lang | null {
  if (!header) return null;
  const tags = header.split(",").map((part, i) => {
    const [tag = "", ...params] = part.trim().split(";");
    let q = 1;
    for (const p of params) { const m = p.trim().match(/^q=(\d*\.?\d+)$/i); if (m) q = Number(m[1]); }
    return { tag: tag.trim().toLowerCase(), q, i };
  }).filter((t) => t.tag && t.tag !== "*" && t.q > 0).sort((a, b) => b.q - a.q || a.i - b.i);
  for (const t of tags) { const primary = t.tag.split("-")[0]; if (isLang(primary)) return primary; }
  return null;
}

/** Robot és link-előnézet: a gyökéren a magyar oldalt kapja, átirányítás nélkül (a hreflang mondja meg a többit). */
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|facebot|whatsapp|telegram|twitterbot|linkedin|pinterest|discord|skype|preview|embedly|lighthouse|headless|curl\/|wget\//i;
export function isBot(userAgent: string | null | undefined): boolean { return BOT.test(userAgent ?? ""); }
