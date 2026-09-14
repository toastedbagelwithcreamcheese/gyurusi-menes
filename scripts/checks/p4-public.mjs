/**
 * G25 — Nyilvános javítások, a futó szerver ellen (BASE_URL, fájl-driver, helyi DB).
 * Használat: node scripts/with-server.mjs node scripts/checks/p4-public.mjs   (előtte npm run build)
 *
 *  0) Mag: nincs benne a két kitalált példaesemény, a Táborok szövegében nincs „egy hétre” (en/de megfelelő sem).
 *     Kontroll: ugyanez a detektor a P4 előtti magban (git 01bf729) mind a 7 tételt megtalálja.
 *  1) Nyelvválasztás: Accept-Language pl / fr / sk / cs / it → 302 /en (aloldalon is); kontrollok: hu → 200, de → /de,
 *     „pl, de;q=0.5” → /de, „pl, hu;q=0.3” → 200, robot → 200, „*” → 200, lang=hu süti → 200.
 *  2) A lapok (főoldal, 5 aloldal, naptár, egy eseménylap [db:demo], adatkezelés, impresszum, 404) × hu/en/de ×
 *     320, 390, 768, 1024, 1280, 1440, 1920 px: document.documentElement.scrollWidth ≤ innerWidth; nincs a nézeten túllógó
 *     (le nem vágott) elem; a fejléc minden gyereke a sávon belül, a menü nem fut a hívás-gombra, a márkanév nem vágódik;
 *     egy cím sem lóg ki a dobozából (hosszú német szavak); 390 px-en minden önálló érintési cél ≥ 44 × 44 px
 *     (a folyó szövegbe ágyazott linkek kivételével). A főoldalon görgetés után (lebegő fejléc) is.
 *     Kontroll: befecskendezett széles elem, 20 px-es link, túlfutó cím és széthúzott menüpont — mind a négyet jelzi.
 *  3) Fejléc a 900–1240 px-es sávban (900, 960, 1100, 1180, 1240) minden nyelven; a nyelvi lenyíló 1024 px-en németül nyílik,
 *     a nézeten belül marad, Esc-re bezárul. Mobil menü (390 px): HU/EN/DE egy sorban, három egyforma, ≥ 44 px-es gomb.
 *  4) Egyesület: üres beszámoló-blokk nincs a DOM-ban; kontroll: egy közzétett próba-beszámolóval megjelenik, nem közzétettel nem.
 *  5) Mindkét űrlap (kapcsolat a főoldalon és aloldalon, jelentkezés) alatt adatkezelési link a nyelvi lapra, ami 200-at ad.
 *  6) Eseménynaptár: H1 után nincs kihagyott címszint; a korábbi események évenként, csökkenő sorrendben, a legutóbbi 2 év nyitva.
 *     Főoldal: az események szekciócíme nem azonos a kiemelt kártya címkéjével.
 *  7) Főoldal (C02): a bemutatkozás törzsszövege a HTML-ben van, de csukott <details>-ben; lenyitva legalább 300 px-szel hosszabb;
 *     a teljes főoldal 390 px-en nem hosszabb, mint a P4 előtt ugyanezzel a két eseménnyel (10685 px, 01bf729).
 * A végén db:reset. „PASS: p4-public”, ha minden állítás teljesült; különben „FAIL: …” és 1-es kilépési kód.
 */
