/**
 * Forgatókönyves böngésző-QA (GATES.md G15). BASE_URL alatt fusson az oldal, fájl-driverrel (helyi DB).
 *  A) kapcsolati űrlap: üres → mezőre mutató hiba; rossz e-mail → hiba; jó → visszaigazolás; /en-en angol hiba
 *  B) jelentkezés: rossz létszám → hiba; jó → visszaigazolás; lezárt esemény → lezárt üzenet
 *  C) sok esemény: +5 közelgő az adatbázisban → rács, egyetlen kiemelt; nincs esemény → „nincs kitűzött” szöveg
 *  D) admin: PDF helyett .txt → részletes hiba a Flash-sávban; mentés → „mentve” visszajelzés; hiányzó cím → hiba
 * A végén a helyi DB visszaáll (db:reset). QA_FLOW_OK a siker jele.
 */
import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const DB = path.join(ROOT, "data/site.json");
const fail = (m) => { console.error("FAIL:", m); process.exit(1); };
const exe = process.env.PW_CHROME ?? path.join(os.homedir(), "Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const readDb = async () => JSON.parse(await fs.readFile(DB, "utf8"));
const writeDb = async (d) => fs.writeFile(DB, JSON.stringify(d, null, 2));

spawnSync("node", [path.join(ROOT, "scripts/db-reset.mjs")], { stdio: "ignore" });
const browser = await chromium.launch({ executablePath: exe, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "hu-HU" });
const page = await ctx.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
const go = async (p) => { const r = await page.goto(BASE + p, { waitUntil: "networkidle" }); if (!r || r.status() >= 400) fail(`${p} → ${r?.status()}`); };
const alertText = async () => (await page.locator('[role="alert"]').first().innerText()).trim();

try {
  /* A) kapcsolati űrlap a Túrák oldalon */
  await go("/turak");
  const f = '[data-contact-form="turak"]';
  await page.click(`${f} button[type="submit"], ${f} button`);
  let t = await alertText(); if (!/neved/.test(t)) fail("üres űrlap: nem a név-hiba jött: " + t);
  if (!(await page.locator(`${f} [name="name"][aria-invalid="true"]`).count())) fail("a név mező nincs hibásnak jelölve");
  await page.fill(`${f} [name="name"]`, "Teszt Elek"); await page.fill(`${f} [name="email"]`, "nem-email"); await page.fill(`${f} [name="message"]`, "Ez egy elég hosszú tesztüzenet.");
  await page.click(`${f} button`); t = await alertText(); if (!/e-mail/.test(t)) fail("rossz e-mail: nem az e-mail-hiba jött: " + t);
  await page.fill(`${f} [name="email"]`, "teszt@example.com"); await page.click(`${f} button`);
  await page.waitForSelector('[role="status"]', { timeout: 15000 });
  const msgs = (await readDb()).messages; if (!msgs.some((m) => m.email === "teszt@example.com" && /turak/.test(m.page ?? ""))) fail("az üzenet nem került a tárba az oldal-hivatkozással");
  console.log("A) kapcsolati űrlap OK (hibák mezőre mutatnak, siker tárolva, oldal:", msgs[0].page, ")");
  await go("/en/turak"); await page.click(`${f} button`); t = await alertText(); if (!/name/i.test(t)) fail("angol oldalon nem angol a hiba: " + t);
  console.log("A2) angol hibaüzenet OK:", t.slice(0, 50));

  /* B) jelentkezés a példa-túrára */
  await go("/esemenyek/oszi-lovastura-2026-09-19");
  const r = '[data-testid="registration-form"]';
  await page.fill(`${r} #r-name`, "Teszt Elek"); await page.fill(`${r} #r-phone`, "12"); await page.click(`${r} button`);
  t = await alertText(); if (!/telefon/i.test(t)) fail("rossz telefon: nem a telefon-hiba jött: " + t);
  await page.fill(`${r} #r-phone`, "+36 30 111 2222"); await page.fill(`${r} #r-count`, "0"); await page.click(`${r} button`);
  t = await alertText(); if (!/1 és 99/.test(t)) fail("rossz létszám: nem a létszám-hiba jött: " + t);
  await page.fill(`${r} #r-count`, "4"); await page.click(`${r} button`); await page.waitForSelector('[role="status"]', { timeout: 15000 });
  const regs = (await readDb()).registrations; if (!regs.some((x) => x.name === "Teszt Elek" && x.count === 4)) fail("a jelentkezés nem került a tárba");
  console.log("B) jelentkezés OK (2 hiba mezőre mutat, siker tárolva, 4 fő)");
  /* Más IP-ről, különben a 10 mp-es sebességkorlát üzenete jönne (az is helyes, csak nem ezt mérjük). */
  const closed = await ctx.request.post(`${BASE}/api/register`, { headers: { "x-forwarded-for": "203.0.113.7" }, data: { eventId: "lovasnapok-2026", name: "Teszt Elek", phone: "+36 30 111 2222", count: "2", lang: "hu" } });
  if (closed.status() !== 400 || !/nem lehet jelentkezni/.test((await closed.json()).error)) fail("lezárt eseményre nem a lezárt-üzenet jött");
  console.log("B2) lezárt esemény üzenete OK");

  /* C) sok esemény / nincs esemény */
  let db = await readDb();
  const mk = (i) => ({ id: `qa-ev-${i}`, published: true, featured: false, registration: i % 2 === 0, title: { hu: `QA esemény ${i}`, en: `QA event ${i}`, de: `QA Event ${i}` }, date: new Date(Date.now() + (40 + i * 7) * 864e5).toISOString().slice(0, 10), location: "Gyűrűsi Ménes, Gyűrűs", image: "osveny-ugras-allo", summary: { hu: "QA teszt.", en: "QA test.", de: "QA-Test." } });
  db.events = [...Array.from({ length: 5 }, (_, i) => mk(i + 1)), ...db.events]; await writeDb(db);
  await go("/esemenyek");
  const cards = await page.locator(".ev-grid .ev-card").count(); const feats = await page.locator("[data-featured-event]").count();
  if (cards < 6) fail(`sok esemény: csak ${cards} kártya`); if (feats !== 1) fail(`kiemelt blokk: ${feats} db`);
  await go("/"); if ((await page.locator("[data-featured-event]").count()) !== 1) fail("főoldal: nem egy kiemelt");
  console.log(`C) sok esemény OK (${cards} kártya, 1 kiemelt)`);
  db = await readDb(); db.events.forEach((e) => { if (e.date >= new Date().toISOString().slice(0, 10)) e.published = false; }); await writeDb(db);
  await go("/"); const home = await page.content(); if (!home.includes("Most nincs kitűzött esemény")) fail("nincs esemény: hiányzik a „nincs kitűzött” szöveg a főoldalon");
  await go("/esemenyek"); if (!(await page.content()).includes("Most nincs kitűzött esemény")) fail("nincs esemény: hiányzik a szöveg a naptárban");
  if ((await page.locator("[data-featured-event]").count()) !== 0) fail("nincs esemény: mégis van kiemelt");
  console.log("C2) nincs esemény: mindkét lap a magyarázó szöveget adja");
  spawnSync("node", [path.join(ROOT, "scripts/db-reset.mjs")], { stdio: "ignore" });

  /* D) admin visszajelzések */
  const txt = path.join(os.tmpdir(), "qa-nem-pdf.txt"); await fs.writeFile(txt, "ez nem pdf");
  await go("/admin/beszamolok"); await page.setInputFiles("#file", txt); await page.fill("#title", "QA hibás fájl"); await page.click('button:has-text("Feltöltés")');
  await page.waitForSelector('[data-flash="err"]', { timeout: 15000 }); t = await page.locator('[data-flash="err"]').innerText(); if (!/Csak PDF/.test(t)) fail("nem-PDF: nem a részletes hiba jött: " + t);
  console.log("D) admin: nem-PDF hibája OK →", t.replace(/\s+/g, " ").slice(0, 80));
  await go("/admin/beszamolok"); await page.setInputFiles("#file", txt); await page.fill("#title", ""); await page.click('button:has-text("Feltöltés")').catch(() => {});
  await go("/admin/oldalak/turak"); await page.click('button:has-text("Mentés")'); await page.waitForSelector('[data-flash="ok"]', { timeout: 15000 });
  t = await page.locator('[data-flash="ok"]').innerText(); if (!/mentve/i.test(t)) fail("mentés: nincs „mentve” visszajelzés: " + t);
  console.log("D2) admin: mentés visszajelzése OK →", t.trim());
  await go("/admin/esemenyek/uj"); await page.fill("#title\\.hu", "QA hiányos"); await page.fill("#date", "2027-01-10"); await page.fill("#endDate", "2026-12-01");
  await page.fill("#summary\\.hu", "x"); await page.click('button:has-text("Mentés")'); await page.waitForSelector('[data-flash="err"]', { timeout: 15000 });
  t = await page.locator('[data-flash="err"]').innerText(); if (!/záró nap/.test(t)) fail("rossz dátum: nem a záró-nap hiba jött: " + t);
  console.log("D3) admin: dátum-hiba OK →", t.replace(/\s+/g, " ").slice(0, 80));
  if (errors.length) fail("böngésző-hibák: " + errors.join(" | "));
  console.log("QA_FLOW_OK");
} finally { await browser.close(); spawnSync("node", [path.join(ROOT, "scripts/db-reset.mjs")], { stdio: "ignore" }); }
