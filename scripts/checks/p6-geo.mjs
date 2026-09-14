/**
 * G24 — strukturált adat és GEO a futó szerver ellen (BASE_URL):
 *   · minden nyilvános lap × 3 nyelv JSON-LD-je parse-olható; típusonként megvannak a Google szerinti kötelező
 *     és az általunk megkövetelt ajánlott mezők; nincs aggregateRating / review / openingHours / ár (offers, price)
 *   · a JSON-LD-ben szereplő telefon, e-mail, cím és személynév egyezik a docs/verified-facts.json adataival
 *   · robots.txt: a felsorolt keresők és AI-keresők saját csoportban Allow: /, és mindegyikben tiltott az /admin és az /api
 *   · /llms.txt és /llms-full.txt: 200, text/plain; charset=utf-8, benne a kötelező igazolt adatok, tiltott minta nélkül
 *   · a /favicon.ico nem a Next.js sablon ikonja (md5), érvényes ICO; az apple-icon 180×180-as PNG
 * Használat: node scripts/with-server.mjs node scripts/checks/p6-geo.mjs
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { BASE, LANGS, PAGE_KEYS, ROOT, get, imageSize, langPath, publicPaths, report, stripScripts, tags } from "./p6-lib.mjs";

const problems = [];
const bad = (m) => problems.push(m);
const verified = JSON.parse(await fs.readFile(path.join(ROOT, "docs/verified-facts.json"), "utf8"));
/** A create-next-app sablon favicon.ico-ja (a repó első változatában ez volt). */
const TEMPLATE_FAVICON_MD5 = "c30c7d42707a47a3f4591831641e50dc";
/** A név a ménes saját oldalain így áll (docs/RESEARCH.md 1. pont); a koordináta közelítő (seo.ts GEO). */
const BUSINESS_NAME = "Gyűrűsi Ménes";
const GEO = { latitude: 46.888, longitude: 16.99 };

/* ---------- igazolt adatok szétválogatva ---------- */
const must = verified.mustContain;
const PHONES = [...must.filter((s) => /^\+?\d[\d ]{6,}$/.test(s)), ...(verified.ownerPhone ? [verified.ownerPhone] : [])];
const EMAILS = [...must.filter((s) => s.includes("@")), ...(verified.ownerEmail ? [verified.ownerEmail] : [])];
const ADDRESSES = must.filter((s) => /^\d{4} /.test(s));
const PEOPLE = must.filter((s) => !PHONES.includes(s) && !EMAILS.includes(s) && !ADDRESSES.includes(s));

