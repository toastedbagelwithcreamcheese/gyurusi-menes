/**
 * G23 — SEO-kapu a futó szerver ellen (BASE_URL). Minden nyilvános lap × 3 nyelv:
 *   · egyetlen, egyedi, legfeljebb 60 karakteres title · 70–160 karakteres, egyedi description · nincs noindex
 *   · abszolút, önmagára mutató canonical, ami 200-at ad · hreflang hu/en/de + x-default, abszolút és kölcsönös
 *   · pontosan egy H1 · lapfüggő og:image, 1200×630 a meta szerint ÉS a letöltött kép fejléce szerint
 *   · og:locale + og:locale:alternate, twitter:card · minden <img>-nek van alt-ja, és en/de lapon nem magyar
 *   · 404: HTTP 404, noindex, saját cím nyelvenként · sitemap: minden nyilvános URL, alternatívákkal és lastmod-dal
 *   · a régi WordPress-címek 301-gyel a helyes célra (záró perjellel és anélkül), a cél 200
 * Használat: node scripts/with-server.mjs node scripts/checks/p6-seo.mjs  (SITE_URL megadásával a canonical eredetét is nézi)
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { BASE, LANGS, ROOT, decode, get, imageSize, langPath, pathOf, publicPaths, report, stripScripts, tags } from "./p6-lib.mjs";

const problems = [];
const bad = (m) => problems.push(m);
const OG_LOCALE = { hu: "hu_HU", en: "en_GB", de: "de_DE" };
const SITE = process.env.SITE_URL?.replace(/\/$/, "");

/* ---------- képleírás nyelve ---------- */
/** Tulajdonnevek és a más nyelvekben is használt magyar szavak — ezek ékezete nem jelenti, hogy a leírás magyar. */
const PROPER = [/Gyűrűsi Ménes/g, /Gyűrűs\p{L}*/gu, /Vörös József|József Vörös/g, /Varga-Kovács Emese|Emese Varga-Kovács/g, /Zala\p{L}*/gu,
  /Mezőhegyes/g, /Bábolna/g, /Petőfi Sándor/g, /Zalaegerszeg/g, /csikós\p{L}*/giu, /Hroby Luna|Goral Csellengő|Pietrosu Picúr/g];
const HU_WORDS = /(?<!\p{L})(és|az|egy|között|közben|mellett|alatt|után|lovas\p{L}*|lovak\p{L}*|lóval|lovon|csikó\p{L}*|gyerek\p{L}*|pálya\p{L}*|ménes\p{L}*|drónfelvétel\p{L}*|feladat\p{L}*|naplement\p{L}*|istálló\p{L}*|közösség\p{L}*|fehér|fekete|lány|sorfal\p{L}*)(?!\p{L})/iu;
function looksHungarian(text, lang) {
  let s = text;
  for (const re of PROPER) s = s.replace(re, " ");
  if (HU_WORDS.test(s)) return true;
  /* A német ä/ö/ü rendes betű; az á/é/í/ó/ú/ő/ű viszont magyar. Angol szövegben semmilyen ékezet nem várható. */
  return lang === "de" ? /[áéíóúőűÁÉÍÓÚŐŰ]/.test(s) : /[áéíóöúüőűÁÉÍÓÖÚÜŐŰ]/.test(s);
}
const dupes = (pairs) => { const m = new Map(); for (const [k, v] of pairs) m.set(k, [...(m.get(k) ?? []), v]); return [...m].filter(([, v]) => v.length > 1); };
/** Kölcsönös hreflang: a három nyelvi változat ugyanazt az alternatíva-készletet adja (útvonal szerint). */
const altKey = (alts) => JSON.stringify(Object.entries(alts ?? {}).map(([k, v]) => [k, pathOf(v)]).sort());
const reciprocal = (group) => LANGS.every((l) => altKey(group.get(l)) === altKey(group.get(LANGS[0])));

