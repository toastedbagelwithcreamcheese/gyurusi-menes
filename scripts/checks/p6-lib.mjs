/**
 * Közös segédek a P6 (SEO és GEO) kapuszkriptjeihez: HTTP a futó szerver ellen (BASE_URL), HTML-címkék
 * olvasása, a nyilvános lapok bejárása és képméret a PNG/JPEG fejlécéből — függőség nélkül, sima Node-dal.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const LANGS = ["hu", "en", "de"];
export const PAGE_KEYS = ["huculosveny", "turak", "oktatas", "taborok", "egyesulet"];
/** A keresőrobot nézete: robotként nincs nyelvi átirányítás, és a metaadat blokkolóan a <head>-be kerül. */
export const BOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

export const get = (p, init = {}) =>
  fetch(/^https?:/.test(p) ? p : BASE + p, { redirect: "manual", ...init, headers: { "user-agent": BOT_UA, ...(init.headers ?? {}) } });
export const langPath = (l, p) => (l === "hu" ? p : p === "/" ? `/${l}` : `/${l}${p}`);
/** Útvonal-összevetéshez: pathname záró perjel nélkül (a gyökér marad „/”). */
export const pathOf = (u) => new URL(u, BASE).pathname.replace(/(.)\/+$/, "$1");

export const decode = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
/** A <script> blokkok nélküli HTML — az RSC-adatcsomag és a JSON-LD ne adjon hamis címke-találatot. */
export const stripScripts = (html) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
/** Egy címke attribútumai kisbetűs névvel (a React a hreflang-ot hrefLang-ként írja ki). */
export function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/\s([a-zA-Z][\w:-]*)\s*=\s*"([^"]*)"/g)) out[m[1].toLowerCase()] = decode(m[2]);
  return out;
}
export const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}(?=[\\s/>])[^>]*>`, "gi"))].map((m) => attrs(m[0]));

/** A nyilvános lapok nyelvi előtag nélkül: a fix lapok + a (magyar) naptárban linkelt összes esemény. */
export async function publicPaths() {
  const r = await get("/esemenyek");
  if (r.status !== 200) throw new Error(`/esemenyek → HTTP ${r.status}`);
  const html = stripScripts(await r.text());
  const ids = [...new Set([...html.matchAll(/href="\/esemenyek\/([^"/?#]+)"/g)].map((m) => decodeURIComponent(m[1])))];
  return ["/", ...PAGE_KEYS.map((k) => `/${k}`), "/esemenyek", ...ids.map((id) => `/esemenyek/${id}`), "/adatkezeles", "/impresszum"];
}

/** Képméret a fájl fejlécéből (PNG: IHDR; JPEG: az első SOFn szegmens). */
export function imageSize(buf) {
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { type: "png", w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 8 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker === 0xff) { i++; continue; }
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { type: "jpeg", h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

/** Zárás: minden hiba FAIL-sorként, nem nulla kilépési kód; hiba nélkül az összegzés és a PASS-sor. */
export function report(name, problems, summary) {
  if (problems.length) {
    for (const p of problems) console.error("FAIL:", p);
    console.error(`FAIL: ${name} — ${problems.length} hiba`);
    process.exit(1);
  }
  if (summary) console.log(summary);
  console.log(`PASS: ${name}`);
}