/* ---------- JSON-LD segédek ---------- */
const typesOf = (n) => [].concat(n?.["@type"] ?? []);
function collect(v, out = []) {
  if (Array.isArray(v)) v.forEach((x) => collect(x, out));
  else if (v && typeof v === "object") { if (v["@type"]) out.push(v); for (const [k, x] of Object.entries(v)) if (k !== "@type") collect(x, out); }
  return out;
}
const FORBIDDEN_KEYS = ["aggregateRating", "review", "reviews", "openingHours", "openingHoursSpecification", "price", "priceRange", "priceSpecification", "offers"];
function forbidden(v, trail = "$", out = []) {
  if (Array.isArray(v)) v.forEach((x, i) => forbidden(x, `${trail}[${i}]`, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) {
    if (FORBIDDEN_KEYS.includes(k)) out.push(`${trail}.${k}`);
    if (k === "@type" && [].concat(x).some((tp) => /Rating|Review|Offer/.test(String(tp)))) out.push(`${trail}.@type=${x}`);
    forbidden(x, `${trail}.${k}`, out);
  }
  return out;
}
const at = (o, p) => p.split(".").reduce((v, k) => (v == null ? undefined : v[k]), o);
const empty = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
function need(node, fields, where, out) { for (const f of fields) if (empty(at(node, f))) out.push(`${where}: ${typesOf(node).join("+")} — hiányzó mező: ${f}`); }
const isAbs = (u) => typeof u === "string" && /^https?:\/\//.test(u);
const composeAddress = (a) => `${a.postalCode} ${a.addressLocality}, ${a.streetAddress}`;

/** Az igazolt adatokkal való egyezés: minden telefon, e-mail, postai cím és személynév a verified-facts listáján van. */
function factsMismatch(nodes, where) {
  const out = [];
  for (const n of nodes) {
    for (const [k, list] of [["telephone", PHONES], ["email", EMAILS]]) for (const v of [].concat(n[k] ?? [])) if (!list.includes(v)) out.push(`${where}: ${typesOf(n).join("+")}.${k} = „${v}” nincs az igazolt adatok között`);
    if (typesOf(n).includes("PostalAddress") && n.postalCode && !ADDRESSES.includes(composeAddress(n))) out.push(`${where}: a cím „${composeAddress(n)}” nem az igazolt cím`);
    if ((typesOf(n).includes("Person") || typesOf(n).includes("ContactPoint")) && n.name && !PEOPLE.includes(n.name)) out.push(`${where}: a személy „${n.name}” nincs az igazolt nevek között`);
    if (typesOf(n).includes("LocalBusiness") && n.name !== BUSINESS_NAME) out.push(`${where}: a vállalkozás neve „${n.name}”`);
  }
  return out;
}

/*
 * Kötelező (K) és általunk megkövetelt ajánlott (A) mezők a Google Search Central dokumentációja szerint:
 *  LocalBusiness  developers.google.com/search/docs/appearance/structured-data/local-business
 *                 K: name, address · A: telephone, url, geo.latitude/longitude, image — az openingHoursSpecification
 *                 és a priceRange is ajánlott, de SZÁNDÉKOSAN nincs: nem igazolt adat (tiltott mezőként ellenőrizzük)
 *  Event          developers.google.com/search/docs/appearance/structured-data/event
 *                 K: name, startDate, location (Place + address) · A: description, endDate, eventStatus,
 *                 eventAttendanceMode, image, organizer.name, organizer.url — az offers (ár) ajánlott, de szándékosan nincs
 *  BreadcrumbList developers.google.com/search/docs/appearance/structured-data/breadcrumb
 *                 K: itemListElement ≥ 2 · ListItem: position, name, item (az utolsónál elhagyható — mi mindenhol adjuk)
 *  ItemList       developers.google.com/search/docs/appearance/structured-data/carousel (összefoglaló lap)
 *                 K: itemListElement · ListItem: position, url
 *  Person         K: name · WebSite: name, url + inLanguage (a kapu kérése)
 */
const REQUIRED = {
  LocalBusiness: ["name", "address.streetAddress", "address.addressLocality", "address.postalCode", "address.addressCountry", "telephone", "url", "geo.latitude", "geo.longitude", "image", "founder.name"],
  Event: ["name", "startDate", "location.name", "location.address", "description", "endDate", "eventStatus", "eventAttendanceMode", "image", "organizer.name", "organizer.url"],
  BreadcrumbList: ["itemListElement"],
  ItemList: ["itemListElement"],
  WebSite: ["name", "url", "inLanguage"],
  Person: ["name"],
};

function checkGraph(nodes, where, want) {
  const out = [];
  const of = (tp) => nodes.filter((n) => typesOf(n).includes(tp));
  const biz = of("LocalBusiness");
  if (biz.length !== 1) out.push(`${where}: ${biz.length} db LocalBusiness`);
  for (const b of biz) {
    if (!typesOf(b).includes("SportsActivityLocation")) out.push(`${where}: a LocalBusiness nem SportsActivityLocation is`);
    need(b, REQUIRED.LocalBusiness, where, out);
    if (typesOf(b.founder).join() !== "Person") out.push(`${where}: a founder nem Person`);
    if (Math.abs(Number(b.geo?.latitude) - GEO.latitude) > 0.01 || Math.abs(Number(b.geo?.longitude) - GEO.longitude) > 0.01) out.push(`${where}: a koordináta (${b.geo?.latitude}, ${b.geo?.longitude}) nem a ménesé`);
    for (const u of [].concat(b.image ?? [], b.url ?? [])) if (!isAbs(u)) out.push(`${where}: nem abszolút URL a LocalBusiness-ben: ${u}`);
    const social = [].concat(b.sameAs ?? []);
    if (!social.some((s) => /facebook\.com/.test(s)) || !social.some((s) => /instagram\.com/.test(s))) out.push(`${where}: a sameAs-ből hiányzik a Facebook vagy az Instagram`);
  }
  for (const w of of("WebSite")) {
    need(w, REQUIRED.WebSite, where, out);
    if (!LANGS.every((l) => [].concat(w.inLanguage ?? []).includes(l))) out.push(`${where}: a WebSite inLanguage nem tartalmazza mindhárom nyelvet`);
  }
  if (!of("WebSite").length) out.push(`${where}: nincs WebSite`);
  for (const pers of of("Person")) need(pers, REQUIRED.Person, where, out);
  if (want.breadcrumb) {
    const bc = of("BreadcrumbList");
    if (bc.length !== 1) out.push(`${where}: ${bc.length} db BreadcrumbList`);
    for (const b of bc) {
      need(b, REQUIRED.BreadcrumbList, where, out);
      const items = [].concat(b.itemListElement ?? []);
      if (items.length < 2) out.push(`${where}: a BreadcrumbList ${items.length} elemű`);
      items.forEach((it, i) => {
        if (it.position !== i + 1) out.push(`${where}: BreadcrumbList[${i}].position = ${it.position}`);
        if (empty(it.name)) out.push(`${where}: BreadcrumbList[${i}] név nélkül`);
        if (i < items.length - 1 && !isAbs(it.item)) out.push(`${where}: BreadcrumbList[${i}].item nem abszolút URL`);
      });
    }
  }
  if (want.event) {
    const ev = of("Event");
    if (ev.length !== 1) out.push(`${where}: ${ev.length} db Event`);
    for (const e of ev) {
      need(e, REQUIRED.Event, where, out);
      if (!/^\d{4}-\d{2}-\d{2}/.test(e.startDate ?? "") || !/^\d{4}-\d{2}-\d{2}/.test(e.endDate ?? "")) out.push(`${where}: az Event dátuma nem ISO 8601`);
      if (e.eventAttendanceMode !== "https://schema.org/OfflineEventAttendanceMode") out.push(`${where}: az eventAttendanceMode nem offline`);
      if (!/^https:\/\/schema\.org\/Event(Scheduled|Cancelled|Postponed|Rescheduled|MovedOnline)$/.test(e.eventStatus ?? "")) out.push(`${where}: érvénytelen eventStatus`);
      if (!typesOf(e.location).includes("Place")) out.push(`${where}: az Event helyszíne nem Place`);
      if (![].concat(e.image ?? []).every(isAbs)) out.push(`${where}: az Event képe nem abszolút URL`);
    }
  }
  if (want.itemList) {
    const il = of("ItemList");
    if (il.length !== 1) out.push(`${where}: ${il.length} db ItemList`);
    for (const list of il) {
      need(list, REQUIRED.ItemList, where, out);
      const items = [].concat(list.itemListElement ?? []);
      items.forEach((it, i) => { if (it.position !== i + 1 || !isAbs(it.url)) out.push(`${where}: ItemList[${i}] position/url hibás`); });
      const urls = items.map((it) => new URL(it.url).pathname).sort().join(), expect = want.itemList.slice().sort().join();
      if (urls !== expect) out.push(`${where}: az ItemList (${items.length}) nem a naptárban linkelt eseményeket sorolja (${want.itemList.length})`);
    }
  }
  return out;
}

/* ---------- robots.txt ---------- */
const BOTS = ["Googlebot", "Bingbot", "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended"];
function robotGroups(txt) {
  const out = []; let cur = null, agentLine = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const i = line.indexOf(":"); if (i < 0) continue;
    const key = line.slice(0, i).trim().toLowerCase(), val = line.slice(i + 1).trim();
    if (key === "user-agent") { if (!cur || !agentLine) { cur = { agents: [], allow: [], disallow: [] }; out.push(cur); } cur.agents.push(val.toLowerCase()); agentLine = true; continue; }
    agentLine = false;
    if (cur && key === "allow") cur.allow.push(val);
    if (cur && key === "disallow") cur.disallow.push(val);
  }
  return out;
}
function robotsProblems(txt) {
  const out = [], groups = robotGroups(txt);
  for (const bot of ["*", ...BOTS]) {
    const g = groups.find((x) => x.agents.includes(bot.toLowerCase()));
    if (!g) { out.push(`robots.txt: nincs saját csoport: ${bot}`); continue; }
    if (!g.allow.includes("/")) out.push(`robots.txt: ${bot} — nincs „Allow: /”`);
    if (g.disallow.includes("/")) out.push(`robots.txt: ${bot} — az egész oldal tiltva`);
    if (!g.disallow.some((d) => d.startsWith("/admin"))) out.push(`robots.txt: ${bot} — az /admin nincs tiltva`);
    if (!g.disallow.some((d) => d.startsWith("/api"))) out.push(`robots.txt: ${bot} — az /api nincs tiltva`);
  }
  if (!/^sitemap:\s*https?:\/\/\S+\/sitemap\.xml\s*$/im.test(txt)) out.push("robots.txt: nincs Sitemap-sor");
  return out;
}