/* ---------- önteszt: minden detektor tényleg el tud bukni (pozitív kontroll) ---------- */
const selfTest = (label, ok) => { if (!ok) bad(`önteszt: ${label}`); };
selfTest("magyar képleírás angol lapon → jelez", looksHungarian("Drónfelvétel naplementében: lovasok V-alakban a gyűrűsi versenypályán", "en"));
selfTest("ékezet nélküli magyar szó → jelez", looksHungarian("Hucul lovak a kozelben", "de"));
selfTest("angol leírás magyar tulajdonnévvel → nem jelez", !looksHungarian("Drone shot at sunset: riders in a V formation at Gyűrűsi Ménes in Gyűrűs", "en"));
selfTest("német leírás umlauttal → nem jelez", !looksHungarian("Drohnenaufnahme: Reiter über den Hügeln von Zala bei Gyűrűs", "de"));
selfTest("ismétlődés-kereső", dupes([["a", "/"], ["b", "/x"], ["a", "/y"]]).length === 1);
{
  const png = Buffer.alloc(24); png.set([0x89, 0x50, 0x4e, 0x47]); png.writeUInt32BE(1200, 16); png.writeUInt32BE(630, 20);
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x76, 0x04, 0xb0, 0x03]);
  const small = Buffer.from(jpg); small.writeUInt16BE(600, 13);
  selfTest("PNG-méret", imageSize(png)?.w === 1200 && imageSize(png)?.h === 630);
  selfTest("JPEG-méret", imageSize(jpg)?.w === 1200 && imageSize(jpg)?.h === 630);
  selfTest("eltérő JPEG-méret felismerve", imageSize(small)?.h === 600);
  const ok = new Map(LANGS.map((l) => [l, { hu: "/x", en: "/en/x", de: "/de/x", "x-default": "/x" }]));
  const broken = new Map(ok); broken.set("de", { hu: "/x", en: "/en/y", de: "/de/x", "x-default": "/x" });
  selfTest("kölcsönös hreflang elfogadva", reciprocal(ok));
  selfTest("nem kölcsönös hreflang → jelez", !reciprocal(broken));
}

