/**
 * Képváltozatok előmelegítése egy deploy után (P7). A Netlify képszolgáltatása (a /_next/image kérést a Next-plugin a
 * /.netlify/images-re irányítja) egy változatot az első kérésnél alakít át — ez lassú, és enélkül a látogató várná ki.
 * A szkript a nyilvános lapok LCP-képeit — főoldali hero, aloldali és eseménylapi képfej, a naptár kiemelt képe — előre lekéri
 * 640 / 750 / 828 / 1080 / 1200 px szélességben, AVIF- és WebP-Accept-fejléccel is (a formátumot a fejléc dönti el, külön tárolódik).
 * A képeket az élő lapok HTML-jéből olvassa (a <link rel="preload" as="image"> srcset-jéből), így az adminban cserélt kép is jön,
 * ugyanazzal a minőséggel (q), amit a lap kér.
 *
 *   BASE_URL=https://gyurusi-menes-demo.netlify.app node scripts/warm-images.mjs
 *
 * Változók: WIDTHS (alap: 640,750,828,1080,1200 — a next.config képszélességei közül), CONCURRENCY (alap: 4),
 * PATHS (vesszővel elválasztott lapok; alap: a /sitemap.xml magyar címei), REPEAT=1 (második kör: gyorsítótárból jön-e).
 * Kilépési kód 1, ha egy lap nem olvasható, nincs előtöltött kép, vagy egy változat nem 200-as képválaszt ad.
 */
const BASE = (process.env.BASE_URL ?? "").replace(/\/$/, "");
if (!BASE) { console.error("FAIL: warm-images — add meg a BASE_URL-t (pl. BASE_URL=https://gyurusi-menes-demo.netlify.app)"); process.exit(1); }
const WIDTHS = (process.env.WIDTHS ?? "640,750,828,1080,1200").split(",").map((w) => Number(w.trim())).filter((w) => w > 0);
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY ?? 4));
/* A Chrome és a Safari tipikus képkérése: az első AVIF-et, a második (régebbi böngészők) WebP-et kap. */
const ACCEPT = { avif: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8", webp: "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8" };
const FALLBACK_PATHS = ["/", "/huculosveny", "/turak", "/oktatas", "/taborok", "/egyesulet", "/esemenyek"];
const problems = [];
const kb = (n) => `${Math.round(n / 1024)} KB`;
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

/** A bejárandó lapok: a sitemap magyar (előtag nélküli) címei — a képek nyelvenként ugyanazok. */
async function pagePaths() {
  if (process.env.PATHS) return process.env.PATHS.split(",").map((p) => p.trim()).filter(Boolean);
  try {
    const res = await fetch(`${BASE}/sitemap.xml`);
    const xml = res.ok ? await res.text() : "";
    const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(decode(m[1])).pathname).filter((p) => !/^\/(en|de)(\/|$)/.test(p));
    if (paths.length) return [...new Set(paths)];
  } catch { /* tartalék lista */ }
  return FALLBACK_PATHS;
}

/** Egy lap előtöltött képei: { src, q } a <link rel="preload" as="image" imageSrcSet="…"> bejegyzéseiből. */
async function preloadedImages(p) {
  const res = await fetch(BASE + p, { headers: { "accept-language": "hu" }, redirect: "follow" });
  if (res.status !== 200) { problems.push(`${p}: a lap HTTP ${res.status}`); return []; }
  const html = await res.text();
  const out = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*\brel="preload"[^>]*>/gi)) {
    if (!/\bas="image"/i.test(tag)) continue;
    const set = tag.match(/\bimagesrcset="([^"]+)"/i)?.[1];
    for (const entry of decode(set ?? "").split(/,\s+/)) {
      const u = entry.trim().split(/\s+/)[0];
      if (!u.includes("/_next/image")) continue;
      const q = new URL(u, BASE).searchParams;
      if (q.get("url")) out.push({ src: q.get("url"), q: q.get("q") ?? "75" });
    }
  }
  return out;
}

async function pool(items, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => { while (i < items.length) { const it = items[i++]; await fn(it); } }));
}

const t0 = Date.now();
const paths = await pagePaths();
const images = new Map(); // src|q → { src, q, pages }
for (const p of paths) {
  const found = await preloadedImages(p);
  if (found.length === 0) console.log(`  ${p}: nincs előtöltött kép (a lap LCP-je szöveg)`);
  for (const im of found) { const k = `${im.src}|${im.q}`; if (!images.has(k)) images.set(k, { ...im, pages: new Set() }); images.get(k).pages.add(p); }
}
if (images.size === 0) problems.push("egyetlen lapon sincs előtöltött kép — nincs mit melegíteni (változott a lapok képkezelése?)");

const variants = [...images.values()].flatMap((im) => WIDTHS.flatMap((w) => Object.keys(ACCEPT).map((fmt) => ({ im, w, fmt }))));
console.log(`warm-images: ${BASE} — ${paths.length} lap, ${images.size} kép × ${WIDTHS.length} szélesség × ${Object.keys(ACCEPT).length} formátum = ${variants.length} változat`);

async function round(label) {
  const results = [];
  await pool(variants, async ({ im, w, fmt }) => {
    const url = `${BASE}/_next/image?url=${encodeURIComponent(im.src)}&w=${w}&q=${im.q}`;
    const started = Date.now();
    try {
      const res = await fetch(url, { headers: { accept: ACCEPT[fmt] } });
      const body = new Uint8Array(await res.arrayBuffer());
      const type = res.headers.get("content-type") ?? "";
      const cache = res.headers.get("cache-status") ?? res.headers.get("x-nextjs-cache") ?? "";
      results.push({ im, w, fmt, status: res.status, type, bytes: body.length, ms: Date.now() - started, cache });
      if (res.status !== 200 || !type.startsWith("image/") || body.length === 0) problems.push(`${label}: ${im.src} ${w}w ${fmt} → HTTP ${res.status} ${type} ${body.length} B`);
    } catch (e) {
      problems.push(`${label}: ${im.src} ${w}w ${fmt} → ${e instanceof Error ? e.message : e}`);
    }
  });
  for (const im of images.values()) {
    const rs = results.filter((r) => r.im === im).sort((a, b) => a.w - b.w || a.fmt.localeCompare(b.fmt));
    console.log(`  ${im.src} q${im.q} (${[...im.pages].join(", ")})`);
    console.log(`    ${rs.map((r) => `${r.w} ${r.type.replace("image/", "") || r.fmt} ${r.status} ${kb(r.bytes)} ${r.ms} ms${r.cache ? ` [${r.cache.slice(0, 40)}]` : ""}`).join(" · ")}`);
  }
  const ok = results.filter((r) => r.status === 200 && r.type.startsWith("image/")).length;
  const slow = results.reduce((m, r) => Math.max(m, r.ms), 0);
  console.log(`${label}: ${ok}/${variants.length} változat 200, képként; összesen ${kb(results.reduce((s, r) => s + r.bytes, 0))}, leglassabb ${slow} ms`);
}

await round("1. kör");
if (process.env.REPEAT === "1") await round("2. kör (gyorsítótárból?)");
if (problems.length) { console.error(`FAIL: warm-images — ${problems.length} hiba\n  ${problems.join("\n  ")}`); process.exit(1); }
console.log(`OK: warm-images — ${variants.length} változat előmelegítve (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
