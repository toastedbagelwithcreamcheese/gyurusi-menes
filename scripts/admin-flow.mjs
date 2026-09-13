/**
 * Admin-körút Playwrighttal a GATES.md G10/G13-hoz. BASE_URL alatt fusson az oldal.
 *  1. esemény létrehozása kiemeltként, jelentkezéssel → a főoldalon kiemelt blokkban látszik
 *  2. nyilvános jelentkezés az eseményre → az admin listában a létszámmal
 *  3. PDF-beszámoló feltöltése → az /egyesulet lapon, a fájl letölthető
 *  4. nyitókép csere adminból → a főoldal az új képet adja
 *  5. takarítás: jelentkezés, esemény, beszámoló törlése, nyitókép vissza
 * Élesben (ADMIN_USER + ADMIN_PASSWORD) Basic Auth-tal lép be. A végén ADMIN_FLOW_OK.
 */
import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const TITLE = `Teszt esemény (gate ${Date.now().toString(36)})`;
const REPORT = `Gate beszámoló ${Date.now().toString(36)}`;
const fail = (m) => { console.error("FAIL:", m); process.exit(1); };
const exe = process.env.PW_CHROME ?? path.join(os.homedir(), "Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const creds = process.env.ADMIN_USER && process.env.ADMIN_PASSWORD ? { username: process.env.ADMIN_USER, password: process.env.ADMIN_PASSWORD } : undefined;

const browser = await chromium.launch({ executablePath: exe, headless: true });
const ctx = await browser.newContext({ httpCredentials: creds, viewport: { width: 1280, height: 900 }, locale: "hu-HU" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const go = async (p) => { const r = await page.goto(BASE + p, { waitUntil: "networkidle" }); if (!r || r.status() >= 400) fail(`${p} → ${r?.status()}`); };
const fetchText = async (p) => { const r = await ctx.request.get(BASE + p); if (!r.ok()) fail(`${p} → ${r.status()}`); return r.text(); };

/** Egy korábbi, félbeszakadt futás maradékai (teszt-esemény, -beszámoló, -jelentkezés) — mindig előbb kitakarítjuk. */
async function purge() {
  await go("/admin/esemenyek");
  for (const id of await page.locator('[data-event-row]:has-text("Teszt esemény (gate")').evaluateAll((els) => els.map((e) => e.getAttribute("data-event-row")))) {
    await go(`/admin/esemenyek/${id}`); await Promise.all([page.waitForURL(/\/admin\/esemenyek(\?|$)/), page.click('button:has-text("Esemény törlése")')]); console.log("purge: esemény", id);
  }
  await go("/admin/beszamolok");
  while (await page.locator('[data-report-row]:has-text("Gate beszámoló")').count()) { const r = page.locator('[data-report-row]:has-text("Gate beszámoló")').first(); const id = await r.getAttribute("data-report-row"); await r.locator('button:has-text("Töröl")').click(); await page.waitForSelector(`[data-report-row="${id}"]`, { state: "detached", timeout: 15000 }); console.log("purge: beszámoló", id); }
  await go("/admin/kepek");
  while (await page.locator('[data-image-tile^="u-"]').count()) { const t = page.locator('[data-image-tile^="u-"]').first(); const id = await t.getAttribute("data-image-tile"); await t.hover(); if (await t.locator('button:has-text("Töröl")').count() === 0) break; await t.locator('button:has-text("Töröl")').click(); await page.waitForSelector(`[data-image-tile="${id}"]`, { state: "detached", timeout: 15000 }); console.log("purge: feltöltés", id); }
}

try {
  await purge();
  /* 1. esemény */
  const inThirty = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  await go("/admin/esemenyek/uj");
  await page.fill("#title\\.hu", TITLE); await page.fill("#title\\.en", TITLE + " EN"); await page.fill("#title\\.de", TITLE + " DE");
  await page.fill("#date", inThirty); await page.fill("#location", "Gyűrűsi Ménes, Gyűrűs");
  await page.fill("#summary\\.hu", "Automatikus teszt — a kapu végén törlődik."); await page.fill("#summary\\.en", "Automated test."); await page.fill("#summary\\.de", "Automatischer Test.");
  await page.check('input[name="published"]'); await page.check('input[name="featured"]'); await page.check('input[name="registration"]');
  await page.check('input[name="image"][value="osveny-ugras-gyuru"]');
  await Promise.all([page.waitForURL(/\/admin\/esemenyek(\?|$)/), page.click('button:has-text("Mentés")')]);
  const row = page.locator(`[data-event-row]:has-text("${TITLE}")`); if (!(await row.count())) fail("az esemény nem jelent meg az admin listában");
  const evId = await row.getAttribute("data-event-row");
  if (!(await row.locator(".pill-feat").count())) fail("nem kiemelt");
  const home = await fetchText("/");
  if (!home.includes("data-featured-event") || !home.slice(home.indexOf("data-featured-event")).slice(0, 3000).includes(TITLE)) fail("a főoldal kiemelt blokkjában nincs az új esemény");
  if (!(await fetchText("/de")).includes(TITLE + " DE")) fail("a német főoldal nem a német címet adja");
  console.log("1. esemény OK:", evId);

  /* 2. jelentkezés */
  await go(`/esemenyek/${evId}`);
  if (!(await page.locator("[data-registration]").count())) fail("nincs jelentkezési blokk a nyilvános eseményoldalon");
  await page.fill("#r-name", "Gate Teszt"); await page.fill("#r-phone", "+36 30 000 0000"); await page.fill("#r-count", "3"); await page.fill("#r-note", "automatikus teszt");
  await page.click('[data-testid="registration-form"] button[type="submit"], [data-testid="registration-form"] button');
  await page.waitForSelector('[role="status"]', { timeout: 15000 });
  await go("/admin/jelentkezesek");
  const grp = page.locator(`[data-reg-group="${evId}"]`); if (!(await grp.count())) fail("nincs jelentkezés-csoport az adminban");
  const grpText = await grp.innerText();
  if (!grpText.includes("Gate Teszt") || !/\b3 fő/.test(grpText)) fail("a jelentkezés vagy a létszám nem látszik: " + grpText.slice(0, 200));
  console.log("2. jelentkezés OK (3 fő)");

  /* 3. beszámoló (minimális, érvényes PDF) */
  const pdf = Buffer.from(`%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n160\n%%EOF\n`);
  const tmp = path.join(os.tmpdir(), "gate-beszamolo.pdf"); await fs.writeFile(tmp, pdf);
  await go("/admin/beszamolok");
  await page.setInputFiles("#file", tmp); await page.fill("#title", REPORT);
  await page.click('button:has-text("Feltöltés")'); await page.waitForSelector(`[data-report-row]:has-text("${REPORT}")`, { timeout: 20000 });
  const egy = await fetchText("/egyesulet");
  const m = egy.match(new RegExp(`href="(/files/r-[a-z0-9]+\\.pdf)"[^>]*>[^<]*<span class="rep-title">${REPORT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  if (!m) fail("a beszámoló nem jelent meg az /egyesulet lapon");
  const pdfRes = await ctx.request.get(BASE + m[1]); if (!pdfRes.ok() || !(pdfRes.headers()["content-type"] ?? "").includes("application/pdf")) fail(`a PDF nem tölthető le: ${pdfRes.status()} ${pdfRes.headers()["content-type"]}`);
  console.log("3. beszámoló OK:", m[1]);

  /* 4. nyitókép */
  const before = (await fetchText("/admin/kepek")).match(/data-image-tile="([^"]+)"[^]*?Nyitókép/)?.[1];
  await go("/admin/kepek");
  const target = "aranyfeny-sorfal";
  await page.hover(`[data-image-tile="${target}"]`); await page.click(`[data-image-tile="${target}"] button:has-text("Nyitókép")`);
  await page.waitForSelector(`[data-image-tile="${target}"] .tag.hero`, { timeout: 15000 });
  if (!(await fetchText("/")).includes(target)) fail("a főoldal nem az új nyitóképet adja");
  console.log("4. nyitókép OK →", target, "(előtte:", before, ")");

  /* 4b. képfeltöltés → fájltár → nyitókép → next/image optimalizálás is kiszolgálja */
  const sharp = (await import("sharp")).default;
  const png = await sharp({ create: { width: 900, height: 600, channels: 3, background: { r: 122, g: 96, b: 62 } } }).png().toBuffer();
  const tmpPng = path.join(os.tmpdir(), "gate-kep.png"); await fs.writeFile(tmpPng, png);
  await go("/admin/kepek"); await page.setInputFiles("#file", tmpPng); await page.fill("#alt", "Gate teszt kép");
  await page.click('button:has-text("Feltöltés")'); await page.waitForSelector('[data-image-tile^="u-"]', { timeout: 30000 });
  const upId = await page.locator('[data-image-tile^="u-"]').first().getAttribute("data-image-tile");
  const raw = await ctx.request.get(`${BASE}/files/${upId}.webp`); if (!raw.ok() || !(raw.headers()["content-type"] ?? "").includes("image/webp")) fail(`a feltöltött kép nem jön a /files alól: ${raw.status()}`);
  await page.hover(`[data-image-tile="${upId}"]`); await page.click(`[data-image-tile="${upId}"] button:has-text("Nyitókép")`); await page.waitForSelector(`[data-image-tile="${upId}"] .tag.hero`, { timeout: 15000 });
  const homeUp = await fetchText("/"); if (!homeUp.includes(`/files/${upId}.webp`)) fail("a főoldal nem a feltöltött nyitóképet adja");
  const opt = await ctx.request.get(`${BASE}/_next/image?url=${encodeURIComponent(`/files/${upId}.webp`)}&w=1200&q=62`);
  if (!opt.ok() || !(opt.headers()["content-type"] ?? "").startsWith("image/")) fail(`a next/image nem optimalizálja a feltöltött képet: ${opt.status()} ${opt.headers()["content-type"]}`);
  console.log("4b. feltöltött kép OK:", upId, "→ optimalizált:", opt.headers()["content-type"]);

  /* 5. takarítás */
  await go("/admin/kepek"); await page.hover(`[data-image-tile="${before}"]`); await page.click(`[data-image-tile="${before}"] button:has-text("Nyitókép")`); await page.waitForSelector(`[data-image-tile="${before}"] .tag.hero`);
  await page.hover(`[data-image-tile="${upId}"]`); await page.click(`[data-image-tile="${upId}"] button:has-text("Töröl")`); await page.waitForSelector(`[data-image-tile="${upId}"]`, { state: "detached", timeout: 15000 });
  /* A tár igazsága: az admin már nem listázza (fent, detached). A /files válasz 404 — vagy 200, de KIZÁRÓLAG CDN-cache-találatból
     (a Netlify durable cache a lekérdezési paramétert is figyelmen kívül hagyja; a netlify-cdn-cache-control egy órán belül elengedi). */
  const gone = await ctx.request.get(`${BASE}/files/${upId}.webp`);
  const cs = gone.headers()["cache-status"] ?? "";
  if (gone.status() !== 404 && !(gone.status() === 200 && /hit/i.test(cs))) fail(`a törölt kép még elérhető a /files alól: ${gone.status()} (cache-status: ${cs || "-"})`);
  if (gone.status() === 200) console.log("   (a /files még CDN-cache-ből adja a törölt képet — a tárból törölve; cache-status:", cs, ")");
  await go("/admin/beszamolok"); const rr = page.locator(`[data-report-row]:has-text("${REPORT}")`); await rr.locator('button:has-text("Töröl")').click(); await page.waitForTimeout(800);
  await go(`/admin/esemenyek/${evId}`); await Promise.all([page.waitForURL(/\/admin\/esemenyek(\?|$)/), page.click('button:has-text("Esemény törlése")')]);
  if ((await fetchText("/")).includes(TITLE)) fail("takarítás után is látszik az esemény");
  if ((await fetchText("/egyesulet")).includes(REPORT)) fail("takarítás után is látszik a beszámoló");
  if ((await fetchText("/admin/jelentkezesek")).includes("Gate Teszt")) fail("takarítás után is látszik a jelentkezés");
  if (errors.length) fail("böngésző-hibák: " + errors.join(" | "));
  console.log("5. takarítás OK");
  console.log("ADMIN_FLOW_OK");
} finally { await browser.close(); }