import { chromium } from "playwright-core";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.BASE_URL ?? "http://localhost:3012").replace(/\/$/, "");
const exe = process.env.PW_CHROME ?? path.join(os.homedir(), "Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const DB = path.join(ROOT, "data/site.json");
const problems = [];
const bad = (m) => problems.push(m);
const LANGS = [["hu", ""], ["en", "/en"], ["de", "/de"]];
const WIDTHS = [320, 390, 768, 1024, 1280, 1440, 1920];
const BAND = [900, 960, 1100, 1180, 1240];
const DEMO_ID = "pelda-lovastura";
const NOT_FOUND = "/p4-nincs-ilyen-lap";
const PAGES = ["/", "/huculosveny", "/turak", "/oktatas", "/taborok", "/egyesulet", "/esemenyek", `/esemenyek/${DEMO_ID}`, "/adatkezeles", "/impresszum", NOT_FOUND];
const HOME_390_BEFORE = 10685;
const url = (pre, p) => BASE + (p === "/" ? pre || "/" : pre + p);
const runNode = (script) => { const r = spawnSync(process.execPath, [path.join(ROOT, script)], { cwd: ROOT, encoding: "utf8" }); if (r.status !== 0) throw new Error(`${script}: ${r.stderr || r.stdout}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();

/* ---------- 0) mag ---------- */
function seedIssues(seed) {
  const out = [];
  const events = JSON.stringify(seed.events ?? []);
  for (const needle of ["oszi-lovastura-2026-09-19", "oszi-szuneti-lovastabor-2026", "Őszi lovastúra a Zalai-dombságban", "Őszi szüneti lovastábor", "pelda-lovastura", "pelda-lovastabor"]) if (events.includes(needle)) out.push(`példaesemény a magban: ${needle}`);
  const body = seed.pages?.taborok?.body ?? {};
  for (const [l, re] of [["hu", /egy hétre/i], ["en", /for a week/i], ["de", /für eine Woche/i]]) if (re.test(body[l] ?? "")) out.push(`„${re.source}” a Táborok szövegében (${l})`);
  return out;
}
const seed = JSON.parse(await fs.readFile(path.join(ROOT, "data/seed.json"), "utf8"));
for (const m of seedIssues(seed)) bad(m);
const oldSeed = spawnSync("git", ["show", "01bf729:data/seed.json"], { cwd: ROOT, encoding: "utf8", maxBuffer: 20e6 });
if (oldSeed.status !== 0) bad(`kontroll: a P4 előtti mag nem olvasható a gitből (${oldSeed.stderr.trim()})`);
else { const n = seedIssues(JSON.parse(oldSeed.stdout)).length; if (n !== 7) bad(`önteszt: a P4 előtti magban ${n} tételt talált (7 várt)`); else console.log("0) mag: nincs példaesemény és „egy hétre”; kontroll: a P4 előtti magban mind a 7 tételt megtalálja"); }

/* ---------- 1) nyelvválasztás ---------- */
const BOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
async function probe(p, headers) {
  const r = await fetch(BASE + p, { redirect: "manual", headers });
  return { status: r.status, path: r.headers.get("location") ? new URL(r.headers.get("location"), BASE).pathname : null };
}
for (const [p, h, want] of [["/", "pl-PL,pl;q=0.9", "/en"], ["/", "fr-FR,fr;q=0.9", "/en"], ["/", "sk", "/en"], ["/", "cs-CZ,cs;q=0.9", "/en"], ["/", "it-IT,it;q=0.8", "/en"], ["/turak", "pl", "/en/turak"], ["/esemenyek", "fr-CA", "/en/esemenyek"]]) {
  const r = await probe(p, { "accept-language": h });
  if (r.status !== 302 || r.path !== want) bad(`Accept-Language: ${h} ${p} → ${r.status} ${r.path ?? ""} (302 ${want} várt)`);
}
for (const [label, p, headers, status, want] of [
  ["hu", "/", { "accept-language": "hu-HU,hu;q=0.9" }, 200, null], ["de", "/", { "accept-language": "de-AT,de;q=0.9" }, 302, "/de"],
  ["pl + de", "/", { "accept-language": "pl, de;q=0.5" }, 302, "/de"], ["pl + hu", "/", { "accept-language": "pl, hu;q=0.3" }, 200, null],
  ["robot + pl", "/", { "accept-language": "pl", "user-agent": BOT }, 200, null], ["*", "/", { "accept-language": "*" }, 200, null],
  ["lang=hu süti + pl", "/", { "accept-language": "pl", cookie: "lang=hu" }, 200, null],
]) {
  const r = await probe(p, headers);
  if (r.status !== status || (want && r.path !== want)) bad(`kontroll ${label}: ${p} → ${r.status} ${r.path ?? ""} (${status} ${want ?? ""} várt)`);
}
console.log("1) ismeretlen böngészőnyelv (pl, fr, sk, cs, it) → 302 /en; a magyar, a német, a robot, a „*” és a süti változatlan");

/* ---------- 2–7) böngésző ---------- */
runNode("scripts/db-reset.mjs"); runNode("scripts/db-demo.mjs");
{
  const r = await fetch(`${BASE}/esemenyek/${DEMO_ID}`, { headers: { "accept-language": "hu" } });
  const html = await r.text();
  if (r.status !== 200 || !html.includes("data-registration")) throw new Error(`a db:demo eseménylapja nem elérhető jelentkezéssel (${r.status}) — a lapok statikusak lettek? (a teszt a helyi DB közvetlen írására épít)`);
}

/** A mérés a böngészőben. `touch`: 390 px-en az érintési célok is. */
function measure({ touch, headerless = false }) {
  /* Látható: van mérete, nincs elrejtve, és nem egy csukott <details> tartalma (a Chrome annak is ad dobozt). */
  const vis = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && !el.closest("[aria-hidden='true'], [inert], details:not([open]) > :not(summary)"); };
  const label = (el) => (el.getAttribute("aria-label") || el.textContent || el.getAttribute("name") || el.tagName).replace(/\s+/g, " ").trim().slice(0, 40);
  const out = { doc: document.documentElement.scrollWidth - innerWidth, hdr: [], heads: [], off: [], small: [], reports: !!document.querySelector("[data-reports]") };
  const bar = document.querySelector(".hdr-bar");
  /* A 404-es lapnak nincs fejléce (NotFoundBody) — ott nincs mit mérni; minden más lapon kötelező. */
  if (!bar) { if (!headerless) out.hdr.push("nincs .hdr-bar"); }
  else {
    const br = bar.getBoundingClientRect();
    for (const c of bar.querySelectorAll("a, button, nav, summary")) {
      if (!vis(c)) continue;
      const r = c.getBoundingClientRect(); const o = Math.max(r.right - br.right, br.left - r.left, r.right - innerWidth, -r.left);
      if (o > 1) out.hdr.push(`${label(c)} +${Math.round(o)} px`);
    }
    const name = bar.querySelector(".brand-name"); if (name && vis(name) && name.scrollWidth > name.clientWidth + 1) out.hdr.push("a márkanév levágva");
    const nav = bar.querySelector(".hdr-nav"), cta = bar.querySelector(".hdr-cta");
    if (nav && vis(nav) && cta) {
      const last = [...nav.querySelectorAll("a")].pop();
      if (last && last.getBoundingClientRect().right > cta.getBoundingClientRect().left + 1) out.hdr.push("a menü a hívás-gomb sávjára fut");
      if (nav.scrollWidth > nav.clientWidth + 1) out.hdr.push(`a menü tartalma kilóg (${nav.scrollWidth} > ${nav.clientWidth})`);
    }
    const phone = bar.querySelector(".hdr-phone");
    /* „A gomb maradjon teljes”: látszik, nem zsugorodott össze (a kilógást a fenti sáv-ellenőrzés méri). */
    if (phone && vis(phone)) { const r = phone.getBoundingClientRect(); if (r.width < 40 || r.height < 40 || phone.scrollWidth > phone.clientWidth + 1) out.hdr.push(`a hívás-gomb nem teljes (${Math.round(r.width)}×${Math.round(r.height)})`); }
  }
  for (const h of document.querySelectorAll("h1, h2, h3, h4, .display, .h1, .h2, .h3")) {
    if (!vis(h) || h.closest(".hdr, .mnav, .zoom")) continue;
    if (h.scrollWidth > h.clientWidth + 1) out.heads.push(`„${label(h)}” ${h.scrollWidth} > ${h.clientWidth} px`);
  }
  /* A nézeten túllógó elem a vágó (overflow) ősökkel metszve — a body/html vágását nem számítjuk, az épp elrejtené a hibát. */
  for (const el of document.querySelectorAll("main *, footer *")) {
    if (!vis(el) || getComputedStyle(el).position === "fixed") continue;
    const r = el.getBoundingClientRect(); let left = r.left, right = r.right;
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      if (getComputedStyle(p).overflowX !== "visible") { const pr = p.getBoundingClientRect(); left = Math.max(left, pr.left); right = Math.min(right, pr.right); }
    }
    if (right - left > 0 && (right > innerWidth + 1 || left < -1)) out.off.push(`${el.tagName.toLowerCase()}${typeof el.className === "string" && el.className ? "." + el.className.split(" ")[0] : ""} ${Math.round(left)}–${Math.round(right)}`);
  }
  out.off = [...new Set(out.off)].slice(0, 6);
  if (touch) for (const el of document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, summary, [role='button']")) {
    if (!vis(el) || el.closest(".hidden")) continue;
    if (el.tagName === "A" && getComputedStyle(el).display === "inline") {
      const block = el.closest("p, li, dd, dt, td, label, figcaption");
      if (block && block.textContent.replace(el.textContent, "").replace(/\s+/g, "").length > 0) continue; /* mondatközi link */
    }
    const r = el.getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5) out.small.push(`${label(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  return out;
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await wait(70); }
    window.scrollTo(0, 0); await wait(450);
  });
}

async function pool(items, n, fn) {
  const queue = [...items]; const workers = Array.from({ length: n }, async () => { while (queue.length) await fn(queue.shift()); });
  await Promise.all(workers);
}

const browser = await chromium.launch({ executablePath: exe, headless: true });
const pageErrors = [];
const stats = { views: 0, small: 0 };
try {
  /* ---------- 2) szélesség × nyelv × lap ---------- */
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 860 }, locale: "hu-HU" });
    const tasks = LANGS.flatMap(([l, pre]) => PAGES.map((p) => ({ l, pre, p })));
    await pool(tasks, 4, async ({ l, pre, p }) => {
      const page = await ctx.newPage();
      page.on("pageerror", (e) => pageErrors.push(`${w} ${l} ${p}: ${String(e).slice(0, 160)}`));
      page.on("console", (m) => { if (m.type() === "error" && /hydrat/i.test(m.text())) pageErrors.push(`${w} ${l} ${p}: ${m.text().slice(0, 160)}`); });
      const where = `${w}px ${l} ${p}`;
      try {
        const res = await page.goto(url(pre, p), { waitUntil: "networkidle", timeout: 60_000 });
        const want = p === NOT_FOUND ? 404 : 200;
        if (res?.status() !== want) bad(`${where}: HTTP ${res?.status()} (${want} várt)`);
        await scrollThrough(page);
        const m = await page.evaluate(measure, { touch: w === 390, headerless: p === NOT_FOUND });
        stats.views++;
        if (m.doc > 0) bad(`${where}: vízszintes túlcsordulás +${m.doc} px`);
        if (m.off.length) bad(`${where}: a nézeten túllógó elemek: ${m.off.join(", ")}`);
        if (m.hdr.length) bad(`${where}: fejléc: ${m.hdr.join("; ")}`);
        if (m.heads.length) bad(`${where}: kilógó cím: ${m.heads.slice(0, 3).join("; ")}`);
        if (m.small.length) { stats.small += m.small.length; bad(`${where}: 44 px alatti érintési cél: ${m.small.slice(0, 6).join(", ")}${m.small.length > 6 ? ` (+${m.small.length - 6})` : ""}`); }
        if (p === "/egyesulet" && m.reports) bad(`${where}: üres beszámoló-blokk a DOM-ban`);
        if (p === "/") {
          await page.evaluate(() => window.scrollTo(0, 900)); await sleep(650);
          const s = await page.evaluate(measure, { touch: false });
          if (s.hdr.length) bad(`${where} (görgetve): fejléc: ${s.hdr.join("; ")}`);
        }
      } catch (e) { bad(`${where}: ${String(e).slice(0, 200)}`); }
      await page.close();
    });
    await ctx.close();
    console.log(`2) ${w} px: ${tasks.length} nézet kész (${Math.round((Date.now() - t0) / 1000)} s)`);
  }

  /* Ha a szerver menet közben leállt (pl. más folyamat foglalta el a portot), itt álljunk meg érthető üzenettel. */
  try { const r = await fetch(`${BASE}/robots.txt`); if (r.status !== 200) throw new Error(`HTTP ${r.status}`); }
  catch (e) { throw new Error(`a szerver a mérés közben elérhetetlenné vált (${BASE}): ${e.message}`); }

  /* Kontroll: a négy detektor egy szándékosan elrontott lapon jelez. */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 860 }, locale: "hu-HU" }); const page = await ctx.newPage();
    await page.goto(url("", "/turak"), { waitUntil: "networkidle" }); await scrollThrough(page);
    await page.evaluate(() => {
      const main = document.querySelector("main");
      const wide = document.createElement("div"); wide.style.cssText = "width:700px;height:10px"; main.appendChild(wide);
      const a = document.createElement("a"); a.href = "/x"; a.textContent = "x"; a.style.cssText = "display:inline-block;width:20px;height:20px"; main.appendChild(a);
      const h = document.createElement("h2"); h.textContent = "Veranstaltungskalenderveranstaltungskalender"; h.style.cssText = "width:120px;overflow-wrap:normal;hyphens:none;font-size:40px"; main.appendChild(h);
    });
    const m = await page.evaluate(measure, { touch: true });
    await ctx.close();
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: "hu-HU" }); const p2 = await ctx2.newPage();
    await p2.goto(url("/de", "/esemenyek"), { waitUntil: "networkidle" }); await sleep(900);
    await p2.evaluate(() => { const a = document.querySelector(".hdr-nav a"); a.style.paddingInline = "300px"; });
    const h = await p2.evaluate(measure, { touch: false });
    await ctx2.close();
    const ok = { doc: m.doc > 0, small: m.small.some((s) => /^x 20×20/.test(s)), heads: m.heads.some((s) => s.includes("Veranstaltungskalender")), hdr: h.hdr.length > 0 };
    if (!Object.values(ok).every(Boolean)) bad(`önteszt: nem minden detektor jelez az elrontott lapon: ${JSON.stringify(ok)}`);
    else console.log("2) kontroll: széles elem, 20 px-es link, kilógó cím és széthúzott menü — mind jelezve");
  }

  /* ---------- 3) fejléc-sáv, nyelvi lenyíló, mobil menü ---------- */
  for (const w of BAND) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 860 }, locale: "hu-HU" }); const page = await ctx.newPage();
    for (const [l, pre] of LANGS) for (const p of ["/", "/esemenyek"]) {
      await page.goto(url(pre, p), { waitUntil: "networkidle" }); await sleep(900);
      const top = await page.evaluate(measure, { touch: false });
      if (top.hdr.length) bad(`${w}px ${l} ${p}: fejléc: ${top.hdr.join("; ")}`);
      if (p === "/") { await page.evaluate(() => window.scrollTo(0, 900)); await sleep(650); const s = await page.evaluate(measure, { touch: false }); if (s.hdr.length) bad(`${w}px ${l} / (görgetve): fejléc: ${s.hdr.join("; ")}`); }
    }
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 860 }, locale: "hu-HU" }); const page = await ctx.newPage();
    await page.goto(url("/de", "/turak"), { waitUntil: "networkidle" }); await sleep(900);
    const summary = page.locator(".hdr-lang-menu summary");
    if (!(await summary.isVisible())) bad("1024px de: a nyelvi lenyíló nem látszik");
    else {
      await summary.click(); await sleep(250);
      const menu = await page.evaluate(() => { const list = document.querySelector(".hdr-lang-menu .lang-menu-list"); const r = list?.getBoundingClientRect(); return list ? { open: document.querySelector(".hdr-lang-menu").open, links: [...list.querySelectorAll("a")].map((a) => [a.getAttribute("href"), a.getAttribute("aria-current")]), left: r.left, right: r.right, h: r.height } : null; });
      if (!menu?.open || menu.links.length !== 3 || menu.left < 0 || menu.right > 1024 || menu.h < 60) bad(`1024px de: a nyelvi lenyíló nem jó: ${JSON.stringify(menu)}`);
      if (JSON.stringify(menu?.links) !== JSON.stringify([["/turak", null], ["/en/turak", null], ["/de/turak", "page"]])) bad(`1024px de: a lenyíló linkjei: ${JSON.stringify(menu?.links)}`);
      await page.keyboard.press("Escape"); await sleep(150);
      if (await page.evaluate(() => document.querySelector(".hdr-lang-menu").open)) bad("1024px de: Esc-re nem zárul a nyelvi lenyíló");
    }
    await ctx.close();
  }
  for (const [l, pre] of LANGS) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "hu-HU" }); const page = await ctx.newPage();
    await page.goto(url(pre, "/turak"), { waitUntil: "networkidle" }); await page.click(".burger"); await sleep(900);
    const r = await page.evaluate(() => [...document.querySelectorAll(".mnav .mnav-lang a")].map((a) => { const b = a.getBoundingClientRect(); return { t: Math.round(b.top), l: b.left, r: b.right, w: b.width, h: b.height, cur: a.getAttribute("aria-current") }; }));
    const okRow = r.length === 3 && r.every((x) => Math.abs(x.t - r[0].t) <= 1 && Math.abs(x.w - r[0].w) <= 1.5 && x.h >= 43.5 && x.w >= 43.5 && x.l >= 0 && x.r <= 390);
    if (!okRow) bad(`390px ${l} mobil menü: a HU/EN/DE nem egy sorban, három egyforma ≥ 44 px-es gomb: ${JSON.stringify(r.map((x) => [x.t, Math.round(x.w), Math.round(x.h)]))}`);
    if (r.findIndex((x) => x.cur === "page") !== LANGS.findIndex(([x]) => x === l)) bad(`390px ${l} mobil menü: nem az aktuális nyelv van jelölve`);
    await ctx.close();
  }
  console.log(`3) fejléc a ${BAND.join(", ")} px-es sávban mindhárom nyelven (tetején és görgetve); a nyelvi lenyíló 1024 px-en nyílik, a nézetben marad, Esc-re zárul; mobil menü: három egyforma gomb egy sorban`);

  /* ---------- 4) Egyesület: üres blokk nincs; kontroll próba-beszámolóval ---------- */
  const withReport = async (published) => {
    const site = JSON.parse(await fs.readFile(DB, "utf8"));
    site.reports = [{ id: "p4-rep", title: "P4 próba beszámoló", year: 2025, date: "2025-05-01", file: "p4-nincs-ilyen.pdf", size: 1234, published }];
    await fs.writeFile(DB, JSON.stringify(site, null, 2));
    const html = await (await fetch(`${BASE}/egyesulet`, { headers: { "accept-language": "hu" } })).text();
    return { block: html.includes("data-reports"), title: html.includes("P4 próba beszámoló") };
  };
  for (const [l, pre] of LANGS) { const html = await (await fetch(`${BASE}${pre}/egyesulet`, { headers: { "accept-language": l } })).text(); if (html.includes("data-reports")) bad(`${pre || "/"}egyesulet: üres beszámoló-blokk a HTML-ben`); }
  const pub = await withReport(true), unpub = await withReport(false);
  if (!pub.block || !pub.title) bad(`kontroll: közzétett beszámolóval sem jelenik meg a blokk (${JSON.stringify(pub)})`);
  if (unpub.block) bad("kontroll: nem közzétett beszámolóval is megjelenik a blokk");
  runNode("scripts/db-reset.mjs"); runNode("scripts/db-demo.mjs");
  console.log("4) Egyesület: beszámoló nélkül nincs blokk (3 nyelv, 7 szélesség); kontroll: közzétett beszámolóval megjelenik, nem közzétettel nem");

  /* ---------- 5–7) űrlapok, naptár, főoldal ---------- */
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "hu-HU" }); const page = await ctx.newPage();
  for (const [l, pre] of LANGS) {
    const privacyHref = `${pre}/adatkezeles`;
    for (const [p, sel] of [["/", '[data-contact-form="home"]'], ["/turak", '[data-contact-form="turak"]'], [`/esemenyek/${DEMO_ID}`, '[data-testid="registration-form"]']]) {
      await page.goto(url(pre, p), { waitUntil: "networkidle" });
      const f = await page.evaluate((s) => {
        const form = document.querySelector(s); if (!form) return null;
        const line = form.querySelector("[data-form-privacy]"); const a = line?.querySelector("a"); const btn = form.querySelector("button");
        return { href: a?.getAttribute("href"), text: a?.textContent.trim(), line: line?.textContent.trim(), after: !!(btn && line && btn.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING) };
      }, sel);
      if (!f) { bad(`${l} ${p}: nincs űrlap (${sel})`); continue; }
      if (f.href !== privacyHref || !f.text || !f.after) bad(`${l} ${p}: az űrlap alatt nincs jó adatkezelési link: ${JSON.stringify(f)}`);
    }
    const r = await fetch(BASE + privacyHref, { headers: { "accept-language": l } }); if (r.status !== 200) bad(`${privacyHref} → ${r.status}`);

    await page.goto(url(pre, "/esemenyek"), { waitUntil: "networkidle" });
    const ev = await page.evaluate(() => ({
      heads: [...document.querySelectorAll("main h1, main h2, main h3, main h4, main h5, main h6")].map((h) => Number(h.tagName[1])),
      years: [...document.querySelectorAll("details[data-past-year]")].map((d) => ({ y: d.getAttribute("data-past-year"), open: d.open, items: d.querySelectorAll("li").length })),
    }));
    if (ev.heads[0] !== 1 || ev.heads.some((lv, i) => i > 0 && lv > ev.heads[i - 1] + 1)) bad(`${l} /esemenyek: címsor-sorrend ${ev.heads.join(" ")}`);
    const ys = ev.years.map((x) => x.y);
    if (!ev.years.length || JSON.stringify(ys) !== JSON.stringify([...ys].sort().reverse()) || ev.years.some((x, i) => x.open !== i < 2 || x.items < 1)) bad(`${l} /esemenyek: évenkénti csoportok hibásak: ${JSON.stringify(ev.years)}`);

    await page.goto(url(pre, "/"), { waitUntil: "networkidle" });
    const home = await page.evaluate(() => ({ title: document.querySelector("[data-events-title]")?.textContent.trim(), tag: document.querySelector("#esemenyek [data-event-tag]")?.textContent.trim() }));
    if (!home.title || !home.tag || home.title === home.tag) bad(`${l} /: az események szekciócíme és a kártya címkéje: ${JSON.stringify(home)}`);
    if (l === "hu") console.log(`5–6) hu: űrlap-linkek ${privacyHref}; naptár címszintek ${ev.heads.join(" ")}; évek ${ev.years.map((x) => `${x.y}${x.open ? "▼" : "▶"}`).join(" ")}; főoldal: „${home.title}” ≠ „${home.tag}”`);
  }
  /* Önteszt: a szekciócím–címke összevetés (ugyanaz a feltétel, mint fent) egyező szövegre jelez, eltérőre nem. */
  { const same = (x) => !x.title || !x.tag || x.title === x.tag; if (!same({ title: "Kiemelt esemény", tag: "Kiemelt esemény" }) || same({ title: "Eseménynaptár", tag: "Kiemelt esemény" })) bad("önteszt: a szekciócím és a címke összevetése"); }
  await ctx.close();

  const intro = { hu: seed.intro.body.hu, en: seed.intro.body.en, de: seed.intro.body.de };
  for (const [l, pre] of LANGS) {
    const html = await (await fetch(url(pre, "/"), { headers: { "accept-language": l } })).text();
    const first = intro[l].split("\n")[0].slice(0, 60).replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
    if (!html.includes(first)) bad(`${l} /: a bemutatkozás törzsszövege nincs a HTML-ben`);
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "hu-HU" }); const pg = await c.newPage();
    await pg.goto(url(pre, "/"), { waitUntil: "networkidle" }); await scrollThrough(pg);
    const before = await pg.evaluate(() => ({ open: document.querySelector("[data-intro-more]")?.open, h: document.querySelector("#menes").getBoundingClientRect().height, page: document.body.scrollHeight }));
    await pg.locator("[data-intro-more] summary").scrollIntoViewIfNeeded(); await pg.click("[data-intro-more] summary"); await sleep(300);
    const after = await pg.evaluate(() => ({ open: document.querySelector("[data-intro-more]")?.open, h: document.querySelector("#menes").getBoundingClientRect().height }));
    if (before.open !== false || after.open !== true || after.h < before.h + 300) bad(`${l} /: a bemutatkozás lenyitója nem jó: ${JSON.stringify({ before, after })}`);
    if (l === "hu" && before.page > HOME_390_BEFORE) bad(`/ 390 px: a főoldal ${before.page} px — hosszabb, mint a P4 előtt (${HOME_390_BEFORE} px)`);
    console.log(`7) ${l} / 390 px: bemutatkozás csukva ${Math.round(before.h)} px, nyitva ${Math.round(after.h)} px; teljes főoldal ${before.page} px${l === "hu" ? ` (P4 előtt ${HOME_390_BEFORE} px)` : ""}`);
    await c.close();
  }
} finally {
  await browser.close();
  runNode("scripts/db-reset.mjs");
}

if (pageErrors.length) bad(`böngészőhiba: ${[...new Set(pageErrors)].slice(0, 5).join(" | ")}`);
console.log(`összesen ${stats.views} nézet, ${Math.round((Date.now() - t0) / 1000)} s`);
if (problems.length) { for (const p of problems.slice(0, 80)) console.error("FAIL:", p); if (problems.length > 80) console.error(`FAIL: … és még ${problems.length - 80}`); console.error(`FAIL: p4-public — ${problems.length} hiba`); process.exit(1); }
console.log("PASS: p4-public");
