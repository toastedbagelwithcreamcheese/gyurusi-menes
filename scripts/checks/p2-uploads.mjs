/**
 * G18 — valós méretű feltöltések: képek a böngészőben kicsinyítve, PDF darabolva, streamelt letöltés.
 * Használat: node scripts/with-server.mjs node scripts/checks/p2-uploads.mjs   (előtte: npm run build)
 * A with-server fájl-driverrel indítja a szervert (BASE_URL, alap a 3012-es port); a teszt a helyi data/ könyvtárat olvassa,
 * az elején és a végén npm run db:reset.
 *  0) ideiglenes fixture-ök: ≥ 8 MB-os zajos JPEG (sharp), .heic nevű image/heic fájl, 2,6 / 12 / 25 MB-os PDF, egy kisebb JPEG
 *  A) Képek lap: 8 MB-os JPEG → a böngésző kicsinyíti (a kérés ≤ 1,5 MB-os WebP) → siker, a kép a rácsban, a /files alól ≤ 4 MB és
 *     ≤ 2000 px; lassított feltöltésnél a folyamatjelző köztes értékkel megjelenik; HEIC → magyar, teendőt mondó üzenet, kérés nélkül
 *  B) Beszámolók lap: 2,6 MB (az első darab-kérés szándékosan megszakítva → egy újrapróbálás) és 12 MB (4 darab, lassítva, folyamat-
 *     jelzővel) → siker, a letöltött bájtok SHA-256-ja egyezik, Content-Length/Type/Disposition helyes; 25 MB → pontos méret-üzenet, kérés nélkül
 *  C) Esemény- és aloldal-szerkesztő: „Új kép feltöltése” a képválasztóban → a kép megjelenik és kiválasztódik, a beírt mezők megmaradnak;
 *     mentés után az esemény és az aloldal ezt a képet használja (a nyilvános lapon is)
 *  D) szerveroldali védelem közvetlen API-hívással: 5 MB-os kép → 413 MB-os üzenettel; nem kép → 415; hibás képbájtok → 422;
 *     nem-PDF első darab → 415; 25 MB-ra bejelentett darab → 413; hiányos összefűzés → 400; idegen Origin → 403
 *  E) félbemaradt darabok: egy 25 órája és egy most kezdett feltöltés → POST /api/admin/maintenance → csak a régi törlődik
 *  F) helyi Supabase (második next start szabad porton): kép és 12 MB-os PDF az API-n át a Storage-ba, a streamelt letöltés bájtra
 *     egyezik, a Content-Length a tárolt objektum méretével egyezik; a félbemaradt darabok takarítása az upload-chunks tárolóban is
 * Csak ha minden állítás teljesült: PASS: p2-uploads
 */
import { chromium } from "playwright-core";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { CheckError, ROOT, assert, chromeExe, dayOffset, dbReset, freePort, sleep, startNext, startSupabase, tmpDir } from "./_p1-harness.mjs";

const BASE = (process.env.BASE_URL ?? "http://localhost:3012").replace(/\/$/, "");
const DATA = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");
const MB = 1024 * 1024;
const CHUNK = 3.5 * MB;
const creds = process.env.ADMIN_USER && process.env.ADMIN_PASSWORD ? { username: process.env.ADMIN_USER, password: process.env.ADMIN_PASSWORD } : undefined;
const authHeader = creds ? { authorization: "Basic " + Buffer.from(`${creds.username}:${creds.password}`).toString("base64") } : {};
const log = (...a) => console.log(...a);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const huMB = (bytes) => `${new Intl.NumberFormat("hu-HU", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(bytes / MB)} MB`;
const exists = (p) => fs.stat(p).then(() => true, () => false);
const hex = () => randomBytes(8).toString("hex");
const cleanups = [];

/* ---------- 0) fixture-ök ---------- */
async function noisyJpeg(file) {
  /* Fotószerű zaj: színátmenet + ±40-es szemcse — a sima zajnál élethűbb, de a JPEG így is nagy marad. */
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
  throw new CheckError("a zajos JPEG fixture nem érte el a 8 MB-ot");
}
async function pdfFixture(file, bytes) {
  const head = Buffer.from("%PDF-1.7\n%âãÏÓ\n", "latin1"), tail = Buffer.from("\n%%EOF\n");
  const buf = Buffer.concat([head, randomBytes(bytes - head.length - tail.length), tail]);
  await fs.writeFile(file, buf);
  return { file, bytes: buf.length, sha: sha(buf) };
}