/* ---------- önteszt (pozitív kontroll): minden negatív állítás el tud bukni ---------- */
const selfTest = (label, ok) => { if (!ok) bad(`önteszt: ${label}`); };
selfTest("aggregateRating felismerve", forbidden({ "@graph": [{ "@type": "LocalBusiness", aggregateRating: { "@type": "AggregateRating" } }] }).length > 0);
selfTest("ár (offers) felismerve", forbidden({ "@type": "Event", offers: { price: "3000" } }).length > 0);
selfTest("tiszta csomópont nem jelez", forbidden({ "@type": "Event", name: "x" }).length === 0);
selfTest("idegen telefonszám felismerve", factsMismatch([{ "@type": "LocalBusiness", name: BUSINESS_NAME, telephone: "+36 30 000 0000" }], "önteszt").length === 1);
selfTest("igazolt telefonszám elfogadva", factsMismatch([{ "@type": "LocalBusiness", name: BUSINESS_NAME, telephone: PHONES[0] }], "önteszt").length === 0);
selfTest("idegen cím felismerve", factsMismatch([{ "@type": "PostalAddress", postalCode: "1111", addressLocality: "Budapest", streetAddress: "Fő u. 1." }], "önteszt").length === 1);
selfTest("hiányzó kötelező mező felismerve", checkGraph([{ "@type": ["LocalBusiness", "SportsActivityLocation"], name: BUSINESS_NAME }], "önteszt", {}).length > 0);
selfTest("tiltó robots-csoport felismerve", robotsProblems("User-agent: GPTBot\nDisallow: /\n").length > 0);
selfTest("a forbiddenPatterns fog", verified.forbiddenPatterns.some((p) => new RegExp(p).test("A túra ára 3 000 Ft")));
selfTest("az igazolt adatok szétválogatása", PHONES.length > 0 && EMAILS.length > 0 && ADDRESSES.length > 0 && PEOPLE.includes("Vörös József"));