/* ---------- lapok ---------- */
const paths = await publicPaths();
const titles = [], descs = [], ogs = [], altIssues = [];
const groups = new Map();
for (const p of paths) {
  const group = new Map(); groups.set(p, group);
  for (const l of LANGS) {
    const url = langPath(l, p);
    const r = await get(url);
    if (r.status !== 200) { bad(`${url} → HTTP ${r.status}`); continue; }
    const html = stripScripts(await r.text());
    const metas = tags(html, "meta"), links = tags(html, "link");
    const meta = (k) => metas.filter((m) => m.name === k || m.property === k).map((m) => m.content ?? "");

    const titleTags = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => decode(m[1]).trim());
    if (titleTags.length !== 1) bad(`${url}: ${titleTags.length} db <title>`);
    const title = titleTags[0] ?? "";
    if (!title || title.length > 60) bad(`${url}: a title ${title.length} karakter (legfeljebb 60): „${title}”`);
    titles.push([title, url]);

    const desc = meta("description");
    if (desc.length !== 1) bad(`${url}: ${desc.length} db meta description`);
    const description = desc[0] ?? "";
    if (description.length < 70 || description.length > 160) bad(`${url}: a description ${description.length} karakter (70–160): „${description}”`);
    descs.push([description, url]);
    if (meta("robots").some((x) => /noindex/i.test(x))) bad(`${url}: noindex egy nyilvános lapon`);

    const canon = links.filter((x) => x.rel === "canonical").map((x) => x.href);
    if (canon.length !== 1) bad(`${url}: ${canon.length} db canonical`);
    else if (!/^https?:\/\//.test(canon[0])) bad(`${url}: a canonical nem abszolút: ${canon[0]}`);
    else {
      if (SITE && new URL(canon[0]).origin !== new URL(SITE).origin) bad(`${url}: a canonical eredete ${new URL(canon[0]).origin}, nem ${SITE}`);
      if (pathOf(canon[0]) !== pathOf(url)) bad(`${url}: a canonical máshova mutat: ${canon[0]}`);
      const cr = await get(new URL(canon[0]).pathname);
      if (cr.status !== 200) bad(`${url}: a canonical útvonala (${new URL(canon[0]).pathname}) → HTTP ${cr.status}`);
    }

    const alts = {};
    for (const x of links.filter((x) => x.rel === "alternate" && x.hreflang)) { if (alts[x.hreflang]) bad(`${url}: kétszer szerepel a hreflang="${x.hreflang}"`); alts[x.hreflang] = x.href; }
    group.set(l, alts);
    for (const k of [...LANGS, "x-default"]) {
      if (!alts[k]) bad(`${url}: hiányzik a hreflang="${k}"`);
      else if (!/^https?:\/\//.test(alts[k])) bad(`${url}: a hreflang="${k}" nem abszolút: ${alts[k]}`);
    }
    for (const k of LANGS) if (alts[k] && pathOf(alts[k]) !== pathOf(langPath(k, p))) bad(`${url}: hreflang ${k} → ${alts[k]} (várt: ${langPath(k, p)})`);
    if (alts["x-default"] && pathOf(alts["x-default"]) !== pathOf(langPath("hu", p))) bad(`${url}: az x-default nem a magyar lapra mutat (${alts["x-default"]})`);

    const h1 = (html.match(/<h1\b/gi) || []).length;
    if (h1 !== 1) bad(`${url}: ${h1} db H1`);

    const og = meta("og:image");
    if (og.length !== 1) bad(`${url}: ${og.length} db og:image`);
    else if (!/^https?:\/\//.test(og[0])) bad(`${url}: az og:image nem abszolút: ${og[0]}`);
    else { const u = new URL(og[0]); ogs.push([u.pathname, url, u.pathname + u.search]); }
    if (meta("og:image:width")[0] !== "1200" || meta("og:image:height")[0] !== "630") bad(`${url}: og:image:width×height = ${meta("og:image:width")[0]}×${meta("og:image:height")[0]} (1200×630 várt)`);
    if (meta("og:locale")[0] !== OG_LOCALE[l]) bad(`${url}: og:locale = ${meta("og:locale")[0]} (várt: ${OG_LOCALE[l]})`);
    const altLocales = meta("og:locale:alternate").sort().join(","), wantLocales = LANGS.filter((x) => x !== l).map((x) => OG_LOCALE[x]).sort().join(",");
    if (altLocales !== wantLocales) bad(`${url}: og:locale:alternate = ${altLocales || "—"} (várt: ${wantLocales})`);
    for (const k of ["og:title", "og:description", "og:url"]) if (!meta(k)[0]) bad(`${url}: hiányzik a ${k}`);
    if (meta("twitter:card")[0] !== "summary_large_image") bad(`${url}: twitter:card = ${meta("twitter:card")[0] ?? "—"}`);
    if (!meta("twitter:image")[0]) bad(`${url}: hiányzik a twitter:image`);

    for (const img of tags(html, "img")) {
      if (img.alt === undefined) { bad(`${url}: <img> alt-attribútum nélkül (${img.src ?? "?"})`); continue; }
      if (l !== "hu" && img.alt && looksHungarian(img.alt, l)) altIssues.push(`${url}: „${img.alt}”`);
    }
  }
}
for (const [v, urls] of dupes(titles)) bad(`ismétlődő title „${v}”: ${urls.join(", ")}`);
for (const [v, urls] of dupes(descs)) bad(`ismétlődő description „${v}”: ${urls.join(", ")}`);
for (const [v, urls] of dupes(ogs.map(([pth, url]) => [pth, url]))) bad(`ugyanaz az og:image (${v}) több lapon: ${urls.join(", ")}`);
for (const [p, g] of groups) if (g.size === LANGS.length && !reciprocal(g)) bad(`${p}: a hreflang-készlet nem kölcsönös a három nyelvi változat között`);
if (altIssues.length) bad(`${altIssues.length} képleírás nem az oldal nyelvén (en/de lapon magyar), pl. ${altIssues.slice(0, 6).join(" | ")}`);

/* ---------- megosztási képek: letöltve, a tényleges méret ---------- */
const fetched = new Set();
for (const [, url, rel] of ogs) {
  if (fetched.has(rel)) continue;
  fetched.add(rel);
  const r = await get(rel);
  if (r.status !== 200) { bad(`og:image ${rel} (${url}) → HTTP ${r.status}`); continue; }
  const type = r.headers.get("content-type") ?? "";
  if (!/^image\/(jpeg|png)/.test(type)) bad(`og:image ${rel}: content-type ${type}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const size = imageSize(buf);
  if (!size || size.w !== 1200 || size.h !== 630) bad(`og:image ${rel}: a tényleges méret ${size ? `${size.w}×${size.h}` : "nem olvasható"} (1200×630 várt)`);
  if (buf.length > 600 * 1024) bad(`og:image ${rel}: ${Math.round(buf.length / 1024)} KB — link-előnézethez túl nagy`);
}

/* ---------- 404 ---------- */
/** A várt szövegek a szótárakból (a TS-forrásból olvasva): a lapcím (seo.notFound) és a H1 (notFound.title). */
const NF_TEXT = {};
for (const l of LANGS) {
  const src = await fs.readFile(path.join(ROOT, `src/content/${l}.ts`), "utf8");
  NF_TEXT[l] = { title: src.match(/seo:\s*\{[^{}]*?notFound:\s*"([^"]+)"/)?.[1], h1: src.match(/notFound:\s*\{[^}]*?title:\s*"([^"]+)"/)?.[1] };
  if (!NF_TEXT[l].title || !NF_TEXT[l].h1) bad(`a src/content/${l}.ts szótárból nem olvasható ki a 404-es cím vagy H1`);
}
const NOT_FOUND = [["/p6-nincs-ilyen-lap", "hu"], ["/p6/nincs/ilyen", "hu"], ["/esemenyek/p6-nincs-ilyen", "hu"],
  ["/en/p6-no-such-page", "en"], ["/de/p6-keine-solche-seite", "de"], ["/de/esemenyek/p6-nincs", "de"]];
for (const [u, l] of NOT_FOUND) {
  const r = await get(u);
  if (r.status !== 404) { bad(`${u} → HTTP ${r.status} (404 várt)`); continue; }
  const html = stripScripts(await r.text());
  const tt = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => decode(m[1]).trim());
  if (tt.length !== 1 || tt[0] !== NF_TEXT[l].title) bad(`${u}: a 404-es lap címe „${tt.join(" | ")}” (várt: „${NF_TEXT[l].title}”)`);
  const robots = tags(html, "meta").filter((m) => m.name === "robots");
  if (!robots.some((m) => /noindex/i.test(m.content ?? ""))) bad(`${u}: nincs noindex`);
  if (robots.length > 1) bad(`${u}: ${robots.length} db robots meta (${robots.map((m) => m.content).join(" | ")})`);
}

/* ---------- böngészőben: a kliens-oldali újrarajzolás után is a saját cím és a lap nyelve marad ---------- */
/* A 404-es választ a Next hibaváz-dokumentumként küldi, amit a böngésző az RSC-adatokból újrarajzol — a szerver-HTML
   címe itt felülíródhat (így maradt meg a review X12-es lelete). Pozitív kontroll: ugyanez a lépés a nyilvános lapokon. */
try {
  const { chromium } = createRequire(path.join(ROOT, "package.json"))("playwright-core");
  const exe = process.env.PW_CHROME ?? path.join(os.homedir(), "Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
  const browser = await chromium.launch({ executablePath: exe, headless: true });
  const page = await (await browser.newContext({ locale: "hu-HU" })).newPage();
  const titleOf = new Map(titles.map(([v, u]) => [u, v]));
  for (const [u, l] of [...NOT_FOUND, ["/", null], ["/en/turak", null], ["/de/esemenyek", null]]) {
    await page.goto(BASE + u, { waitUntil: "networkidle" });
    /* A kliens-render utáni metaadat késve érkezhet: a címet csak kis várakozás után olvassuk (azonnal olvasva ingadozott). */
    await page.waitForTimeout(2500);
    const shown = await page.title(), want = l ? NF_TEXT[l].title : titleOf.get(u);
    if (shown !== want) bad(`böngészőben ${u}: a lapcím „${shown}” (várt: „${want}”)`);
    if (l) {
      const h1 = (await page.locator("h1").first().textContent({ timeout: 10000 }).catch(() => null))?.trim();
      if (h1 !== NF_TEXT[l].h1) bad(`böngészőben ${u}: a H1 „${h1}” (várt: „${NF_TEXT[l].h1}”)`);
    }
  }
  await browser.close();
} catch (e) {
  bad(`a böngészős ellenőrzés nem futott le: ${e instanceof Error ? e.message : e}`);
}

/* ---------- sitemap ---------- */
const smr = await get("/sitemap.xml");
if (smr.status !== 200) bad(`/sitemap.xml → HTTP ${smr.status}`);
else {
  const xml = await smr.text();
  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    loc: decode((m[1].match(/<loc>([^<]+)<\/loc>/) ?? [])[1] ?? ""),
    lastmod: (m[1].match(/<lastmod>([^<]+)<\/lastmod>/) ?? [])[1],
    alts: Object.fromEntries(tags(m[1], "xhtml:link").filter((a) => a.rel === "alternate").map((a) => [a.hreflang, a.href])),
  }));
  const byPath = new Map(entries.map((e) => [pathOf(e.loc), e]));
  for (const p of paths) for (const l of LANGS) {
    const want = langPath(l, p), e = byPath.get(pathOf(want));
    if (!e) { bad(`sitemap: hiányzik ${want}`); continue; }
    if (!/^https?:\/\//.test(e.loc)) bad(`sitemap: nem abszolút cím: ${e.loc}`);
    if (!e.lastmod || Number.isNaN(Date.parse(e.lastmod))) bad(`sitemap: ${want} lastmod nélkül`);
    for (const k of LANGS) if (!e.alts[k] || pathOf(e.alts[k]) !== pathOf(langPath(k, p))) bad(`sitemap: ${want} ${k} alternatívája hibás: ${e.alts[k] ?? "—"}`);
    if (!e.alts["x-default"] || pathOf(e.alts["x-default"]) !== pathOf(langPath("hu", p))) bad(`sitemap: ${want} x-default alternatívája hibás`);
  }
  const known = new Set(paths.flatMap((p) => LANGS.map((l) => pathOf(langPath(l, p)))));
  for (const e of entries) if (!known.has(pathOf(e.loc))) bad(`sitemap: nem nyilvános vagy ismeretlen cím: ${e.loc}`);
}

/* ---------- régi WordPress-címek ---------- */
const LEGACY = [["/kapcsolat", "/#kapcsolat"], ["/kapcsolat/", "/#kapcsolat"], ["/gyerektaborok", "/taborok"], ["/gyerektaborok/", "/taborok"],
  ["/egyeni-oktatas", "/oktatas"], ["/egyeni-oktatas/", "/oktatas"], ["/oktatas/", "/oktatas"], ["/menes", "/"], ["/menes/", "/"],
  ["/bertartas", "/"], ["/bertartas/", "/"], ["/egyesulet/", "/egyesulet"]];
for (const [from, to] of LEGACY) {
  const r = await get(from);
  const loc = r.headers.get("location");
  if (r.status !== 301 || !loc) { bad(`${from} → HTTP ${r.status}${loc ? ` → ${loc}` : ""} (301 → ${to} várt)`); continue; }
  const u = new URL(loc, BASE + from);
  if (`${u.pathname}${u.hash}` !== to) bad(`${from} → ${u.pathname}${u.hash} (várt: ${to})`);
  const fin = await get(u.pathname);
  if (fin.status !== 200) bad(`${from} célja (${u.pathname}) → HTTP ${fin.status}`);
}

report("p6-seo", problems, `${paths.length} nyilvános lap × ${LANGS.length} nyelv, ${fetched.size} megosztási kép letöltve és megmérve, ${NOT_FOUND.length} 404-es cím, ${LEGACY.length} régi cím`);
