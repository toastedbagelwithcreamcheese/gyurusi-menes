/**
 * G28 — élő-szerű ellenőrzés egy futó példány ellen (Netlify draft deploy: valódi Blobs, CDN, függvénykorlátok).
 *
 * A cél címe: BASE_URL, különben a .netlify/draft-url.txt első sora (a `netlify deploy` draft URL-je). Jelszavas adminnál
 * (a /api/admin/backup hitelesítés nélkül 401) az ADMIN_USER / ADMIN_PASSWORD környezeti változóval lép be — a böngésző a belépő
 * oldalon (süti), az API-hívások Basic Auth-tal. Jelszó nélküli célon a 3) lépés nem futhat: a jelentkezés IP-nkénti sebességkorlátja
 * alól csak a BELÉPETT admin kivétel (src/app/api/register/route.ts), ezért a szkript ilyenkor az elején FAIL-lel áll meg.
 *
 *  0) fixture-ök: ≥ 8 MB-os fotószerű JPEG (sharp) és egy 12 MB-os PDF (véletlen tartalom, %PDF- fejléccel)
 *  1) egy korábbi, félbeszakadt futás maradékai (FINAL-LIVE jelölésű esemény, beszámoló, feltöltött kép) törlése
 *  2) próbaesemény az admin felületén: „FINAL-LIVE PRÓBA — automatikus teszt, törlendő (<futás>)”, közzétéve, jelentkezéssel,
 *     NEM kiemelt, ~11 hónap múlva; a nyilvános eseménylap 200 és a címet adja
 *  3) 20 egyidejű jelentkezés a /api/register-re (x-gm-probe: final-live → a szerver nem küld e-mailt) → mind 200 {ok, stored};
 *     a tár szerint (GET /api/admin/backup) pontosan 20, a nevek egyeznek; az admin /admin/jelentkezesek lapon a csoportban 20 sor.
 *     Kontroll: ugyanez a számláló egy nem létező eseményre 0-t ad.
 *  4) feltöltés az admin felületén (Playwright): 8 MB-os fotó a Képek lapon (a böngésző kicsinyíti) → siker, a /files alól WebP-ként jön;
 *     12 MB-os PDF a Beszámolók lapon (NEM közzétéve) → siker, a letöltött bájtok SHA-256-ja és Content-Length-je egyezik
 *  5) admin-mentés: a próbaesemény címének módosítása → a nyilvános eseménylap legfeljebb 15 s alatt az új címet adja
 *     (előtte a lapot kétszer lekéri, hogy gyorsítótárban legyen; a cache-fejléceket naplózza)
 *  6) TTFB: a főoldal és a /turak második kérése gyorsítótár-találat (cache-status …; hit vagy x-nextjs-cache: HIT), TTFB ≤ 250 ms
 *  7) Lighthouse 13 mobil (szimulált lassítás, Accept-Language: hu) a főoldalon: Performance ≥ 95 (egy futás; ha bukik, 3 futás mediánja)
 *  8) takarítás (hiba esetén is): beszámoló, feltöltött kép, esemény törlése az admin felületén (az esemény a jelentkezéseit is viszi);
 *     ellenőrzés a tár szerint (nincs FINAL-LIVE esemény / beszámoló / feltöltés, a próbaesemény jelentkezései 0) és az admin lapjain;
 *     a nyilvános eseménylap 15 s-on belül 404 (CDN-találat esetén a cache-status naplózva).
 * Kilépés: „PASS: final-live”, ha minden állítás teljesült; különben „FAIL: final-live — …” és 1-es kód.
 *
 *   BASE_URL=http://localhost:3012 ADMIN_PASSWORD=… node scripts/with-server.mjs node scripts/checks/final-live.mjs   (helyi próba)
 *   ADMIN_PASSWORD=… node scripts/checks/final-live.mjs                                                          (draft: .netlify/draft-url.txt)
 * Változók: LH_CHROME / CHROME_PATH (Lighthouse-hoz a telepített Chrome), PW_CHROME (Playwright), SKIP_LIGHTHOUSE=1 (csak hibakereséshez —
 * ilyenkor nincs PASS), FINAL_LIVE_CONTROL=noauth (kontroll: a 20 jelentkezés hitelesítés nélkül megy → a korlát miatt FAIL várt).
 */
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DRAFT_FILE = path.join(ROOT, ".netlify/draft-url.txt");
const BASE = (process.env.BASE_URL || (existsSync(DRAFT_FILE) ? readFileSync(DRAFT_FILE, "utf8").split("\n")[0].trim() : "")).replace(/\/$/, "");
const PW_CHROME = process.env.PW_CHROME ?? path.join(os.homedir(), "Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const LH_CHROME = process.env.LH_CHROME ?? process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const MB = 1024 * 1024;
const MARK = "FINAL-LIVE PRÓBA";
const RUN = Date.now().toString(36);
const TITLE = `${MARK} — automatikus teszt, törlendő (${RUN})`;
const TITLE2 = `${MARK} — módosítva, törlendő (${RUN})`;
const REPORT = `${MARK} beszámoló (${RUN})`;
const PHOTO_ALT = `${MARK} fotó (${RUN})`;
const N_REG = 20;
const LIMITS = { refreshMs: 15_000, ttfbMs: 250, perf: 95 };
const CONTROL = process.env.FINAL_LIVE_CONTROL ?? "";
const problems = [];
const bad = (m) => { problems.push(m); console.log(`  ✗ ${m}`); };
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (b) => createHash("sha256").update(b).digest("hex");
const t0 = Date.now();

if (!BASE) { console.error(`FAIL: final-live — nincs cél: add meg a BASE_URL-t, vagy írd a draft URL-t a ${path.relative(ROOT, DRAFT_FILE)} fájlba`); process.exit(1); }
const creds = process.env.ADMIN_PASSWORD ? { user: process.env.ADMIN_USER ?? "", pass: process.env.ADMIN_PASSWORD } : null;
const basic = creds ? { authorization: `Basic ${Buffer.from(`${creds.user}:${creds.pass}`).toString("base64")}` } : {};

/** Admin-API hívás Basic Auth-tal (a /api/admin/* a proxy és a route mögött is ezt fogadja el). */
const adminJson = async (p, init = {}) => {
  const r = await fetch(BASE + p, { ...init, headers: { ...basic, ...(init.headers ?? {}) } });
  if (!r.ok) throw new Error(`${p} → HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
};
/** A tár állapota az admin mentés-API-ja szerint: a tartalomdokumentum + minden jelentkezés és üzenet. */
const backup = () => adminJson("/api/admin/backup", { headers: { "cache-control": "no-cache" } });
const pub = (p, headers = {}) => fetch(BASE + p, { redirect: "manual", headers: { "accept-language": "hu", ...headers } });
const cacheInfo = (r) => [r.headers.get("cache-status") && `cache-status: ${r.headers.get("cache-status")}`, r.headers.get("x-nextjs-cache") && `x-nextjs-cache: ${r.headers.get("x-nextjs-cache")}`, r.headers.get("age") && `age: ${r.headers.get("age")}`].filter(Boolean).join(" | ") || "nincs cache-fejléc";
/** Gyorsítótár-találat: a Netlify cache-status valamelyik tagja „hit” (pl. "Netlify Edge"; hit), vagy a Next saját fejléce HIT. */
const isHit = (r) => /;\s*hit\b/i.test(r.headers.get("cache-status") ?? "") || r.headers.get("x-nextjs-cache") === "HIT";

/** Aszinkron gyerekfolyamat (Lighthouse): a spawnSync megállítaná az eseményhurkot, és a fetch keep-alive kapcsolatai elhalnának. */
const run = (cmd, args, { env = process.env, timeout = 300_000 } = {}) => new Promise((resolve) => {
  const child = spawn(cmd, args, { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "";
  child.stdout.on("data", (d) => { stdout += d; }); child.stderr.on("data", (d) => { stderr += d; });
  const timer = setTimeout(() => child.kill("SIGKILL"), timeout);
  child.on("close", (status) => { clearTimeout(timer); resolve({ status, stdout, stderr }); });
});

/* ---------- 0) fixture-ök ---------- */
async function noisyJpeg(file) {
  /* Fotószerű: színátmenet + szemcse (a p2-uploads fixture-je) — a JPEG így ≥ 8 MB marad. */
  const W = 4000, H = 3000, amp = 40;
  const raw = Buffer.alloc(W * H * 3), rnd = randomBytes(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3, g = [x / W * 200 + 30, y / H * 180 + 40, (x + y) / (W + H) * 160 + 50];
    for (let c = 0; c < 3; c++) raw[i + c] = Math.max(0, Math.min(255, g[c] + (rnd[i + c] / 255 - 0.5) * 2 * amp));
  }
  for (const quality of [85, 90, 95]) {
    const buf = await sharp(raw, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality, chromaSubsampling: "4:4:4" }).toBuffer();
    if (buf.length >= 8 * MB) { await fs.writeFile(file, buf); return buf.length; }
  }
  throw new Error("a zajos JPEG fixture nem érte el a 8 MB-ot");
}

let browser = null, ctx = null, page = null;
const state = { eventId: null, uploadId: null, reportId: null };

async function go(p) {
  const r = await page.goto(BASE + p, { waitUntil: "networkidle", timeout: 60_000 });
  if (!r || r.status() >= 400) throw new Error(`${p} → HTTP ${r?.status()}`);
}
/** Kétlépcsős törlés (ConfirmButton): az első gomb csak kérdez, az „Igen, törlöm” az élesítés után 0,3 s-ig nem reagál. */
async function confirmDelete(scope) {
  await scope.locator("[data-confirm-start]").first().click();
  const yes = scope.locator("[data-confirm-yes]").first();
  await yes.waitFor({ timeout: 10_000 });
  await page.waitForTimeout(450);
  await yes.click();
}
async function login(protectedAdmin) {
  if (!protectedAdmin) return;
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle", timeout: 60_000 });
  if (!new URL(page.url()).pathname.startsWith("/admin/belepes")) return;
  if (await page.locator("#user").count()) await page.fill("#user", creds.user);
  await page.fill("#password", creds.pass);
  await page.click("[data-login-submit]");
  await page.waitForFunction(() => location.pathname !== "/admin/belepes" || !!document.querySelector("[data-login-error]"), null, { timeout: 30_000 });
  if (new URL(page.url()).pathname.startsWith("/admin/belepes")) throw new Error(`a belépés nem sikerült: ${await page.locator("[data-login-error]").innerText()}`);
}

async function deleteEvent(id) {
  await go(`/admin/esemenyek/${id}`);
  await Promise.all([page.waitForURL(/\/admin\/esemenyek(\?|$)/, { timeout: 60_000 }), confirmDelete(page.locator('[data-delete="event"]'))]);
}
async function deleteReport(id) {
  await go("/admin/beszamolok");
  const row = page.locator(`[data-report-row="${id}"]`);
  if (!(await row.count())) return;
  await confirmDelete(row);
  await page.waitForSelector(`[data-report-row="${id}"]`, { state: "detached", timeout: 30_000 });
}
async function deleteUpload(id) {
  await go("/admin/kepek");
  const tile = page.locator(`[data-image-tile="${id}"]`);
  if (!(await tile.count())) return;
  await tile.hover();
  await confirmDelete(tile);
  await page.waitForSelector(`[data-image-tile="${id}"]`, { state: "detached", timeout: 30_000 });
}

/** A tárban lévő FINAL-LIVE jelölésű tételek (csak ezek — az ügyfél saját feltöltéseihez és eseményeihez nem nyúlunk). */
const leftovers = (b) => ({
  events: (b.site.events ?? []).filter((e) => (e.title?.hu ?? "").includes(MARK)).map((e) => e.id),
  reports: (b.site.reports ?? []).filter((r) => (r.title ?? "").includes(MARK)).map((r) => r.id),
  uploads: (b.site.uploads ?? []).filter((u) => (u.alt ?? "").includes(MARK)).map((u) => u.id),
  registrations: (b.registrations ?? []).filter((r) => (r.name ?? "").startsWith("FINAL-LIVE ")).map((r) => r.id),
});

try {
  log(`final-live: ${BASE} (futás ${RUN})`);

  /* ---------- előfeltételek ---------- */
  const probe = await fetch(`${BASE}/api/admin/backup`, { redirect: "manual" });
  const protectedAdmin = probe.status === 401;
  if (!protectedAdmin && probe.status !== 200) throw new Error(`a /api/admin/backup hitelesítés nélkül HTTP ${probe.status} (401 vagy 200 várt)`);
  if (!protectedAdmin) throw new Error("a célon az admin jelszó nélkül nyitott (nincs ADMIN_PASSWORD): a 20 egyidejű jelentkezést az IP-nkénti sebességkorlát 429-cel fogná meg — csak belépett admin kivétel. Futtasd jelszavas példány ellen.");
  if (!creds) throw new Error("a cél jelszavas adminú (401), de nincs ADMIN_PASSWORD (és ha kell, ADMIN_USER) a környezetben");
  const bk0 = await backup();
  if (bk0.format !== "gyurusi-menes-backup") throw new Error(`a /api/admin/backup nem a várt mentés-formátum: ${String(bk0.format)}`);
  log(`előfeltétel: admin jelszavas (hitelesítés nélkül 401), a mentés-API elérhető — ${bk0.site.events.length} esemény, ${bk0.registrations.length} jelentkezés a tárban`);

  /* ---------- 0) fixture-ök ---------- */
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "final-live-"));
  const jpeg = path.join(tmp, "final-live-foto.jpg");
  const jpegBytes = await noisyJpeg(jpeg);
  const pdfFile = path.join(tmp, "final-live-12mb.pdf");
  const head = Buffer.from("%PDF-1.7\n%âãÏÓ\n", "latin1"), tail = Buffer.from("\n%%EOF\n");
  const pdf = Buffer.concat([head, randomBytes(12 * MB - head.length - tail.length), tail]);
  await fs.writeFile(pdfFile, pdf);
  log(`0) fixture-ök: JPEG ${(jpegBytes / MB).toFixed(1)} MB (4000×3000), PDF ${(pdf.length / MB).toFixed(1)} MB`);

  browser = await chromium.launch({ executablePath: PW_CHROME, headless: true });
  ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "hu-HU" });
  page = await ctx.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  await login(protectedAdmin);
  log("   belépés az admin felületére: OK");

  /* ---------- 1) korábbi maradékok ---------- */
  {
    const lo = leftovers(bk0);
    for (const id of lo.reports) await deleteReport(id);
    for (const id of lo.uploads) await deleteUpload(id);
    for (const id of lo.events) await deleteEvent(id);
    log(`1) korábbi maradékok törölve: ${lo.events.length} esemény, ${lo.reports.length} beszámoló, ${lo.uploads.length} feltöltés (a jelentkezéseik az eseménnyel mentek; önálló maradék jelentkezés: ${lo.registrations.length})`);
  }

  /* ---------- 2) próbaesemény ---------- */
  {
    const date = new Date(Date.now() + 330 * 864e5).toISOString().slice(0, 10);
    await go("/admin/esemenyek/uj");
    await page.locator("details[data-translations]").evaluateAll((ds) => ds.forEach((d) => { d.open = true; }));
    await page.fill("#title\\.hu", TITLE); await page.fill("#title\\.en", `${TITLE} EN`); await page.fill("#title\\.de", `${TITLE} DE`);
    await page.fill("#date", date); await page.fill("#location", "Próbaesemény — nem valós");
    await page.fill("#summary\\.hu", "Automatikus élő-szerű teszt — a próba végén törlődik."); await page.fill("#summary\\.en", "Automated live test — deleted afterwards."); await page.fill("#summary\\.de", "Automatischer Live-Test — wird danach gelöscht.");
    await page.check('input[name="published"]'); await page.uncheck('input[name="featured"]'); await page.check('input[name="registration"]');
    const firstImage = page.locator('input[name="image"]').first();
    if (await firstImage.count()) await firstImage.check();
    await Promise.all([page.waitForURL(/\/admin\/esemenyek(\?|$)/, { timeout: 60_000 }), page.click('button:has-text("Mentés")')]);
    const row = page.locator("[data-event-row]", { hasText: TITLE });
    if (!(await row.count())) throw new Error("a próbaesemény nem jelent meg az admin eseménylistájában");
    state.eventId = await row.first().getAttribute("data-event-row");
    let ok = false, last = null;
    for (let i = 0; i < 15 && !ok; i++) { last = await pub(`/esemenyek/${state.eventId}`); const html = await last.text(); ok = last.status === 200 && html.includes(TITLE); if (!ok) await sleep(1000); }
    if (!ok) throw new Error(`a próbaesemény nyilvános lapja 15 s alatt sem adja a címet (HTTP ${last?.status})`);
    log(`2) próbaesemény: ${state.eventId} (${date}, közzétéve, jelentkezéssel, nem kiemelt) — a nyilvános lap 200 a címmel`);
  }

  /* ---------- 3) 20 egyidejű jelentkezés ---------- */
  {
    const headers = { "content-type": "application/json", "x-gm-probe": "final-live", ...(CONTROL === "noauth" ? {} : basic) };
    const names = Array.from({ length: N_REG }, (_, i) => `FINAL-LIVE ${RUN} #${String(i + 1).padStart(2, "0")}`);
    const tReg = Date.now();
    const results = await Promise.all(names.map((name, i) => fetch(`${BASE}/api/register`, {
      method: "POST", headers,
      body: JSON.stringify({ lang: "hu", eventId: state.eventId, name, phone: `+36 30 000 ${String(1000 + i)}`, count: "1", note: `${MARK} ${RUN}` }),
    }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) })).catch((e) => ({ status: 0, body: { error: String(e) } }))));
    const ms = Date.now() - tReg;
    const okCount = results.filter((r) => r.status === 200 && r.body.ok && r.body.stored).length;
    const statuses = results.reduce((m, r) => { m[r.status] = (m[r.status] ?? 0) + 1; return m; }, {});
    if (okCount !== N_REG) bad(`3) ${okCount}/${N_REG} jelentkezés kapott 200 {ok, stored} választ (állapotkódok: ${JSON.stringify(statuses)})`);
    const countFor = (b, eventId) => (b.registrations ?? []).filter((r) => r.eventId === eventId);
    let stored = [];
    for (let i = 0; i < 10; i++) { stored = countFor(await backup(), state.eventId); if (stored.length >= N_REG) break; await sleep(1000); }
    const storedNames = new Set(stored.map((r) => r.name));
    const missing = names.filter((n) => !storedNames.has(n));
    if (stored.length !== N_REG || missing.length) bad(`3) a tárban ${stored.length} jelentkezés a próbaeseményre (${N_REG} várt), hiányzik: ${missing.join(", ") || "—"}`);
    if (countFor(await backup(), `nincs-ilyen-${RUN}`).length !== 0) bad("3) kontroll: a számláló egy nem létező eseményre is talál jelentkezést");
    await go("/admin/jelentkezesek");
    const rows = await page.locator(`[data-reg-group="${state.eventId}"] [data-registration-row]`).count();
    if (rows !== N_REG) bad(`3) az admin /admin/jelentkezesek lapon ${rows} sor a próbaesemény csoportjában (${N_REG} várt)`);
    log(`3) ${N_REG} egyidejű jelentkezés ${ms} ms alatt: ${okCount} × 200 {ok, stored} (${JSON.stringify(statuses)}); a tár szerint ${stored.length}, a nevek egyeznek: ${missing.length === 0}; admin-lista: ${rows} sor; kontroll: nem létező eseményre 0`);
  }

  /* ---------- 4) 8 MB-os fotó és 12 MB-os PDF az admin felületén ---------- */
  {
    await go("/admin/kepek");
    const up = page.locator("[data-image-upload]");
    const tImg = Date.now();
    await up.locator("[data-upload-file]").setInputFiles(jpeg);
    await up.locator("[data-upload-alt]").fill(PHOTO_ALT);
    await up.locator("[data-upload-submit]").click();
    const result = await Promise.race([
      up.locator('[data-upload-status="ok"]').waitFor({ timeout: 180_000 }).then(() => "ok"),
      up.locator('[data-upload-status="err"]').waitFor({ timeout: 180_000 }).then(() => "err"),
    ]);
    if (result !== "ok") throw new Error(`4) a 8 MB-os fotó feltöltése hibával állt meg: ${await up.locator('[data-upload-status="err"]').innerText()}`);
    state.uploadId = await up.locator('[data-upload-status="ok"]').getAttribute("data-upload-id");
    await page.locator(`[data-image-tile="${state.uploadId}"]`).waitFor({ timeout: 60_000 });
    const img = await ctx.request.get(`${BASE}/files/${state.uploadId}.webp`);
    const imgBody = await img.body();
    const meta = img.ok() ? await sharp(imgBody).metadata() : {};
    if (!img.ok() || !(img.headers()["content-type"] ?? "").includes("image/webp") || meta.format !== "webp") bad(`4) a feltöltött fotó nem jön WebP-ként a /files alól: HTTP ${img.status()} ${img.headers()["content-type"]}`);
    log(`4) fotó: ${(jpegBytes / MB).toFixed(1)} MB → ${state.uploadId} (${Math.round(imgBody.length / 1024)} KB, ${meta.width}×${meta.height} WebP) ${Date.now() - tImg} ms`);

    await go("/admin/beszamolok");
    const form = page.locator("[data-report-upload]");
    const tPdf = Date.now();
    await form.locator("#file").setInputFiles(pdfFile);
    await form.locator("#title").fill(REPORT);
    await form.locator('input[name="published"]').uncheck();
    await form.locator('button:has-text("Feltöltés")').click();
    const pres = await Promise.race([
      form.locator('[data-upload-status="ok"]', { hasText: REPORT }).waitFor({ timeout: 300_000 }).then(() => "ok"),
      form.locator('[data-upload-status="err"]').waitFor({ timeout: 300_000 }).then(() => "err"),
    ]);
    if (pres !== "ok") throw new Error(`4) a 12 MB-os PDF feltöltése hibával állt meg: ${await form.locator('[data-upload-status="err"]').innerText()}`);
    const row = page.locator("[data-report-row]", { hasText: REPORT });
    await row.waitFor({ timeout: 60_000 });
    state.reportId = await row.getAttribute("data-report-row");
    const href = await row.locator('a[href^="/files/"]').getAttribute("href");
    const dl = await ctx.request.get(BASE + href, { timeout: 120_000 });
    const buf = await dl.body();
    if (!dl.ok()) bad(`4) a PDF letöltése HTTP ${dl.status()}`);
    else if (sha(buf) !== sha(pdf)) bad(`4) a letöltött PDF bájtjai nem egyeznek (${buf.length} bájt, ${pdf.length} várt)`);
    if (dl.ok() && Number(dl.headers()["content-length"] ?? buf.length) !== pdf.length) bad(`4) a PDF Content-Length-je ${dl.headers()["content-length"]} (${pdf.length} várt)`);
    if (dl.ok() && dl.headers()["content-type"] !== "application/pdf") bad(`4) a PDF Content-Type-ja ${dl.headers()["content-type"]}`);
    const sameId = (await backup()).site.reports.find((r) => r.id === state.reportId);
    if (!sameId || sameId.published) bad(`4) a beszámoló a tárban ${sameId ? "közzétéve (nem várt)" : "nincs meg"}`);
    log(`4) PDF: ${(pdf.length / MB).toFixed(1)} MB → ${href} (nem közzétéve) ${Date.now() - tPdf} ms; letöltve ${buf.length} bájt, SHA-256 egyezik: ${sha(buf) === sha(pdf)}`);
  }

  /* ---------- 5) admin-mentés → a nyilvános lap ≤ 15 s alatt frissül ---------- */
  {
    const evPath = `/esemenyek/${state.eventId}`;
    const w1 = await pub(evPath); await w1.text();
    const w2 = await pub(evPath); const w2html = await w2.text();
    if (!w2html.includes(TITLE)) bad("5) a bemelegített eseménylap nem a régi címet adja");
    log(`5) bemelegítés: ${evPath} 1. ${cacheInfo(w1)} · 2. ${cacheInfo(w2)}`);
    await go(`/admin/esemenyek/${state.eventId}`);
    await page.fill("#title\\.hu", TITLE2);
    await Promise.all([page.waitForURL(/\/admin\/esemenyek(\?|$)/, { timeout: 60_000 }), page.click('button:has-text("Mentés")')]);
    const tSaved = Date.now();
    let seen = null, lastInfo = "";
    while (Date.now() - tSaved <= LIMITS.refreshMs) {
      const r = await pub(evPath); const html = await r.text(); lastInfo = `HTTP ${r.status}, ${cacheInfo(r)}`;
      if (r.status === 200 && html.includes(TITLE2)) { seen = Date.now() - tSaved; break; }
      await sleep(500);
    }
    if (seen === null) bad(`5) admin-mentés után ${LIMITS.refreshMs / 1000} s alatt sem jelent meg az új cím a nyilvános lapon (utolsó: ${lastInfo})`);
    log(`5) admin-mentés → az új cím ${seen === null ? "NEM jelent meg" : `${seen} ms`} alatt a nyilvános lapon (${lastInfo})`);
  }

  /* ---------- 6) TTFB gyorsítótár-találatnál ---------- */
  for (const p of ["/", "/turak"]) {
    const first = await pub(p); await first.text();
    let best = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const ts = performance.now();
      const r = await pub(p);
      const ttfb = performance.now() - ts;
      await r.text();
      const hit = isHit(r);
      log(`6) ${p} ${attempt + 1}. kérés: HTTP ${r.status}, TTFB ${Math.round(ttfb)} ms, ${hit ? "találat" : "NEM találat"} (${cacheInfo(r)})`);
      if (r.status === 200 && hit && (!best || ttfb < best.ttfb)) best = { ttfb, info: cacheInfo(r) };
      if (best && best.ttfb <= LIMITS.ttfbMs) break;
    }
    if (!best) bad(`6) ${p}: a második (és további két) kérés sem volt gyorsítótár-találat (első kérés: ${cacheInfo(first)})`);
    else if (best.ttfb > LIMITS.ttfbMs) bad(`6) ${p}: gyorsítótár-találatnál a TTFB ${Math.round(best.ttfb)} ms > ${LIMITS.ttfbMs} ms`);
  }

  /* ---------- 7) Lighthouse mobil a főoldalon ---------- */
  if (process.env.SKIP_LIGHTHOUSE === "1") bad("7) a Lighthouse kihagyva (SKIP_LIGHTHOUSE=1) — PASS nem adható");
  else {
    const perfRuns = [];
    for (let runNo = 1; runNo <= 3; runNo++) {
      const out = path.join(os.tmpdir(), `final-live-lh-${RUN}-${runNo}.json`);
      const r = await run("npx", ["--yes", "lighthouse@13", `${BASE}/`, "--output=json", `--output-path=${out}`, "--only-categories=performance", "--form-factor=mobile", "--screenEmulation.mobile", "--throttling-method=simulate", "--quiet",
        `--extra-headers=${JSON.stringify({ "Accept-Language": "hu-HU,hu;q=0.9" })}`, "--chrome-flags=--headless=new --no-sandbox --disable-gpu"], { env: { ...process.env, CHROME_PATH: LH_CHROME } });
      if (r.status !== 0) { bad(`7) a Lighthouse kilépési kódja ${r.status}: ${r.stderr.slice(-300)}`); break; }
      const lh = JSON.parse(await fs.readFile(out, "utf8"));
      const A = lh.audits;
      const x = { perf: Math.round(lh.categories.performance.score * 100), lcp: A["largest-contentful-paint"].numericValue, tbt: A["total-blocking-time"].numericValue, cls: A["cumulative-layout-shift"].numericValue, final: lh.finalDisplayedUrl, version: lh.lighthouseVersion };
      perfRuns.push(x);
      log(`7) Lighthouse ${x.version} mobil / (${runNo}. futás): Performance ${x.perf} · LCP ${(x.lcp / 1000).toFixed(2)} s · TBT ${Math.round(x.tbt)} ms · CLS ${x.cls.toFixed(3)} · mért cím: ${x.final}`);
      if (new URL(x.final).pathname !== "/") bad(`7) a Lighthouse ${x.final} címet mérte (átirányítás?)`);
      if (runNo === 1 && x.perf >= LIMITS.perf) break;
    }
    if (perfRuns.length) {
      const sorted = perfRuns.map((x) => x.perf).sort((a, b) => a - b);
      const med = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
      if (med < LIMITS.perf) bad(`7) a főoldal mobil Performance ${med} < ${LIMITS.perf} (${perfRuns.length} futás: ${sorted.join(" / ")})`);
    }
  }
  if (pageErrors.length) bad(`böngésző-hibák az admin felületén: ${pageErrors.slice(0, 3).join(" | ")}`);
} catch (e) {
  bad(`váratlan hiba: ${e instanceof Error ? e.message : e}`);
} finally {
  /* ---------- 8) takarítás és ellenőrzés ---------- */
  if (page) {
    try {
      if (state.reportId) await deleteReport(state.reportId);
      if (state.uploadId) await deleteUpload(state.uploadId);
      if (state.eventId) await deleteEvent(state.eventId);
      const b = await backup();
      const lo = leftovers(b);
      const regs = state.eventId ? b.registrations.filter((r) => r.eventId === state.eventId).length : 0;
      if (lo.events.length || lo.reports.length || lo.uploads.length || lo.registrations.length || regs) bad(`8) takarítás után a tárban maradt: ${JSON.stringify({ ...lo, regsForEvent: regs })}`);
      if (state.eventId) {
        await go("/admin/jelentkezesek");
        if (await page.locator(`[data-reg-group="${state.eventId}"]`).count()) bad("8) takarítás után az admin jelentkezés-listájában még ott a próbaesemény csoportja");
        if ((await page.content()).includes(`FINAL-LIVE ${RUN}`)) bad("8) takarítás után az admin jelentkezés-listájában még látszik próbajelentkezés");
        await go("/admin/esemenyek");
        if (await page.locator("[data-event-row]", { hasText: MARK }).count()) bad("8) takarítás után az admin eseménylistájában még ott a próbaesemény");
        let gone = null, info = "";
        const tDel = Date.now();
        while (Date.now() - tDel <= LIMITS.refreshMs) {
          const r = await pub(`/esemenyek/${state.eventId}`); await r.text(); info = `HTTP ${r.status}, ${cacheInfo(r)}`;
          if (r.status === 404) { gone = Date.now() - tDel; break; }
          await sleep(500);
        }
        if (gone === null) bad(`8) a törölt próbaesemény nyilvános lapja ${LIMITS.refreshMs / 1000} s után sem 404 (${info})`);
        log(`8) takarítás: beszámoló, fotó, esemény (+${N_REG} jelentkezés) törölve; a tár szerint nincs FINAL-LIVE maradék; az eseménylap ${gone === null ? "nem" : `${gone} ms alatt`} 404`);
      }
      if (state.uploadId) {
        const r = await fetch(`${BASE}/files/${state.uploadId}.webp`);
        if (r.status !== 404 && !(r.status === 200 && isHit(r))) bad(`8) a törölt fotó még kiszolgálódik a /files alól: HTTP ${r.status} (${cacheInfo(r)})`);
        else if (r.status === 200) log(`   (a /files a törölt fotót CDN-gyorsítótárból adja — a tárból törölve; ${cacheInfo(r)})`);
      }
    } catch (e) {
      bad(`8) takarítás: ${e instanceof Error ? e.message : e} — ellenőrizd kézzel az /admin/esemenyek, /admin/beszamolok és /admin/kepek lapot (jelölés: „${MARK}”)`);
    }
  }
  if (browser) await browser.close().catch(() => {});
}

const secs = Math.round((Date.now() - t0) / 1000);
if (problems.length) {
  console.error(`FAIL: final-live — ${problems.length} hiba (${secs} s)\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}
console.log(`PASS: final-live (${secs} s)`);