/* ---------- lapok ---------- */
const paths = await publicPaths();
let ldCount = 0;
const calendarLinks = {};
for (const l of LANGS) {
  const html = stripScripts(await (await get(langPath(l, "/esemenyek"))).text());
  const prefix = l === "hu" ? "" : `/${l}`;
  calendarLinks[l] = [...new Set([...html.matchAll(new RegExp(`href="(${prefix}/esemenyek/[^"/?#]+)"`, "g"))].map((m) => m[1]))];
}
for (const p of paths) for (const l of LANGS) {
  const url = langPath(l, p);
  const r = await get(url);
  if (r.status !== 200) { bad(`${url} → HTTP ${r.status}`); continue; }
  const html = await r.text();
  const blocks = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  if (!blocks.length) { bad(`${url}: nincs JSON-LD`); continue; }
  const nodes = [];
  for (const raw of blocks) {
    try { const data = JSON.parse(raw); ldCount++; nodes.push(...collect(data)); for (const f of forbidden(data)) bad(`${url}: tiltott mező a JSON-LD-ben: ${f}`); }
    catch (e) { bad(`${url}: a JSON-LD nem parse-olható: ${e.message}`); }
  }
  const kind = p === "/" ? "home" : p === "/esemenyek" ? "events" : p.startsWith("/esemenyek/") ? "event" : "other";
  const want = { breadcrumb: kind !== "home", event: kind === "event", itemList: kind === "events" && calendarLinks[l].length ? calendarLinks[l] : null };
  if (kind === "home" && !nodes.some((n) => typesOf(n).includes("Person") && n.name === "Vörös József")) bad(`${url}: a tulajdonos nem szerepel Personként`);
  for (const m of checkGraph(nodes, url, want)) bad(m);
  for (const m of factsMismatch(nodes, url)) bad(m);
  const biz = nodes.find((n) => typesOf(n).includes("LocalBusiness"));
  if (biz?.logo) { const lr = await get(new URL(biz.logo).pathname); if (lr.status !== 200) bad(`${url}: a logo (${biz.logo}) → HTTP ${lr.status}`); }
}

/* ---------- robots.txt ---------- */
const rr = await get("/robots.txt");
if (rr.status !== 200) bad(`/robots.txt → HTTP ${rr.status}`);
else for (const m of robotsProblems(await rr.text())) bad(m);