let passed = false;
let browser = null;
try {
  const r0 = await fetch(`${BASE}/robots.txt`).catch(() => null);
  assert(r0?.ok, `a szerver nem érhető el: ${BASE} (futtasd a with-server alatt)`);
  dbReset();

  const dir = await tmpDir("p2-uploads-");
  cleanups.push(() => fs.rm(dir, { recursive: true, force: true }));
  const bigJpeg = path.join(dir, "nagy-foto.jpg");
  const bigJpegBytes = await noisyJpeg(bigJpeg);
  const smallJpeg = path.join(dir, "kis-foto.jpg");
  await fs.writeFile(smallJpeg, await sharp({ create: { width: 1800, height: 1200, channels: 3, background: { r: 88, g: 116, b: 72 } } }).jpeg({ quality: 85 }).toBuffer());
  const heic = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypheic"), Buffer.from([0, 0, 0, 0]), Buffer.from("mif1heic"), randomBytes(200_000)]);
  const pdf26 = await pdfFixture(path.join(dir, "beszamolo-2-6.pdf"), Math.round(2.6 * MB));
  const pdf12 = await pdfFixture(path.join(dir, "beszamolo-12.pdf"), 12 * MB);
  const pdf25 = await pdfFixture(path.join(dir, "beszamolo-25.pdf"), 25 * MB);
  log(`0) fixture-ök: JPEG ${huMB(bigJpegBytes)}, HEIC ${huMB(heic.length)}, PDF ${huMB(pdf26.bytes)} / ${huMB(pdf12.bytes)} / ${huMB(pdf25.bytes)}`);

  browser = await chromium.launch({ executablePath: chromeExe, headless: true });
  const ctx = await browser.newContext({ httpCredentials: creds, viewport: { width: 1280, height: 900 }, locale: "hu-HU" });
  /* A küldött törzs mérete: a Playwright a Blob-törzsű XHR méretét nem látja (sizes() → 0), ezért a send()-nél jegyezzük fel — csak megfigyelés. */
  await ctx.addInitScript(() => {
    const send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body) { (window.__p2sent ??= []).push({ size: body?.size ?? null, type: body?.type ?? null }); return send.call(this, body); };
  });
  const sentBodies = () => page.evaluate(() => window.__p2sent ?? []);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  const throttle = (bytesPerSec) => cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: bytesPerSec });
  const unthrottle = () => throttle(-1);
  const uploads = [];
  page.on("request", (r) => { if (r.url().includes("/api/admin/upload-")) uploads.push(r.url()); });
  const count = (kind) => uploads.filter((u) => u.includes(`/api/admin/upload-${kind}`)).length;
  const go = async (p) => { const r = await page.goto(BASE + p, { waitUntil: "networkidle" }); assert(r && r.status() < 400, `${p} → ${r?.status()}`); };
  /* A folyamatjelző minden állapotát feljegyzi (a feltöltés helyben gyors — ezért lassítunk is). */
  const watchProgress = () => page.evaluate(() => {
    window.__p2 = [];
    const rec = () => { const el = document.querySelector("[data-upload-progress]"); if (el) window.__p2.push(el.getAttribute("data-upload-progress")); };
    new MutationObserver(rec).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-upload-progress"] });
  });
  const progressSeen = () => page.evaluate(() => window.__p2 ?? []);

  /* ---------- A) Képek lap ---------- */
  log("A) Képek lap");
  await go("/admin/kepek");
  const up = page.locator("[data-image-upload]").first();
  await up.locator("[data-upload-file]").setInputFiles(bigJpeg);
  await up.locator("[data-upload-alt]").fill("P2 nagy fotó");
  await watchProgress();
  await throttle(1.5 * MB);
  const t0 = Date.now();
  const [imgResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/admin/upload-image"), { timeout: 120_000 }),
    up.locator("[data-upload-submit]").click(),
  ]);
  const imgOk = up.locator('[data-upload-status="ok"]');
  await imgOk.waitFor({ timeout: 60_000 });
  const imgMs = Date.now() - t0;
  await unthrottle();
  const imgId = await imgOk.getAttribute("data-upload-id");
  const sentA = await sentBodies();
  assert(sentA.length === 1, `A: ${sentA.length} XHR-törzs indult (1 várt)`);
  const reqBytes = sentA[0].size;
  const reqType = imgResp.request().headers()["content-type"];
  assert(imgResp.status() === 200 && /^u-[a-z0-9]+$/.test(imgId ?? ""), `A: a képfeltöltés válasza ${imgResp.status()}, azonosító: ${imgId}`);
  assert(reqType === "image/webp", `A: a böngésző nem WebP-t küldött, hanem ${reqType}`);
  assert(reqBytes > 0 && reqBytes <= 1.5 * MB, `A: a kicsinyített kép ${reqBytes} bájt (cél ≤ 1,5 MB)`);
  await page.locator(`[data-image-tile="${imgId}"]`).waitFor({ timeout: 30_000 });
  const seenA = await progressSeen();
  const midA = seenA.filter((v) => v !== "" && Number(v) > 0 && Number(v) < 100);
  assert(seenA.length > 0, "A: a folyamatjelző nem jelent meg");
  assert(midA.length >= 1, `A: a folyamatjelzőn nem volt köztes érték (${seenA.join(",")})`);
  const imgFile = await ctx.request.get(`${BASE}/files/${imgId}.webp`);
  const imgBody = await imgFile.body();
  assert(imgFile.ok() && imgFile.headers()["content-type"] === "image/webp", `A: a /files válasz ${imgFile.status()} ${imgFile.headers()["content-type"]}`);
  assert(imgBody.length <= 4 * MB && Number(imgFile.headers()["content-length"]) === imgBody.length, `A: a tárolt kép ${imgBody.length} bájt, Content-Length ${imgFile.headers()["content-length"]}`);
  const imgMeta = await sharp(imgBody).metadata();
  assert(imgMeta.format === "webp" && Math.max(imgMeta.width, imgMeta.height) <= 2000, `A: a tárolt kép ${imgMeta.format} ${imgMeta.width}×${imgMeta.height}`);
  log(`  A1: ${huMB(bigJpegBytes)}-os JPEG → a böngészőből ${huMB(reqBytes)} WebP (1,5 MB/s-ra lassítva ${imgMs} ms), a tárban ${huMB(imgBody.length)} ${imgMeta.width}×${imgMeta.height}; folyamatjelző: ${[...new Set(seenA)].join(" → ")}`);

  const beforeHeic = count("image");
  assert(beforeHeic === 1, `kontroll: a kérésfigyelő ${beforeHeic} képfeltöltést látott (1 várt)`);
  await up.locator("[data-upload-file]").setInputFiles({ name: "IMG_0412.HEIC", mimeType: "image/heic", buffer: heic });
  /* A magyar leírás kötelező (javítókör): kitöltve, hogy a HEIC-hiba jöjjön, ne a hiányzó leírásé. */
  await up.locator("[data-upload-alt]").fill("P2 HEIC-próba");
  await up.locator("[data-upload-submit]").click();
  const heicErr = up.locator('[data-upload-status="err"]');
  await heicErr.waitFor({ timeout: 20_000 });
  const heicText = await heicErr.innerText();
  for (const needle of ["IMG_0412.HEIC", "HEIC formátumú", "iPhone", "Fotókból", "„Legkompatibilisebb”", "Macen", "JPEG formátumba"]) assert(heicText.includes(needle), `A: a HEIC-üzenetből hiányzik: ${needle} — ${heicText}`);
  assert((await heicErr.getAttribute("role")) === "alert", "A: a HEIC-hiba nem role=alert");
  await sleep(600);
  assert(count("image") === beforeHeic, "A: HEIC-nél mégis indult feltöltési kérés");
  log(`  A2: HEIC → magyar, teendőt mondó üzenet, feltöltési kérés nélkül: „${heicText.split("\n")[0].slice(0, 90)}…”`);

  /* ---------- B) Beszámolók lap ---------- */
  log("B) Beszámolók lap");
  await go("/admin/beszamolok");
  const form = page.locator("[data-report-upload]");
  const submitPdf = async (file, title) => { await form.locator("#file").setInputFiles(file); await form.locator("#title").fill(title); await form.locator('button:has-text("Feltöltés")').click(); };
  const verifyDownload = async (title, fx) => {
    const row = page.locator("[data-report-row]", { hasText: title });
    await row.waitFor({ timeout: 30_000 });
    const href = await row.locator('a[href^="/files/"]').getAttribute("href");
    const r = await ctx.request.get(BASE + href);
    const buf = await r.body();
    const h = r.headers();
    assert(r.ok(), `${title}: a letöltés ${r.status()}`);
    assert(sha(buf) === fx.sha, `${title}: a letöltött bájtok SHA-256-ja nem egyezik (${buf.length} bájt)`);
    assert(h["content-type"] === "application/pdf" && Number(h["content-length"]) === fx.bytes, `${title}: fejlécek: ${h["content-type"]}, Content-Length ${h["content-length"]} (várt ${fx.bytes})`);
    assert(/^inline; filename="r-[a-z0-9]+\.pdf"$/.test(h["content-disposition"] ?? ""), `${title}: Content-Disposition: ${h["content-disposition"]}`);
    return href;
  };

  const T26 = `P2 beszámoló 2,6 MB ${hex().slice(0, 6)}`;
  let routed = 0;
  const isChunk = (url) => url.pathname === "/api/admin/upload-chunk";
  const abortFirst = (route) => (routed++ === 0 ? route.abort("connectionreset") : route.continue());
  await page.route(isChunk, abortFirst);
  const c26 = count("chunk"), k26 = count("complete");
  await submitPdf(pdf26.file, T26);
  await form.locator('[data-upload-status="ok"]', { hasText: T26 }).waitFor({ timeout: 60_000 });
  await page.unroute(isChunk, abortFirst);
  assert(routed === 2 && count("chunk") - c26 === 2 && count("complete") - k26 === 1, `B1: ${count("chunk") - c26} darab-kérés (várt 2: egy megszakított + egy újrapróbálás), ${count("complete") - k26} összefűzés`);
  const href26 = await verifyDownload(T26, pdf26);
  log(`  B1: ${huMB(pdf26.bytes)} PDF: az első darab-kérés megszakítva → egy újrapróbálás → siker; ${href26} bájtra egyezik (SHA-256), Content-Length ${pdf26.bytes}`);

  const T12 = `P2 beszámoló 12 MB ${hex().slice(0, 6)}`;
  await page.evaluate(() => { window.__p2sent = []; });
  await watchProgress();
  await throttle(4 * MB);
  const c12 = count("chunk"), k12 = count("complete"), t12 = Date.now();
  await submitPdf(pdf12.file, T12);
  await form.locator('[data-upload-status="ok"]', { hasText: T12 }).waitFor({ timeout: 120_000 });
  const ms12 = Date.now() - t12;
  await unthrottle();
  const chunkBytes = (await sentBodies()).map((b) => b.size);
  assert(count("chunk") - c12 === 4 && count("complete") - k12 === 1, `B2: ${count("chunk") - c12} darab-kérés (4 várt), ${count("complete") - k12} összefűzés`);
  assert(chunkBytes.length === 4 && chunkBytes.every((n) => n > 0 && n <= CHUNK) && chunkBytes.reduce((a, n) => a + n, 0) === pdf12.bytes, `B2: a darabok mérete: ${chunkBytes.join(", ")}`);
  const seenB = await progressSeen();
  const midB = [...new Set(seenB.filter((v) => v !== "" && Number(v) > 0 && Number(v) < 100))];
  assert(midB.length >= 3, `B2: a folyamatjelzőn kevés köztes érték (${[...new Set(seenB)].join(",")})`);
  const href12 = await verifyDownload(T12, pdf12);
  log(`  B2: ${huMB(pdf12.bytes)} PDF 4 darabban (${chunkBytes.map(huMB).join(" + ")}), 4 MB/s-ra lassítva ${ms12} ms; folyamatjelző ${midB.length} köztes értékkel; ${href12} bájtra egyezik`);
  assert(sha(pdf26.sha + "x") !== sha(pdf12.sha + "x") && pdf26.sha !== pdf12.sha, "kontroll: a két fixture hash-e azonos");

  const c25 = count("chunk"), k25 = count("complete");
  assert(c25 >= 6, `kontroll: a kérésfigyelő csak ${c25} darab-kérést látott`);
  await submitPdf(pdf25.file, "P2 túl nagy");
  const err25 = form.locator('[data-upload-status="err"]');
  await err25.waitFor({ timeout: 20_000 });
  const t25 = await err25.innerText();
  const want25 = "A PDF túl nagy: 25,0 MB — legfeljebb 18 MB lehet";
  assert(t25.includes(want25), `B3: nem a pontos méret-üzenet jött: ${t25}`);
  await sleep(600);
  assert(count("chunk") === c25 && count("complete") === k25, "B3: a 25 MB-os PDF-nél mégis indult feltöltési kérés");
  log(`  B3: 25 MB → „${t25.slice(0, 70)}…”, feltöltési kérés nélkül`);

  /* ---------- C) szerkesztők képválasztója ---------- */
  log("C) Esemény- és aloldal-szerkesztő");
  const uploadInPicker = async (picker, alt) => {
    await picker.locator("summary", { hasText: "Új kép feltöltése" }).click();
    const pu = picker.locator("[data-image-upload]");
    await pu.locator("[data-upload-file]").setInputFiles(smallJpeg);
    await pu.locator("[data-upload-alt]").fill(alt);
    await pu.locator("[data-upload-submit]").click();
    const ok = pu.locator('[data-upload-status="ok"]');
    await ok.waitFor({ timeout: 60_000 });
    return ok.getAttribute("data-upload-id");
  };
  const EV = `P2 képválasztó teszt ${hex().slice(0, 6)}`;
  await go("/admin/esemenyek/uj");
  await page.fill("#title\\.hu", EV); await page.fill("#date", dayOffset(45)); await page.fill("#summary\\.hu", "P2 teszt — a kapu végén törlődik.");
  const evPicker = page.locator('[data-picker="image"]');
  const evImg = await uploadInPicker(evPicker, "P2 esemény-kép");
  const evRadio = evPicker.locator(`input[name="image"][value="${evImg}"]`);
  assert(await evRadio.isChecked(), "C1: a feltöltött kép nincs kiválasztva");
  await page.waitForLoadState("networkidle"); await sleep(800); // a router.refresh() lefutott
  assert(await evRadio.isChecked(), "C1: a frissítés után elveszett a kiválasztás");
  assert((await page.inputValue("#title\\.hu")) === EV, "C1: a feltöltés után elveszett a már beírt cím");
  await Promise.all([page.waitForURL(/\/admin\/esemenyek(\?|$)/, { timeout: 30_000 }), page.click('button:has-text("Mentés")')]);
  let site = JSON.parse(await fs.readFile(path.join(DATA, "site.json"), "utf8"));
  const ev = site.events.find((e) => e.title?.hu === EV);
  assert(ev && ev.image === evImg, `C1: a mentett esemény képe: ${ev?.image} (várt: ${evImg})`);
  const evPublic = await (await fetch(`${BASE}/esemenyek/${ev.id}`)).text();
  assert(evPublic.includes(evImg), "C1: a nyilvános eseménylap nem a feltöltött képet mutatja");
  log(`  C1: esemény-szerkesztő: feltöltés a képválasztóban → ${evImg} kiválasztva, a beírt cím megmaradt, mentve, a nyilvános eseménylapon látszik`);

  await go("/admin/oldalak/turak");
  const img1 = await page.locator('input[name="image1"]:checked').getAttribute("value");
  const pgPicker = page.locator('[data-picker="image2"]');
  const pgImg = await uploadInPicker(pgPicker, "P2 túra-kép");
  assert(await pgPicker.locator(`input[name="image2"][value="${pgImg}"]`).isChecked(), "C2: a feltöltött kép nincs kiválasztva a 2. képnél");
  await page.waitForLoadState("networkidle"); await sleep(800);
  assert((await page.locator('input[name="image1"]:checked').getAttribute("value")) === img1, "C2: a feltöltés elállította az 1. képet");
  await Promise.all([page.waitForURL(/\/admin\/oldalak(\?|$)/, { timeout: 30_000 }), page.click('button:has-text("Mentés")')]);
  site = JSON.parse(await fs.readFile(path.join(DATA, "site.json"), "utf8"));
  assert(site.pages.turak.images[0] === img1 && site.pages.turak.images[1] === pgImg, `C2: a mentett aloldal képei: ${site.pages.turak.images.join(", ")}`);
  assert((await (await fetch(`${BASE}/turak`)).text()).includes(pgImg), "C2: a nyilvános Túrák lap nem a feltöltött képet mutatja");
  log(`  C2: aloldal-szerkesztő (Túrák, 2. kép): ${pgImg} feltöltve és kiválasztva, az 1. kép (${img1}) nem változott, a nyilvános lapon látszik`);
  assert(errors.length === 0, "böngésző-hibák: " + errors.join(" | "));
  await browser.close(); browser = null;

  /* ---------- D) szerveroldali védelem ---------- */
  log("D) Szerveroldali ellenőrzések (közvetlen API-hívás)");
  const call = async (base, p, init = {}) => {
    const r = await fetch(base + p, { method: "POST", ...init, headers: { ...authHeader, ...(init.headers ?? {}) } });
    let j = {}; try { j = await r.json(); } catch { /* nem JSON */ }
    return { status: r.status, j };
  };
  const api = (p, init) => call(BASE, p, init);
  const octet = { "content-type": "application/octet-stream" };
  const pdfBytes = (n) => Buffer.concat([Buffer.from("%PDF-"), randomBytes(n - 5)]);
  let r = await api("/api/admin/upload-image?alt=x&name=nagy.jpg", { headers: { "content-type": "image/jpeg" }, body: randomBytes(5 * MB) });
  assert(r.status === 413 && r.j.error?.includes("5,0 MB") && r.j.error.includes("legfeljebb 4 MB"), `D: 5 MB-os kép → ${r.status} ${r.j.error}`);
  const d1 = r.j.error;
  r = await api("/api/admin/upload-image?name=x.txt", { headers: { "content-type": "text/plain" }, body: "szöveg" });
  assert(r.status === 415 && /JPG, PNG vagy WebP/.test(r.j.error ?? ""), `D: nem kép → ${r.status} ${r.j.error}`);
  r = await api("/api/admin/upload-image?name=hibas.jpg", { headers: { "content-type": "image/jpeg" }, body: randomBytes(50_000) });
  assert(r.status === 422 && /nem sikerült feldolgozni/.test(r.j.error ?? ""), `D: hibás képbájtok → ${r.status} ${r.j.error}`);
  r = await api(`/api/admin/upload-chunk?uploadId=p2api${hex()}&index=0&total=1&size=1000&name=nem.pdf`, { headers: octet, body: randomBytes(1000) });
  assert(r.status === 415 && /Csak PDF/.test(r.j.error ?? ""), `D: nem-PDF első darab → ${r.status} ${r.j.error}`);
  r = await api(`/api/admin/upload-chunk?uploadId=p2api${hex()}&index=0&total=8&size=${25 * MB}&name=nagy.pdf`, { headers: octet, body: pdfBytes(1000) });
  assert(r.status === 413 && r.j.error?.includes("25,0 MB") && r.j.error.includes("legfeljebb 18 MB"), `D: 25 MB-ra bejelentett darab → ${r.status} ${r.j.error}`);
  const partial = `p2api${hex()}`, pSize = CHUNK + 1000;
  r = await api(`/api/admin/upload-chunk?uploadId=${partial}&index=0&total=2&size=${pSize}&name=fel.pdf`, { headers: octet, body: pdfBytes(CHUNK) });
  assert(r.status === 200 && r.j.ok, `D: az első darab → ${r.status} ${r.j.error}`);
  r = await api("/api/admin/upload-complete", { headers: { "content-type": "application/json" }, body: JSON.stringify({ uploadId: partial, total: 2, size: pSize, name: "fel.pdf", title: "P2 hiányos", date: dayOffset(0), published: false }) });
  assert(r.status === 400 && /2\. darab nem érkezett meg/.test(r.j.error ?? ""), `D: hiányos összefűzés → ${r.status} ${r.j.error}`);
  r = await api(`/api/admin/upload-chunk?uploadId=p2api${hex()}&index=0&total=1&size=1000&name=idegen.pdf`, { headers: { ...octet, origin: "https://idegen.example" }, body: pdfBytes(1000) });
  assert(r.status === 403, `D: idegen Origin → ${r.status} ${r.j.error}`);
  log(`  D: 413 („${d1.slice(0, 60)}…”), nem kép 415, hibás bájtok 422, nem-PDF darab 415, 25 MB-os bejelentés 413, hiányos összefűzés 400, idegen Origin 403`);

  /* ---------- E) félbemaradt darabok (fájl-driver) ---------- */
  log("E) Félbemaradt darabok takarítása (fájl-driver)");
  const chunkRoot = path.join(DATA, "files/chunks");
  const stale = `p2stale${hex()}`, fresh = `p2fresh${hex()}`;
  for (const id of [stale, fresh]) {
    r = await api(`/api/admin/upload-chunk?uploadId=${id}&index=0&total=1&size=64&name=felbe.pdf`, { headers: octet, body: pdfBytes(64) });
    assert(r.status === 200, `E: darab → ${r.status} ${r.j.error}`);
  }
  const mfFile = path.join(chunkRoot, stale, "manifest");
  const mf = JSON.parse(await fs.readFile(mfFile, "utf8"));
  await fs.writeFile(mfFile, JSON.stringify({ ...mf, startedAt: new Date(Date.now() - 25 * 3600e3).toISOString() }));
  assert(await exists(path.join(chunkRoot, stale, "0")) && await exists(path.join(chunkRoot, fresh, "0")), "E kontroll: a két félbemaradt feltöltés darabja nincs a tárban");
  r = await api("/api/admin/maintenance");
  assert(r.status === 200 && r.j.report?.chunkUploadsDeleted === 1, `E: karbantartás → ${r.status} ${JSON.stringify(r.j.report ?? r.j)}`);
  const leftE = (await fs.readdir(chunkRoot)).sort();
  assert(!(await exists(path.join(chunkRoot, stale))) && JSON.stringify(leftE) === JSON.stringify([fresh]), `E: a darabok könyvtára utána: ${leftE.join(", ")} (várt: csak ${fresh})`);
  log(`  E: a 25 órája kezdett feltöltés törölve, a friss megmaradt; a sikeres és az elutasított feltöltések darabjai már nincsenek (${leftE.length} maradt)`);

  /* ---------- F) helyi Supabase ---------- */
  log("F) helyi Supabase (második next start, szabad port)");
  const sb = await startSupabase();
  cleanups.push(() => sb.stop());
  const isolated = await tmpDir("p2-supabase-data-");
  cleanups.push(() => fs.rm(isolated, { recursive: true, force: true }));
  const srv = await startNext({ port: await freePort(), env: { ...sb.env, DATA_DIR: isolated }, label: "next (supabase)" });
  cleanups.push(() => srv.stop());
  const bapi = (p, init) => call(srv.base, p, init);
  const storageList = async (prefix) => {
    const res = await fetch(`${sb.url}/storage/v1/object/list/upload-chunks`, { method: "POST", headers: { ...sb.headers, "content-type": "application/json" }, body: JSON.stringify({ prefix, limit: 100 }) });
    return (await res.json()).filter((i) => i.id !== null);
  };
  const storageGet = async (bucket, key) => { const res = await fetch(`${sb.url}/storage/v1/object/${bucket}/${key}`, { headers: sb.headers }); return res.ok ? Buffer.from(await res.arrayBuffer()) : null; };

  const webp = await sharp(smallJpeg).resize(2400).webp({ quality: 85 }).toBuffer();
  r = await bapi("/api/admin/upload-image?alt=P2%20supabase&name=supabase.webp", { headers: { "content-type": "image/webp" }, body: webp });
  assert(r.status === 200 && r.j.image?.id, `F: képfeltöltés → ${r.status} ${r.j.error}`);
  const bImg = await fetch(`${srv.base}/files/${r.j.image.id}.webp`);
  const bImgBody = Buffer.from(await bImg.arrayBuffer());
  const stored = await storageGet("files", `${r.j.image.id}.webp`);
  assert(bImg.ok && Number(bImg.headers.get("content-length")) === bImgBody.length && stored?.length === bImgBody.length && sha(stored) === sha(bImgBody), `F: kép letöltése: ${bImg.status}, Content-Length ${bImg.headers.get("content-length")}, test ${bImgBody.length}, a Storage-ban ${stored?.length ?? "nincs"}`);

  const buf12 = await fs.readFile(pdf12.file);
  const bId = `p2supa${hex()}`;
  for (let i = 0; i < 4; i++) {
    r = await bapi(`/api/admin/upload-chunk?uploadId=${bId}&index=${i}&total=4&size=${buf12.length}&name=b12.pdf`, { headers: octet, body: buf12.subarray(i * CHUNK, Math.min(buf12.length, (i + 1) * CHUNK)) });
    assert(r.status === 200, `F: ${i + 1}. darab → ${r.status} ${r.j.error}`);
  }
  assert((await storageList(bId)).length === 5, "F kontroll: a 4 darab + leíró nincs az upload-chunks tárolóban");
  r = await bapi("/api/admin/upload-complete", { headers: { "content-type": "application/json" }, body: JSON.stringify({ uploadId: bId, total: 4, size: buf12.length, name: "b12.pdf", title: "P2 Supabase 12 MB", date: dayOffset(0), published: true }) });
  assert(r.status === 200 && r.j.report?.file, `F: összefűzés → ${r.status} ${r.j.error}`);
  const bPdf = await fetch(srv.base + r.j.report.file);
  const bPdfBody = Buffer.from(await bPdf.arrayBuffer());
  assert(bPdf.ok && sha(bPdfBody) === pdf12.sha && Number(bPdf.headers.get("content-length")) === pdf12.bytes && bPdf.headers.get("content-type") === "application/pdf", `F: PDF letöltése: ${bPdf.status}, ${bPdfBody.length} bájt, Content-Length ${bPdf.headers.get("content-length")}`);
  assert((await storageList(bId)).length === 0, "F: a sikeres összefűzés után a darabok az upload-chunks tárolóban maradtak");

  const bStale = `p2stale${hex()}`, bFresh = `p2fresh${hex()}`;
  for (const id of [bStale, bFresh]) {
    r = await bapi(`/api/admin/upload-chunk?uploadId=${id}&index=0&total=1&size=64&name=felbe.pdf`, { headers: octet, body: pdfBytes(64) });
    assert(r.status === 200, `F: félbemaradt darab → ${r.status} ${r.j.error}`);
  }
  const bMf = JSON.parse((await storageGet("upload-chunks", `${bStale}/manifest.json`)).toString("utf8"));
  const backdate = await fetch(`${sb.url}/storage/v1/object/upload-chunks/${bStale}/manifest.json`, { method: "POST", headers: { ...sb.headers, "content-type": "application/json", "x-upsert": "true" }, body: JSON.stringify({ ...bMf, startedAt: new Date(Date.now() - 25 * 3600e3).toISOString() }) });
  assert(backdate.ok, `F: a leíró visszadátumozása nem sikerült (${backdate.status})`);
  r = await bapi("/api/admin/maintenance");
  const bLeftStale = (await storageList(bStale)).length, bLeftFresh = (await storageList(bFresh)).length;
  assert(r.status === 200 && r.j.report?.chunkUploadsDeleted === 1 && bLeftStale === 0 && bLeftFresh === 2, `F: karbantartás → ${r.status} ${JSON.stringify(r.j.report ?? r.j)}, maradt: régi ${bLeftStale}, friss ${bLeftFresh}`);
  assert((await fs.readdir(isolated)).length === 0, "F: a Supabase-futás a fájl-driverre is írt");
  log(`  F: kép (${huMB(bImgBody.length)}, a Storage-ban bájtra ugyanaz) és 12 MB-os PDF 4 darabban → streamelt letöltés bájtra egyezik; darabok törölve; a 25 órás félbemaradt feltöltés törölve, a friss megmaradt`);

  passed = true;
} catch (e) {
  console.error("FAIL:", e instanceof CheckError ? e.message : (e?.stack ?? String(e)));
} finally {
  if (browser) await browser.close().catch(() => {});
  for (const c of cleanups.reverse()) await Promise.resolve().then(c).catch(() => {});
  dbReset();
}
if (!passed) process.exit(1);
console.log("PASS: p2-uploads");
