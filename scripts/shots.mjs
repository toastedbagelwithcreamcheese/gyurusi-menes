/**
 * G12 — vizuális review képekkel, desktop (1440×900) és mobil (390×844) nézetben: főoldal (magyar és angol), egy aloldal (Túrák),
 * eseménynaptár, eseménylap jelentkezési űrlappal, impresszum, admin kezdőlap és a Jogi lap.
 * Minden lapon: HTTP 200, nincs vízszintes görgetés (scrollWidth ≤ innerWidth, végiggörgetve), 0 konzolhiba és lap-hiba; az eseménylapon
 * ott a jelentkezési űrlap, az admin-lapokon az admin menü. A nyelvváltó elérhető: asztalon a fejlécben látható angol és német link,
 * mobilon a menüt kinyitva. A képek a megadott könyvtárba kerülnek (alap: <tmp>/gyurusi-shots) — a szemmel történő átnézéshez.
 * Pozitív kontrollok: egy beszúrt 4000 px-es elemet a mérő vízszintes görgetésnek jelez (a body overflow-x: clip-jét a kontroll idejére
 * kikapcsolva — a tartalom-túlcsordulást a G25 p4-public 7 szélességen külön méri), és egy beszúrt console.error-t a figyelő elkap.
 * Ha a helyi DB-ben nincs közzétett, jelentkezhető közelgő esemény: db:demo; a végén db:reset (+ a lapok érvénytelenítése).
 * Használat: node scripts/with-server.mjs node scripts/shots.mjs [kimeneti könyvtár]   (előtte npm run build)
 * Csak ha minden állítás teljesült: PASS: shots
 */
