/**
 * G27 — Mobil sebesség, a futó szerver ellen (BASE_URL, fájl-driver, helyi DB).
 * Használat: node scripts/with-server.mjs node scripts/checks/p7-speed.mjs   (előtte npm run build)
 *
 *  0) Ha a helyi DB-ben nincs közzétett KÖZELGŐ esemény (a naptár kiemelt kártyája és az eseménylap jelentkezési űrlapja csak így
 *     mérhető), előbb `db:demo`. A mért eseménylap a legközelebbi közzétett esemény.
 *  1) Build-kimenet (.next/prerender-manifest.json): a hat nyilvános útvonal ISR (dynamicRoutes, fallback: null = első kérésre
 *     renderel), és EGYIK SEM renderelődött előre a buildben (nincs a manifest routes-ában) — a mag nem sül bele a deployba. Az admin
 *     nincs a gyorsítótárazhatók között; az isrFlushToDisk nincs kikapcsolva (az a kép-gyorsítótárat is vinné). Kontroll: /robots.txt a routes-ban.
 *  2) Gyorsítótár: 10 nyilvános lap × 3 nyelv — érvénytelenítés után az első kérés nem HIT, a második x-nextjs-cache: HIT, s-maxage-dzsel.
 *     Kontroll: az /admin nem HIT és no-store.
 *  3) Képek és HTML: a /turak, a /esemenyek és az eseménylap pontosan egy képet tölt elő (az LCP-képet), fetchpriority="high"-jal; a főoldal
 *     egyet sem (a teljes képernyős hero-képet a Chrome háttérnek veszi, az LCP a címsor — a 6) lépés ezt a Lighthouse-szal ellenőrzi);
 *     a HTML-ben nincs a next/image SVG-szűrős blur-helyőrzője. Kontroll: a detektor a Next saját blur-SVG-jét megtalálja, a túratérkép
 *     saját (nyers) SVG-szűrőjét nem. A scripts/warm-images.mjs a helyi szerveren minden változatot 200-as képként adja.
 *  4) GSAP: 390 px-en (görgetéssel együtt) egyik letöltött JS-ben sincs GSAP-könyvtárkód, 1440 px-en reduced-motionnel sem.
 *     Kontroll: 1440 px-en mozgással ott van (a hero parallaxának dinamikus importja).
 *  5) A hajtás feletti tartalom nem vár a JS-re: 390 px-en a JS-chunkok letiltásával 2 s múlva látható (átlátszóság 1, nincs
 *     transzform és vágás) a főoldali hero-cím, -felirat és -gombok, a márkanév, az aloldali és az eseménylapi képfej címe, a naptár
 *     címe és kiemelt kártyája. Kontroll: letiltott kérés tényleg volt, és egy data-in="false" Reveal-elemet a mérő láthatatlannak jelez.
 *  6) Lighthouse 13 mobil (szimulált lassítás, telepített Google Chrome, Accept-Language: hu → a kanonikus magyar lap, átirányítás
 *     nélkül) a főoldalon, a /turak, a /esemenyek lapon és az eseménylapon: Performance ≥ 95, LCP ≤ 2,5 s, TBT ≤ 100 ms, CLS ≤ 0,05;
 *     ha az LCP-elem kép, a Lighthouse szerint előtöltött, magas prioritású és nem lusta. Egy futás; ha egy lap elbukik, 3 futás
 *     mediánja dönt (ezt kiírja).
 *  7) Frissülés: közvetlen DB-írás érvénytelenítés nélkül → a /turak még a régit adja (kontroll: a gyorsítótár valódi); admin-mentés
 *     (Playwright, /admin/oldalak/turak, magyar bevezető) → a /turak azonnal az újat adja, és a többi nyelv és lap sem HIT.
 * A végén db:reset (+ a lapok érvénytelenítése). „PASS: p7-speed”, ha minden állítás teljesült; különben „FAIL: …” és 1-es kilépési kód.
 */