/* ---------- llms.txt ---------- */
const llmsSizes = {};
for (const p of ["/llms.txt", "/llms-full.txt"]) {
  const r = await get(p);
  if (r.status !== 200) { bad(`${p} → HTTP ${r.status}`); continue; }
  const type = r.headers.get("content-type") ?? "";
  if (!/^text\/plain/i.test(type) || !/charset=utf-8/i.test(type)) bad(`${p}: content-type „${type}” (text/plain; charset=utf-8 várt)`);
  const body = await r.text();
  llmsSizes[p] = body.length;
  if (!body.startsWith("# Gyűrűsi Ménes")) bad(`${p}: nem „# Gyűrűsi Ménes” címmel kezdődik`);
  if (!/^> \S/m.test(body)) bad(`${p}: nincs összefoglaló (blockquote)`);
  for (const m of must) if (!body.includes(m)) bad(`${p}: hiányzik az igazolt adat: ${m}`);
  for (const w of ["Hucul", "Gidrán", "Shagya"]) if (!body.includes(w)) bad(`${p}: hiányzik a fajta: ${w}`);
  for (const pattern of verified.forbiddenPatterns) { const hit = body.match(new RegExp(pattern, "g")); if (hit) bad(`${p}: tiltott minta: ${pattern} → ${hit.slice(0, 3).join(", ")}`); }
  for (const l of LANGS) for (const k of ["", ...PAGE_KEYS.map((x) => `/${x}`), "/esemenyek"]) {
    const route = langPath(l, k || "/");
    const re = new RegExp(`\\]\\(https?://[^)\\s]+${route === "/" ? "/?" : route.replace(/[/-]/g, "\\$&")}\\)`);
    if (!re.test(body)) bad(`${p}: nincs link erre: ${route}`);
  }
}
if (llmsSizes["/llms-full.txt"] <= llmsSizes["/llms.txt"]) bad("az /llms-full.txt nem bővebb az /llms.txt-nél");

/* ---------- ikonok ---------- */
const fav = await get("/favicon.ico");
if (fav.status !== 200) bad(`/favicon.ico → HTTP ${fav.status}`);
else {
  const buf = Buffer.from(await fav.arrayBuffer());
  const md5 = crypto.createHash("md5").update(buf).digest("hex");
  if (md5 === TEMPLATE_FAVICON_MD5) bad("a /favicon.ico még a Next.js sablon ikonja");
  if (!(buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0 && buf.readUInt16LE(4) > 0)) bad("a /favicon.ico nem érvényes ICO");
}
/* Pozitív kontroll: a sablon md5-je tényleg ez (a repó első változatából), vagyis a fenti összevetés el tud bukni. */
const tpl = spawnSync("git", ["show", "67aaf1f:src/app/favicon.ico"], { cwd: ROOT, maxBuffer: 1 << 22 });
if (tpl.status === 0 && crypto.createHash("md5").update(tpl.stdout).digest("hex") !== TEMPLATE_FAVICON_MD5) bad("önteszt: a sablon favicon md5-je nem egyezik a konstanssal");
const home = stripScripts(await (await get("/")).text());
const links = tags(home, "link");
const apple = links.find((x) => x.rel === "apple-touch-icon");
if (!apple) bad("a főoldalon nincs apple-touch-icon");
else {
  const r = await get(new URL(apple.href, BASE).pathname + new URL(apple.href, BASE).search);
  const size = r.status === 200 ? imageSize(Buffer.from(await r.arrayBuffer())) : null;
  if (!size || size.type !== "png" || size.w !== 180 || size.h !== 180) bad(`apple-icon (${apple.href}): HTTP ${r.status}, ${size ? `${size.type} ${size.w}×${size.h}` : "nem olvasható"} (180×180 PNG várt)`);
}
const icons = links.filter((x) => x.rel === "icon");
if (!icons.some((x) => !/favicon\.ico/.test(x.href))) bad("a főoldalon nincs saját (nem favicon.ico) ikon-link");
for (const i of icons) { const r = await get(new URL(i.href, BASE).pathname); if (r.status !== 200) bad(`ikon ${i.href} → HTTP ${r.status}`); }

report("p6-geo", problems, `${paths.length} lap × ${LANGS.length} nyelv, ${ldCount} JSON-LD blokk; robots.txt ${BOTS.length} robotra; llms.txt ${llmsSizes["/llms.txt"]} / llms-full.txt ${llmsSizes["/llms-full.txt"]} karakter; favicon + apple-icon rendben`);