import { chromium } from "playwright-core";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { revalidateSite } from "./revalidate.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BASE_URL ?? "http://localhost:3012").replace(/\/$/, "");
const OUT = process.argv[2] ?? path.join(os.tmpdir(), "gyurusi-shots");
const exe = process.env.PW_CHROME ?? path.join(os.homedir(), "Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const DB = path.join(ROOT, "data/site.json");
const problems = [], report = [];
const bad = (m) => problems.push(m);
const runNode = (script) => {
  const r = spawnSync(process.execPath, [path.join(ROOT, script)], { cwd: ROOT, encoding: "utf8", env: { ...process.env, BASE_URL: BASE } });
  if (r.status !== 0) throw new Error(`${script}: ${r.stderr || r.stdout}`);
};

let browser = null;
try {
  await fs.mkdir(OUT, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const readDb = async () => JSON.parse(await fs.readFile(DB, "utf8").catch(() => fs.readFile(path.join(ROOT, "data/seed.json"), "utf8")));
  const nextEvent = (s) => (s.events ?? []).filter((e) => e.published && e.registration && (e.endDate ?? e.date) >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  let ev = nextEvent(await readDb());
  if (!ev) { runNode("scripts/db-demo.mjs"); ev = nextEvent(await readDb()); }
  if (!ev) throw new Error("a db:demo után sincs közelgő, jelentkezhető esemény");
  await revalidateSite(BASE);
  const PAGES = [["/", "home"], ["/turak", "turak"], ["/esemenyek", "esemenyek"], [`/esemenyek/${ev.id}`, "esemeny"], ["/en", "home-en"], ["/impresszum", "impresszum"], ["/admin", "admin"], ["/admin/jogi", "admin-jogi"]];
  browser = await chromium.launch({ executablePath: exe, headless: true });

  for (const [w, h, tag] of [[1440, 900, "d"], [390, 844, "m"]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: "hu-HU", extraHTTPHeaders: { "accept-language": "hu" }, ...(tag === "m" ? { isMobile: true, hasTouch: true } : {}) });
    const page = await ctx.newPage();
    const errs = [];
    page.on("console", (m) => { if (m.type() === "error") errs.push(`${page.url().replace(BASE, "") || "/"}: ${m.text()}`); });
    page.on("pageerror", (e) => errs.push(`${page.url().replace(BASE, "") || "/"}: ${e}`));

    for (const [u, name] of PAGES) {
      const res = await page.goto(BASE + u, { waitUntil: "networkidle" });
      if (res?.status() !== 200) bad(`${tag} ${u}: HTTP ${res?.status()}`);
      /* Végiggörgetés szünetekkel: minden Reveal és lusta kép betöltődjön (headless böngészőben szünet nélkül az IO nem tüzel). */
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); } window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 700)); });
      const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      if (sw > iw) bad(`${tag} ${u}: vízszintes görgetés (scrollWidth ${sw} > innerWidth ${iw})`);
      if (name === "esemeny" && !(await page.locator("[data-registration]").count())) bad(`${tag} ${u}: nincs jelentkezési űrlap`);
      if (name.startsWith("admin") && !(await page.locator(".adm-nav").count())) bad(`${tag} ${u}: nem az admin nyílt meg`);
      await page.screenshot({ path: path.join(OUT, `${tag}-${name}.png`), fullPage: true });
      report.push(`${tag} ${u}: scrollWidth ${sw}/${iw}`);
    }

    /* Nyelvváltó: asztalon a fejlécben, mobilon a menüben. */
    await page.goto(BASE + "/turak", { waitUntil: "networkidle" });
    if (tag === "m") { await page.click(".burger"); await page.waitForTimeout(900); await page.screenshot({ path: path.join(OUT, "m-menu.png") }); }
    const langSel = tag === "d" ? ".hdr .hdr-lang" : ".mnav-lang";
    const langLinks = await page.evaluate((sel) => [...document.querySelectorAll(`${sel} a`)].filter((el) => {
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && Number(s.opacity) > 0.5 && r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0;
    }).map((el) => el.getAttribute("href")), langSel);
    if (!langLinks.some((x) => /^\/en(\/|$)/.test(x ?? "")) || !langLinks.some((x) => /^\/de(\/|$)/.test(x ?? ""))) bad(`${tag}: a nyelvváltóban (${langSel}) nem látható angol és német link (${JSON.stringify(langLinks)})`);

    /* Pozitív kontrollok. */
    const ctrlSw = await page.evaluate(() => {
      const d = document.createElement("div"); d.style.cssText = "width:4000px;height:2px";
      const hs = document.documentElement.style.overflowX, bs = document.body.style.overflowX;
      document.documentElement.style.overflowX = "visible"; document.body.style.overflowX = "visible"; document.body.appendChild(d);
      const v = document.documentElement.scrollWidth > window.innerWidth;
      d.remove(); document.documentElement.style.overflowX = hs; document.body.style.overflowX = bs;
      return v;
    });
    if (!ctrlSw) bad(`${tag} kontroll: a beszúrt 4000 px-es elemet a mérő nem jelezte vízszintes görgetésnek`);
    await page.evaluate(() => console.error("shots-kontroll"));
    await page.waitForTimeout(300);
    const ci = errs.findIndex((e) => e.includes("shots-kontroll"));
    if (ci < 0) bad(`${tag} kontroll: a konzolhiba-figyelő nem kapta el a beszúrt console.error-t`); else errs.splice(ci, 1);
    if (errs.length) bad(`${tag}: ${errs.length} konzolhiba: ${errs.slice(0, 5).join(" | ")}`);
    report.push(`${tag} konzolhiba: ${errs.length}; nyelvváltó: ${langLinks.join(" ")}; kontrollok: túlcsordulás ${ctrlSw ? "jelezve" : "NEM jelezve"}, console.error ${ci >= 0 ? "elkapva" : "NEM elkapva"}`);
    await ctx.close();
  }
} catch (e) {
  bad(`váratlan hiba: ${e instanceof Error ? e.stack ?? e.message : e}`);
} finally {
  if (browser) await browser.close().catch(() => {});
  try { runNode("scripts/db-reset.mjs"); await revalidateSite(BASE, { required: false }); } catch (e) { bad(`db:reset a végén: ${e instanceof Error ? e.message : e}`); }
}

console.log(report.join("\n"));
console.log(`képek: ${OUT}`);
if (problems.length) { console.error(`FAIL: shots — ${problems.length} hiba\n  - ${problems.join("\n  - ")}`); process.exit(1); }
console.log("PASS: shots");