import { chromium } from "playwright-core";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { revalidateSite } from "../revalidate.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.BASE_URL ?? "http://localhost:3012").replace(/\/$/, "");
const PW_CHROME = process.env.PW_CHROME ?? path.join(os.homedir(), "Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const LH_CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DB = path.join(ROOT, "data/site.json");
const LANGS = [["hu", ""], ["en", "/en"], ["de", "/de"]];
const LIMITS = { perf: 95, lcp: 2500, tbt: 100, cls: 0.05 };
/* A GSAP könyvtárkódja: a `quickSetter` a magban és a ScrollTriggerben is ott van, a komponensek chunkjaiban (import("gsap/ScrollTrigger")) nincs. */
const GSAP_RE = /quickSetter/;
/* A next/image blur-helyőrzője URL-kódolt SVG a style-ban; a túratérkép saját, nyers <feGaussianBlur>-ja nem ez. */
const BLUR_RE = /%3CfeGaussianBlur/;
const problems = [];
const bad = (m) => problems.push(m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const url = (pre, p) => BASE + (p === "/" ? pre || "/" : pre + p);
const authHeader = process.env.ADMIN_PASSWORD ? { authorization: `Basic ${Buffer.from(`${process.env.ADMIN_USER ?? ""}:${process.env.ADMIN_PASSWORD}`).toString("base64")}` } : {};
/** Egy újrapróba: egy közben lezárt keep-alive kapcsolat (a szerver 5 s után zárja) egyszer „fetch failed”-et adhat; egy leállt szerver kétszer bukik. */
const get = async (u, lang = "hu", headers = {}) => {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch(u, { redirect: "manual", headers: { "accept-language": lang, ...headers } });
      return { status: r.status, cache: r.headers.get("x-nextjs-cache"), cc: r.headers.get("cache-control") ?? "", html: await r.text() };
    } catch (e) { if (attempt >= 1) throw e; await sleep(300); }
  }
};
/** Aszinkron gyerekfolyamat a hosszú lépésekhez (Lighthouse, warm-images). A spawnSync a teszt eseményhurkát is megállítaná: közben a
 *  szerver lezárja a fetch keep-alive kapcsolatait, és a következő kérés egy halott kapcsolaton bukna — ezt korábban szerverleállásnak láttuk. */
const run = (cmd, args, { env = process.env, timeout = 300_000 } = {}) => new Promise((resolve) => {
  const child = spawn(cmd, args, { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "";
  child.stdout.on("data", (d) => { stdout += d; }); child.stderr.on("data", (d) => { stderr += d; });
  const timer = setTimeout(() => child.kill("SIGKILL"), timeout);
  child.on("close", (status) => { clearTimeout(timer); resolve({ status, stdout, stderr }); });
});
const runNode = (script) => {
  const r = spawnSync(process.execPath, [path.join(ROOT, script)], { cwd: ROOT, encoding: "utf8", env: { ...process.env, BASE_URL: BASE } });
  if (r.status !== 0) throw new Error(`${script}: ${r.stderr || r.stdout}`);
};
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const fmtS = (ms) => `${(ms / 1000).toFixed(2).replace(".", ",")} s`;

let browser = null;
try {
  if (!(await fetch(`${BASE}/robots.txt`).catch(() => null))?.ok) throw new Error(`a szerver nem érhető el: ${BASE} (futtasd a with-server alatt, előtte npm run build)`);

  /* ---------- 0) közelgő esemény a helyi DB-ben ---------- */
  const readDb = async () => JSON.parse(await fs.readFile(DB, "utf8").catch(() => fs.readFile(path.join(ROOT, "data/seed.json"), "utf8")));
  const today = new Date().toISOString().slice(0, 10);
  const nextEvent = (s) => (s.events ?? []).filter((e) => e.published && (e.endDate ?? e.date) >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  let ev = nextEvent(await readDb());
  if (!ev) { runNode("scripts/db-demo.mjs"); ev = nextEvent(await readDb()); console.log("0) a helyi DB-ben nem volt közelgő közzétett esemény → db:demo"); }
  if (!ev) throw new Error("a db:demo után sincs közelgő közzétett esemény");
  await revalidateSite(BASE);
  const EVENT = `/esemenyek/${ev.id}`;
  const PUBLIC = ["/", "/huculosveny", "/turak", "/oktatas", "/taborok", "/egyesulet", "/esemenyek", EVENT, "/adatkezeles", "/impresszum"];
  const MEASURED = ["/", "/turak", "/esemenyek", EVENT];
  console.log(`0) mért eseménylap: ${EVENT} (${ev.date})`);

  /* ---------- 1) build-kimenet ---------- */
  {
    const m = JSON.parse(await fs.readFile(path.join(ROOT, ".next/prerender-manifest.json"), "utf8"));
    const ISR = ["/[lang]", "/[lang]/[slug]", "/[lang]/esemenyek", "/[lang]/esemenyek/[id]", "/[lang]/adatkezeles", "/[lang]/impresszum"];
    for (const r of ISR) {
      const d = m.dynamicRoutes?.[r];
      if (!d) bad(`build: ${r} nem ISR-útvonal (nincs a prerender-manifest dynamicRoutes-ában — dinamikus lett?)`);
      else if (d.fallback !== null) bad(`build: ${r} fallback=${JSON.stringify(d.fallback)} (null várt: első kérésre renderel, majd gyorsítótárból)`);
    }
    const baked = Object.keys(m.routes ?? {}).filter((r) => /^\/(hu|en|de)(\/|$)/.test(r));
    if (baked.length) bad(`build: a buildben előre renderelt nyilvános lap (a mag sülne bele): ${baked.join(", ")}`);
    /* Futás közben a szerver a lemezre is kiírja a renderelt lapot (.next/server/app/hu/…html) — a build-idejű előrenderelést ezért
       a manifest routes-a mondja meg, nem a fájlok léte. */
    const admin = [...Object.keys(m.routes ?? {}), ...Object.keys(m.dynamicRoutes ?? {})].filter((r) => r.includes("/admin"));
    if (admin.length) bad(`build: admin-útvonal a gyorsítótárazhatók között: ${admin.join(", ")}`);
    if (!m.routes?.["/robots.txt"]) bad("kontroll: a /robots.txt (statikus) sincs a manifest routes-ában — a manifest olvasása hibás");
    const rsf = JSON.parse(await fs.readFile(path.join(ROOT, ".next/required-server-files.json"), "utf8"));
    /* Az isrFlushToDisk=false a képoptimalizáló lemez-gyorsítótárát is kikapcsolná (minden kép minden kérésre újrakódolódna). */
    if (rsf.config?.experimental?.isrFlushToDisk === false) bad("build: experimental.isrFlushToDisk = false — a képoptimalizáló gyorsítótára ki van kapcsolva");
    console.log(`1) build: ${ISR.length} nyilvános útvonal ISR (első kérésre, fallback: null), egy sem renderelődött előre a buildben, admin dinamikus, a kép-gyorsítótár be; kontroll: /robots.txt statikus`);
  }

  /* ---------- 2) gyorsítótár ---------- */
  {
    await revalidateSite(BASE);
    let hits = 0;
    for (const [l, pre] of LANGS) for (const p of PUBLIC) {
      const u = url(pre, p);
      const a = await get(u, l), b = await get(u, l);
      if (a.status !== 200 || b.status !== 200) { bad(`${u} → HTTP ${a.status} / ${b.status}`); continue; }
      if (a.cache === "HIT") bad(`kontroll: ${u} első kérése az érvénytelenítés után is HIT`);
      if (b.cache === "HIT") hits++; else bad(`${u}: a második kérés x-nextjs-cache: ${b.cache} (HIT várt)`);
      if (!/s-maxage=\d+/.test(b.cc)) bad(`${u}: cache-control „${b.cc}” (s-maxage várt)`);
    }
    await get(`${BASE}/admin`, "hu", authHeader); const adm = await get(`${BASE}/admin`, "hu", authHeader);
    if (adm.cache === "HIT" || !/no-store/.test(adm.cc)) bad(`kontroll: az /admin gyorsítótárazható (${adm.status}, x-nextjs-cache ${adm.cache}, cache-control „${adm.cc}”)`);
    console.log(`2) gyorsítótár: ${hits}/${PUBLIC.length * LANGS.length} nyilvános lap a második kérésre HIT (s-maxage), az első az érvénytelenítés után nem; kontroll: /admin no-store`);
  }

  /* ---------- 3) képek, HTML, warm-images ---------- */
  {
    const require = createRequire(path.join(ROOT, "package.json"));
    const { getImageBlurSvg } = require("next/dist/shared/lib/image-blur-svg.js");
    const nextBlur = `url("data:image/svg+xml;charset=utf-8,${getImageBlurSvg({ widthInt: 2000, heightInt: 1333, blurWidth: 16, blurHeight: 11, blurDataURL: "data:image/webp;base64,AAAA", objectFit: "cover" })}")`;
    if (!BLUR_RE.test(nextBlur)) bad("kontroll: a blur-detektor a Next saját blur-SVG-jét nem ismeri fel");
    if (BLUR_RE.test('<filter id="rm-soft"><feGaussianBlur stdDeviation="14" /></filter>')) bad("kontroll: a blur-detektor a túratérkép saját SVG-szűrőjét is jelzi");
    for (const p of MEASURED) {
      const { html } = await get(url("", p));
      const pre = [...html.matchAll(/<link\b[^>]*\brel="preload"[^>]*>/gi)].map((x) => x[0]).filter((tag) => /\bas="image"/i.test(tag));
      const want = p === "/" ? 0 : 1;
      if (pre.length !== want) bad(`${p}: ${pre.length} előtöltött kép (${want} várt${want ? ": az LCP-kép" : " — a főoldal LCP-je a címsor"})`);
      else if (want && !/fetchpriority="high"/i.test(pre[0])) bad(`${p}: az előtöltött kép nem fetchpriority="high": ${pre[0].slice(0, 180)}`);
    }
    for (const [l, pre] of LANGS) for (const p of PUBLIC) { const { html } = await get(url(pre, p), l); if (BLUR_RE.test(html)) bad(`${url(pre, p)}: SVG-szűrős blur-helyőrző a HTML-ben`); }
    const warm = await run(process.execPath, [path.join(ROOT, "scripts/warm-images.mjs")], { env: { ...process.env, BASE_URL: BASE, PATHS: MEASURED.join(",") }, timeout: 180_000 });
    const lastLine = (warm.stdout.trim().split("\n").pop() ?? "").trim();
    if (warm.status !== 0 || !lastLine.startsWith("OK: warm-images")) bad(`warm-images: kilépési kód ${warm.status} — ${(warm.stderr || lastLine).slice(0, 300)}`);
    console.log(`3) képek: 3 lapon pontosan egy előtöltött kép fetchpriority="high"-jal, a főoldalon egy sem; ${PUBLIC.length * LANGS.length} lapon nincs blur-SVG (kontroll: a Next blur-SVG-jét jelzi, a térkép szűrőjét nem); ${lastLine}`);
  }

  browser = await chromium.launch({ executablePath: PW_CHROME, headless: true });

  /* ---------- 4) GSAP ---------- */
  {
    const scan = async (opts, label) => {
      const ctx = await browser.newContext(opts); const page = await ctx.newPage();
      const pending = [], scripts = [];
      page.on("response", (r) => { if (r.request().resourceType() === "script") pending.push(r.body().then((b) => scripts.push({ url: r.url(), bytes: b.length, gsap: GSAP_RE.test(b.toString("utf8")) })).catch(() => {})); });
      await page.goto(BASE + "/", { waitUntil: "networkidle" });
      await sleep(1200); await page.mouse.wheel(0, 600); await sleep(2800);
      await Promise.all(pending); await ctx.close();
      const g = scripts.filter((s) => s.gsap);
      return { label, n: scripts.length, bytes: scripts.reduce((s, x) => s + x.bytes, 0), gsap: g.map((s) => s.url.split("/").pop()) };
    };
    const mobile = await scan({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "hu-HU", extraHTTPHeaders: { "accept-language": "hu" } }, "390 px");
    const reduced = await scan({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", locale: "hu-HU", extraHTTPHeaders: { "accept-language": "hu" } }, "1440 px, reduced-motion");
    const desktop = await scan({ viewport: { width: 1440, height: 900 }, locale: "hu-HU", extraHTTPHeaders: { "accept-language": "hu" } }, "1440 px");
    if (mobile.gsap.length) bad(`390 px: GSAP-chunk a letöltött JS között: ${mobile.gsap.join(", ")}`);
    if (reduced.gsap.length) bad(`1440 px reduced-motion: GSAP-chunk a letöltött JS között: ${reduced.gsap.join(", ")}`);
    if (!desktop.gsap.length) bad("kontroll: 1440 px-en sincs GSAP-chunk — a detektor vagy a parallax dinamikus importja nem működik");
    console.log(`4) GSAP: 390 px ${mobile.n} JS (${Math.round(mobile.bytes / 1024)} KB), nincs GSAP; 1440 px reduced-motion ${reduced.n} JS, nincs GSAP; kontroll: 1440 px ${desktop.n} JS (${Math.round(desktop.bytes / 1024)} KB), GSAP: ${desktop.gsap.join(", ")}`);
  }

  /* ---------- 5) a hajtás feletti tartalom nem vár a JS-re ---------- */
  {
    const VISIBLE = (sels) => sels.map((sel) => {
      const el = document.querySelector(sel);
      if (!el) return { sel, ok: false, why: "nincs ilyen elem" };
      let op = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) op *= Number(getComputedStyle(n).opacity);
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      const clipOk = s.clipPath === "none" || /^inset\(0(px)?( 0(px)?){0,3}\)$/.test(s.clipPath);
      const trOk = s.transform === "none" || s.transform === "matrix(1, 0, 0, 1, 0, 0)";
      const ok = op > 0.99 && s.visibility === "visible" && r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0 && clipOk && trOk;
      return { sel, ok, why: `átlátszóság ${op.toFixed(2)}, ${s.visibility}, clip ${s.clipPath}, transform ${s.transform}, y ${Math.round(r.top)}` };
    });
    const cases = [["/", [".hero-seq h1", ".hero-seq [data-seq='first']", ".hero-sub", ".hero-cta", ".hdr .brand-line"]], ["/turak", [".sub-hero-in h1", ".sub-hero-in .eyebrow", ".hdr .brand-line"]], ["/esemenyek", ["main h1", "[data-featured-event]"]], [EVENT, [".sub-hero-in h1", ".sub-hero-in .caption"]]];
    let checked = 0;
    for (const [p, sels] of cases) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "hu-HU", extraHTTPHeaders: { "accept-language": "hu" } });
      let blocked = 0;
      await ctx.route(/\/_next\/static\/chunks\/.+\.js(\?|$)/, (route) => { blocked++; return route.abort(); });
      const page = await ctx.newPage();
      await page.goto(BASE + p, { waitUntil: "load" }); await sleep(2000);
      if (blocked === 0) bad(`kontroll ${p}: nem volt letiltott JS-kérés — a JS nélküli mérés nem valódi`);
      for (const v of await page.evaluate(VISIBLE, sels)) { checked++; if (!v.ok) bad(`${p} JS nélkül: „${v.sel}” nem látható (${v.why})`); }
      if (p === "/") {
        const ctrl = await page.evaluate((fn) => { const d = document.createElement("div"); d.className = "rise"; d.dataset.in = "false"; d.id = "p7-kontroll"; d.textContent = "kontroll"; document.querySelector("main").prepend(d); return new Function(`return (${fn})`)()(["#p7-kontroll"])[0]; }, VISIBLE.toString());
        if (ctrl.ok) bad(`kontroll: a mérő egy data-in="false" Reveal-elemet is láthatónak jelez (${ctrl.why})`);
      }
      await ctx.close();
    }
    console.log(`5) JS nélkül (a chunkok letiltva) 390 px-en 2 s múlva látható mind a ${checked} hajtás feletti elem (hero-cím, -felirat, -gombok, márkanév, képfej-címek, naptár-cím és kiemelt kártya); kontroll: letiltott kérések voltak, a data-in="false" elemet láthatatlannak jelzi`);
  }

  /* ---------- 6) Lighthouse ---------- */
  {
    const lighthouse = async (p, runNo) => {
      const out = path.join(os.tmpdir(), `p7-speed-lh${p === "/" ? "-fooldal" : p.replace(/\W+/g, "-")}-${runNo}.json`);
      const r = await run("npx", ["--yes", "lighthouse@13", BASE + p, "--output=json", `--output-path=${out}`, "--only-categories=performance", "--form-factor=mobile", "--screenEmulation.mobile", "--throttling-method=simulate", "--quiet",
        `--extra-headers=${JSON.stringify({ "Accept-Language": "hu-HU,hu;q=0.9" })}`, "--chrome-flags=--headless=new --no-sandbox --disable-gpu"],
        { env: { ...process.env, CHROME_PATH: LH_CHROME }, timeout: 300_000 });
      if (r.status !== 0) return { error: `a lighthouse kilépési kódja ${r.status}: ${r.stderr.slice(-400)}` };
      const lh = JSON.parse(readFileSync(out, "utf8"));
      const A = lh.audits;
      const node = A["lcp-breakdown-insight"]?.details?.items?.find((i) => i.type === "node");
      const checklist = A["lcp-discovery-insight"]?.details?.items?.find((i) => i.type === "checklist")?.items;
      return {
        perf: Math.round(lh.categories.performance.score * 100), lcp: A["largest-contentful-paint"].numericValue, tbt: A["total-blocking-time"].numericValue,
        cls: A["cumulative-layout-shift"].numericValue, fcp: A["first-contentful-paint"].numericValue, si: A["speed-index"].numericValue,
        final: new URL(lh.finalDisplayedUrl).pathname, version: lh.lighthouseVersion, lcpEl: node?.selector ?? "?", lcpImg: /(^|\s|>)img$/.test(node?.selector ?? ""),
        discovery: checklist ? Object.entries(checklist).filter(([, v]) => v.value === false).map(([k]) => k) : [],
      };
    };
    const fails = (x) => [x.perf < LIMITS.perf && `Performance ${x.perf} < ${LIMITS.perf}`, x.lcp > LIMITS.lcp && `LCP ${fmtS(x.lcp)} > 2,5 s`, x.tbt > LIMITS.tbt && `TBT ${Math.round(x.tbt)} ms > 100 ms`, x.cls > LIMITS.cls && `CLS ${x.cls.toFixed(3)} > 0,05`].filter(Boolean);
    for (const p of MEASURED) {
      await get(url("", p)); await get(url("", p)); // gyorsítótárból mérjünk, ahogy a látogató kapja
      const runs = [];
      for (let runNo = 1; runNo <= 3; runNo++) {
        const x = await lighthouse(p, runNo);
        if (x.error) { bad(`${p}: ${x.error}`); break; }
        runs.push(x);
        if (runNo === 1 && fails(x).length === 0) break;
      }
      if (!runs.length) continue;
      const med = { perf: median(runs.map((x) => x.perf)), lcp: median(runs.map((x) => x.lcp)), tbt: median(runs.map((x) => x.tbt)), cls: median(runs.map((x) => x.cls)), fcp: median(runs.map((x) => x.fcp)), si: median(runs.map((x) => x.si)) };
      for (const x of runs) {
        if (x.final !== p) bad(`${p}: a Lighthouse ${x.final} címet mért (átirányítás?)`);
        if (x.lcpImg && x.discovery.length) bad(`${p}: az LCP-kép (${x.lcpEl}) a Lighthouse szerint nem jól betöltött: ${x.discovery.join(", ")}`);
        if (p === "/" && !/h1/.test(x.lcpEl)) bad(`/: az LCP-elem ${x.lcpEl} (a hero-címsor várt — a hero-kép előtöltése nélkül ez lenne a lassú elem)`);
      }
      const label = runs.length === 1 ? "1 futás" : `medián, ${runs.length} futás (Performance ${runs.map((x) => x.perf).join(" / ")}, LCP ${runs.map((x) => fmtS(x.lcp)).join(" / ")})`;
      for (const f of fails(med)) bad(`${p} (${label}): ${f}`);
      console.log(`6) Lighthouse ${runs[0].version} mobil ${p} — ${label}: Performance ${med.perf} · LCP ${fmtS(med.lcp)} · TBT ${Math.round(med.tbt)} ms · CLS ${med.cls.toFixed(3)} · FCP ${fmtS(med.fcp)} · SI ${fmtS(med.si)} · LCP-elem: ${runs[0].lcpEl}`);
    }
  }

  /* ---------- 7) frissülés admin-mentés után ---------- */
  {
    const MARK1 = `P7-KOZVETLEN-${Date.now().toString(36)}`, MARK2 = `P7-ADMIN-${Date.now().toString(36)}`;
    await get(url("", "/turak")); const warm = await get(url("", "/turak"));
    if (warm.cache !== "HIT") bad(`7) a /turak bemelegítve sem HIT (${warm.cache})`);
    const db = JSON.parse(await fs.readFile(DB, "utf8")); db.pages.turak.lead.hu = MARK1; await fs.writeFile(DB, JSON.stringify(db, null, 2));
    const stale = await get(url("", "/turak"));
    if (stale.html.includes(MARK1) || stale.cache !== "HIT") bad(`kontroll: a közvetlen DB-írás érvénytelenítés nélkül is azonnal látszik (x-nextjs-cache ${stale.cache}) — a lap nem gyorsítótárból jön`);
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "hu-HU" }); const page = await ctx.newPage();
    if (process.env.ADMIN_PASSWORD) {
      await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
      if (new URL(page.url()).pathname.startsWith("/admin/belepes")) {
        if (await page.locator("#user").count()) await page.fill("#user", process.env.ADMIN_USER ?? "");
        await page.fill("#password", process.env.ADMIN_PASSWORD); await page.click("[data-login-submit]");
        await page.waitForFunction(() => location.pathname !== "/admin/belepes", null, { timeout: 20_000 });
      }
    }
    await page.goto(`${BASE}/admin/oldalak/turak`, { waitUntil: "networkidle" });
    await page.fill("#lead\\.hu", MARK2);
    await Promise.all([page.waitForURL(/\/admin\/oldalak(\?|$)/, { timeout: 30_000 }), page.click('button:has-text("Mentés")')]);
    const tSaved = Date.now();
    const fresh = await get(url("", "/turak"));
    const ms = Date.now() - tSaved;
    if (!fresh.html.includes(MARK2)) bad("7) admin-mentés után a /turak nem az új bevezetőt adja");
    if (fresh.cache === "HIT") bad("7) admin-mentés után a /turak első kérése még HIT");
    const others = [];
    for (const [l, pre, p] of [["en", "/en", "/turak"], ["de", "/de", "/turak"], ["hu", "", "/"], ["hu", "", "/esemenyek"]]) {
      const r = await get(url(pre, p), l); others.push(`${url(pre, p).replace(BASE, "") || "/"} ${r.cache}`);
      if (r.cache === "HIT") bad(`7) admin-mentés után ${url(pre, p)} még HIT (a layout-szintű érvénytelenítés nem hatott)`);
    }
    const again = await get(url("", "/turak"));
    if (again.cache !== "HIT" || !again.html.includes(MARK2)) bad(`7) az újraépült /turak második kérése ${again.cache}, új szöveggel: ${again.html.includes(MARK2)}`);
    await ctx.close();
    console.log(`7) frissülés: közvetlen DB-írás után a /turak még a régi (HIT — kontroll); admin-mentés után ${ms} ms-on belül az új bevezető (${fresh.cache}), a többi lap újraépül (${others.join(", ")}), majd ismét HIT`);
  }
} catch (e) {
  bad(`váratlan hiba: ${e instanceof Error ? e.stack ?? e.message : e}`);
} finally {
  if (browser) await browser.close().catch(() => {});
  try { runNode("scripts/db-reset.mjs"); await revalidateSite(BASE, { required: false }); } catch (e) { bad(`db:reset a végén: ${e instanceof Error ? e.message : e}`); }
}

const secs = Math.round((Date.now() - t0) / 1000);
if (problems.length) {
  console.error(`FAIL: p7-speed — ${problems.length} hiba (${secs} s)\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}
console.log(`PASS: p7-speed (${secs} s)`);
