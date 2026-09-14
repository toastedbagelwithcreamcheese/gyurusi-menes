/**
 * G22 — Google-értékelések a Google szabályai szerint (helyi Places-mock). Használat: node scripts/checks/p5-reviews.mjs  (PORT, alap 3041)
 *
 *  A) build KULCCSAL, fájl-driver, GOOGLE_PLACE_ID megadva, alap napi keret:
 *     · a főoldal HTML-jében van váz, de nincs Google-adat; JSON-LD-ben nincs aggregateRating (hu/en/de)
 *     · betöltéskor és a blokktól 900 px-re görgetve nincs hívás; 600 px-en belül pontosan egy (a kulccsal, a kért nyelven)
 *     · DOM: „Google Maps” jelzés a szabály szerinti stílusban, szerzői avatar (lazy, no-referrer, ténylegesen betöltve),
 *       név + profil-link, relatív idő, link a googleMapsUri-ra; mobilon (390 px) vízszintes scroll-snap, nincs oldal-túlcsordulás;
 *       angolul a fordított véleménynél jelölés és az eredeti szöveg
 *     · /api/reviews: no-store; a mock 500-ára a blokk eltűnik
 *     · a tárban (data/) és a Next gyorsítótárában (.next/server, .next/cache) nincs véleményszöveg és darabszám —
 *       pozitív kontroll: ugyanez a keresés a mock valódi HTTP-válaszát tartalmazó fájlban megtalálja
 *     · a napi számláló a tárban van, és pontosan a hívások számát mutatja
 *  B) Netlify Blobs-szimulátor, GOOGLE_PLACE_ID NÉLKÜL, GOOGLE_REVIEWS_DAILY_CAP=1:
 *     · első betöltés: egy keresés + egy lekérés, a place ID a Blobs-tárban (a keresés ott megtalálja), vélemény nincs
 *     · második betöltés: 429, a blokk eltűnik, nincs új hívás
 *     · újraindítás nagyobb kerettel: csak lekérés, keresés nincs (a tárolt place ID-t használja)
 *  C) build KULCS NÉLKÜL: se váz a HTML-ben, se hívás végiggörgetve; /api/reviews 404 hívás nélkül; nincs aggregateRating
 * A végén a helyi DB visszaáll, a data/google törlődik, a .next kulcs nélküli build marad. Csak ha minden teljesült: PASS: p5-reviews
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";
import { BlobsServer } from "@netlify/blobs/server";
import { startMockPlaces, MOCK_PLACE_ID, MOCK_MARKER, MOCK_COUNT } from "../mock-places.mjs";
import { ROOT, BASE, CHROME, CheckFail, assert, cleanEnv, build, startNext, dbReset, scanDir, hasNeedle, api, waitFor, sleep } from "./_p5-harness.mjs";

const KEY = "p5-teszt-kulcs";
const GOOGLE_DIR = path.join(ROOT, "data/google");
/* A darabszám önálló számként (nem egy hex-hash részleteként — a Turbopack gyorsítótárában ilyen hamis találat volt). */
const NEEDLES = [MOCK_MARKER, new RegExp(`(?<![0-9a-fA-F])${MOCK_COUNT}(?![0-9a-fA-F])`), "Próba Szerző"];

let server, mock, browser, blobs, blobsDir, scratch;
let passed = false;

/** A főoldal JSON-LD-je: létezik, értelmezhető, és sehol nincs benne aggregateRating / Review. */
function checkJsonLd(html, where) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert(blocks.length > 0, `${where}: nincs JSON-LD`);
  for (const b of blocks) {
    let data; try { data = JSON.parse(b); } catch { assert(false, `${where}: érvénytelen JSON-LD`); }
    const s = JSON.stringify(data);
    assert(!/aggregateRating/i.test(s), `${where}: aggregateRating a JSON-LD-ben`);
    assert(!/"@type":"Review"/.test(s), `${where}: Review a JSON-LD-ben`);
  }
}

async function newPage(viewport = { width: 1280, height: 900 }, locale = "hu-HU") {
  const ctx = await browser.newContext({ viewport, locale });
  const page = await ctx.newPage();
  const apiStatuses = [];
  const errors = [];
  page.on("response", (r) => { if (r.url().includes("/api/reviews")) apiStatuses.push(r.status()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  return { ctx, page, apiStatuses, errors };
}

const reviewsTop = (page) => page.evaluate(() => { const el = document.querySelector("[data-reviews]"); return el ? el.getBoundingClientRect().top + window.scrollY : null; });

/** Lépésenként görget (szünetekkel, hogy a megfigyelők tüzeljenek) a megadott oldalpozícióig. */
async function scrollTo(page, target) {
  const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  const goal = Math.max(0, Math.min(target, max));
  let y = await page.evaluate(() => window.scrollY);
  while (Math.abs(goal - y) > 1) {
    y = y < goal ? Math.min(goal, y + 350) : Math.max(goal, y - 350);
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await sleep(110);
  }
  await sleep(600);
}

/** A blokk 600 px-en belülre görgetése, majd a betöltés várása. */
async function scrollNear(page) {
  const vh = await page.evaluate(() => window.innerHeight);
  /* P7: 900 px alatt a fölötte álló blokkok content-visibility: auto-val becsült (900 px-es) magasságot kapnak, és csak a nézet közelében
     renderelődnek a valódi méretükre — egy előre kiszámolt célra ugorva a blokk utána elcsúszik. Ezért, ahogy egy görgető látogató,
     újramérünk, amíg a blokk teteje a nézet alja alatt 400 ± 150 px-re nem kerül. */
  for (let i = 0; i < 12; i++) {
    const top = await reviewsTop(page);
    if (i === 0) assert(top !== null, "nincs [data-reviews] váz a lapon");
    else if (top === null) return; // a blokk a kérés után eltávolította magát (pl. elfogyott a napi keret)
    const scrollY = await page.evaluate(() => window.scrollY);
    const dist = top - scrollY - vh;
    if (Math.abs(dist - 400) <= 150) return;
    await scrollTo(page, top - vh - 400);
    await sleep(250);
  }
}

async function details() { return mock.calls().filter((c) => c.kind === "details"); }

try {
  scratch = await fs.mkdtemp(path.join(os.tmpdir(), "p5-reviews-"));
  mock = await startMockPlaces({ port: 0 });
  browser = await chromium.launch({ executablePath: CHROME, headless: true });

  /* ================= A) kulccsal, fájl-driver ================= */
  build(cleanEnv({ GOOGLE_PLACES_KEY: KEY }), "kulccsal");
  dbReset(); await fs.rm(GOOGLE_DIR, { recursive: true, force: true });
  server = await startNext(cleanEnv({ GOOGLE_PLACES_KEY: KEY, GOOGLE_PLACES_API_BASE: mock.url, GOOGLE_PLACE_ID: MOCK_PLACE_ID }));

  for (const p of ["/", "/en", "/de"]) {
    const h = await api(p);
    assert(h.status === 200, `${p} → ${h.status}`);
    assert(/data-reviews="idle"/.test(h.text), `${p}: kulccsal nincs váz a HTML-ben`);
    assert(!NEEDLES.some((n) => hasNeedle(h.text, n)), `${p}: Google-adat a szerver HTML-jében (ISR-be sütve)`);
    checkJsonLd(h.text, p);
  }
  assert(mock.calls().length === 0, `a HTML lekérése Places-hívást okozott (${mock.calls().length})`);

  const A = await newPage();
  await A.page.goto(BASE + "/", { waitUntil: "networkidle" });
  await sleep(1500);
  assert(mock.calls().length === 0 && A.apiStatuses.length === 0, `betöltéskor hívás történt (mock: ${mock.calls().length}, /api/reviews: ${A.apiStatuses.length})`);
  const vh = await A.page.evaluate(() => window.innerHeight);
  const top0 = await reviewsTop(A.page);
  assert(top0 - vh > 1500, `a blokk túl közel van a lap tetejéhez a próbához (${top0 - vh} px)`);
  await scrollTo(A.page, top0 - vh - 900);
  const topFar = await reviewsTop(A.page);
  const dist = await A.page.evaluate((t) => t - window.scrollY - window.innerHeight, topFar);
  assert(dist > 600, `a „messze” pozíció nincs 600 px-en kívül (${dist})`);
  await sleep(1200);
  assert(mock.calls().length === 0 && A.apiStatuses.length === 0, `${dist} px-re a blokktól már hívás történt`);
  await scrollNear(A.page);
  const loaded = await waitFor(() => A.page.locator('[data-reviews="loaded"]').count(), 10000);
  assert(loaded, `600 px-en belül sem töltődött be a blokk (/api/reviews: ${A.apiStatuses.join(",") || "nincs kérés"})\n${server.log().slice(-1500)}`);
  await sleep(1200);
  const callsA = mock.calls();
  assert(callsA.length === 1, `a blokkhoz görgetve nem pontosan egy Places-hívás történt (${callsA.length})`);
  assert(callsA[0].kind === "details" && callsA[0].id === MOCK_PLACE_ID && callsA[0].lang === "hu", `váratlan hívás: ${JSON.stringify(callsA[0])}`);
  assert(callsA[0].key === KEY, "a hívás nem a szerver kulcsával ment");
  assert(/reviews/.test(callsA[0].fieldMask) && /googleMapsUri/.test(callsA[0].fieldMask), `hiányos FieldMask: ${callsA[0].fieldMask}`);
  console.log(`A1) betöltéskor 0 hívás, ${dist} px-re 0, 600 px-en belül pontosan 1 (${callsA[0].kind}, ${callsA[0].lang})`);

  /* DOM a szabály szerint */
  await A.page.locator("[data-reviews]").scrollIntoViewIfNeeded();
  await sleep(900);
  const imgsOk = await waitFor(() => A.page.evaluate(() => { const i = [...document.querySelectorAll("img[data-review-avatar]")]; return i.length > 0 && i.every((x) => x.complete && x.naturalWidth > 0); }), 8000);
  const info = await A.page.evaluate(() => {
    const s = document.querySelector('[data-reviews="loaded"]');
    const attr = s.querySelector("[data-google-attribution]");
    const cs = getComputedStyle(attr);
    return {
      attrText: attr.textContent, fontSize: parseFloat(cs.fontSize), fontWeight: cs.fontWeight, fontStyle: cs.fontStyle, color: cs.color,
      whiteSpace: cs.whiteSpace, textTransform: cs.textTransform, translate: attr.getAttribute("translate"), attrHeight: attr.getBoundingClientRect().height, lineHeight: parseFloat(cs.lineHeight),
      attrVisible: attr.getBoundingClientRect().width > 0 && cs.visibility !== "hidden" && cs.display !== "none",
      imgs: [...s.querySelectorAll("img[data-review-avatar]")].map((i) => ({ src: i.getAttribute("src"), loading: i.getAttribute("loading"), rp: i.getAttribute("referrerpolicy"), nw: i.naturalWidth })),
      authors: [...s.querySelectorAll("[data-review-author]")].map((a) => ({ text: a.textContent, href: a.getAttribute("href") })),
      links: [...s.querySelectorAll("a")].map((a) => a.getAttribute("href")),
      text: s.innerText, times: [...s.querySelectorAll(".rev-who small")].map((x) => x.textContent),
    };
  });
  assert(info.attrText === "Google Maps" && info.attrVisible, `nincs látható „Google Maps” jelzés (${info.attrText})`);
  assert(info.fontSize >= 12 && info.fontSize <= 16, `a „Google Maps” betűmérete ${info.fontSize}px (12–16 kell)`);
  assert(info.fontWeight === "400" && info.fontStyle === "normal" && info.textTransform === "none", `a „Google Maps” stílusa módosított (${info.fontWeight}/${info.fontStyle}/${info.textTransform})`);
  assert(["rgb(94, 94, 94)", "rgb(31, 31, 31)", "rgb(255, 255, 255)"].includes(info.color), `a „Google Maps” színe nem a megengedett: ${info.color}`);
  assert(info.whiteSpace === "nowrap" && info.attrHeight < info.lineHeight * 1.6 + 30, `a „Google Maps” tördelhető (${info.whiteSpace}, ${info.attrHeight}px)`);
  assert(info.translate === "no", "a „Google Maps” jelzésen nincs translate=no");
  assert(info.imgs.length === 5, `nem 5 avatar (${info.imgs.length})`);
  assert(info.imgs.every((i) => i.loading === "lazy" && i.rp === "no-referrer" && i.src.startsWith(`${mock.url}/avatar/`)), `avatar-attribútumok: ${JSON.stringify(info.imgs[0])}`);
  assert(imgsOk && info.imgs.every((i) => i.nw > 0), "az avatarok nem töltődtek be");
  assert(info.authors.some((a) => a.text === "Próba Szerző 1" && a.href === "https://www.google.com/maps/contrib/p5-mock-1"), `nincs szerzőnév profil-linkkel: ${JSON.stringify(info.authors.slice(0, 2))}`);
  assert(info.links.includes(`https://maps.google.com/?cid=${MOCK_PLACE_ID}`), "nincs link a googleMapsUri-ra");
  assert(info.times.length === 5 && info.times.every((t) => t === "2 hónapja"), `nincs relatív idő: ${info.times.join("|")}`);
  assert(info.text.includes(`${MOCK_MARKER}-hu-1`) && info.text.includes("4,7") && info.text.includes(String(MOCK_COUNT)), "a mock értékelése/véleménye nem jelent meg");
  assert(A.errors.length === 0, `konzol-hiba: ${A.errors.join(" | ")}`);
  console.log(`A2) DOM OK: „Google Maps” ${info.fontSize}px ${info.color} nowrap; 5 avatar betöltve (lazy, no-referrer); szerző + profil-link; relatív idő; googleMapsUri-link`);
  await A.ctx.close();

  /* Mobil + angol (fordítás-jelölés) */
  const M = await newPage({ width: 390, height: 844 }, "en-GB");
  await M.page.goto(BASE + "/en", { waitUntil: "networkidle" });
  await sleep(800);
  await scrollNear(M.page);
  assert(await waitFor(() => M.page.locator('[data-reviews="loaded"]').count(), 10000), "mobilon/angolul nem töltődött be a blokk");
  await M.page.locator("[data-reviews]").scrollIntoViewIfNeeded(); await sleep(700);
  const mob = await M.page.evaluate(() => {
    const ul = document.querySelector("[data-reviews-list]"); const cs = getComputedStyle(ul);
    const before = ul.scrollLeft; ul.scrollLeft = 500; const after = ul.scrollLeft;
    const sec = document.querySelector("[data-reviews]");
    /* A blokk SAJÁT túlcsordulása (a lap egészét a térkép-blokk ismert, P4-re váró túlcsordulása is terheli — azt csak naplózzuk). */
    const secOverflow = Math.max(sec.scrollWidth - sec.clientWidth, Math.ceil(ul.getBoundingClientRect().right - window.innerWidth), 0);
    const wide = [...document.querySelectorAll("main *")].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && !el.closest("[data-reviews-list]"))
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}`).slice(0, 3);
    return { snap: cs.scrollSnapType, ox: cs.overflowX, sw: ul.scrollWidth, cw: ul.clientWidth, align: getComputedStyle(ul.children[0]).scrollSnapAlign, docSW: document.documentElement.scrollWidth, iw: window.innerWidth, secOverflow, wide, moved: after > before, text: ul.innerText };
  });
  assert(/x/.test(mob.snap) && /(auto|scroll)/.test(mob.ox) && /start/.test(mob.align), `mobilon nincs vízszintes scroll-snap (${mob.snap}, ${mob.ox}, ${mob.align})`);
  assert(mob.sw > mob.cw && mob.moved, `mobilon a kártyák nem lapozhatók oldalra (${mob.sw}/${mob.cw})`);
  assert(mob.secOverflow === 0, `mobilon az értékelés-blokk vízszintesen túlcsordul (${mob.secOverflow} px)`);
  if (mob.docSW > mob.iw) console.log(`   (megjegyzés: a lap egésze ${mob.docSW}/${mob.iw} px — nem az értékelés-blokk, hanem: ${mob.wide.join(", ")}; lásd G25/B14)`);
  assert(mob.text.includes(`${MOCK_MARKER}-en-1`) && mob.text.includes("Translated by Google"), "angolul nincs angol vélemény vagy fordítás-jelölés");
  await M.page.evaluate(() => document.querySelector(".rev-tr-btn").click());
  assert(await waitFor(() => M.page.evaluate((m) => document.querySelector("[data-reviews-list]").innerText.includes(`${m}-orig-2`), MOCK_MARKER), 3000), "az „eredeti szöveg” gomb nem mutatja az eredetit");
  const lastCall = mock.calls().at(-1);
  assert(mock.calls().length === 2 && lastCall.lang === "en", `mobil/angol betöltés hívásai: ${mock.calls().length}, ${lastCall?.lang}`);
  console.log(`A3) mobil 390 px: scroll-snap ${mob.snap}, ${mob.sw}/${mob.cw} px lapozható, oldal ${mob.docSW}/${mob.iw}; angol fordítás-jelölés + eredeti szöveg OK`);
  await M.ctx.close();

  /* API-fejlécek, hibaág */
  const apiDe = await api("/api/reviews?lang=de");
  assert(apiDe.status === 200 && /no-store/.test(apiDe.headers.get("cache-control") ?? ""), `/api/reviews: ${apiDe.status}, Cache-Control: ${apiDe.headers.get("cache-control")}`);
  assert(apiDe.json?.reviews?.[0]?.text?.includes(`${MOCK_MARKER}-de-1`), "a német API-válasz nem német");
  mock.setStatus(500);
  const E = await newPage();
  await E.page.goto(BASE + "/", { waitUntil: "networkidle" });
  await scrollNear(E.page);
  assert(await waitFor(() => E.apiStatuses.length > 0, 10000), "hibaágban nem ment kérés");
  assert(await waitFor(async () => (await E.page.locator("[data-reviews]").count()) === 0, 5000), `a Google hibájára a blokk nem tűnt el (/api/reviews: ${E.apiStatuses.join(",")})`);
  mock.setStatus(200);
  await E.ctx.close();
  assert((await details()).length === 4, `váratlan hívásszám a hibaág után: ${(await details()).length}`);
  console.log(`A4) /api/reviews no-store; a Google 500-ára /api/reviews ${E.apiStatuses[0]} és a blokk eltűnt`);

  /* Tárolás: se a data/-ban, se a Next gyorsítótárában */
  const counter = JSON.parse(await fs.readFile(path.join(GOOGLE_DIR, "daily-calls.json"), "utf8"));
  assert(counter.count === 4, `a napi számláló nem a hívások számát mutatja (${JSON.stringify(counter)})`);
  const googleFiles = await fs.readdir(GOOGLE_DIR);
  assert(googleFiles.every((f) => f === "daily-calls.json"), `váratlan fájl a data/google-ban: ${googleFiles.join(", ")}`);
  const hitsA = [...await scanDir(path.join(ROOT, "data"), NEEDLES), ...await scanDir(path.join(ROOT, ".next/server"), NEEDLES), ...await scanDir(path.join(ROOT, ".next/cache"), NEEDLES)];
  assert(hitsA.length === 0, `Google-tartalom a tárban: ${JSON.stringify(hitsA.slice(0, 5))}`);
  /* Pozitív kontroll: ugyanaz a keresés a mock valódi HTTP-válaszában megtalálja ugyanezeket. */
  const raw = await (await fetch(`${mock.url}/v1/places/${MOCK_PLACE_ID}?languageCode=hu`, { headers: { "X-Goog-Api-Key": KEY } })).text();
  await fs.writeFile(path.join(scratch, "mock-valasz.json"), raw);
  const ctrl = await scanDir(scratch, NEEDLES);
  assert(NEEDLES.every((n) => ctrl.some((h) => h.needle === String(n))), `a pozitív kontroll nem találta meg a mock válaszában: ${JSON.stringify(ctrl)}`);
  console.log(`A5) tár: data/google csak számláló (${counter.day}: ${counter.count}); vélemény/darabszám sehol (data/, .next/server, .next/cache); kontroll a mock-válaszban: ${ctrl.length} találat`);
  await server.stop(); server = null;

  /* ================= B) Blobs-szimulátor, place ID nélkül, keret = 1 ================= */
  dbReset(); await fs.rm(GOOGLE_DIR, { recursive: true, force: true }); mock.clear();
  blobsDir = await fs.mkdtemp(path.join(os.tmpdir(), "p5-blobs-"));
  blobs = new BlobsServer({ directory: blobsDir, token: "p5-token", port: 0 });
  const { port: bport } = await blobs.start();
  const ctxB64 = Buffer.from(JSON.stringify({ edgeURL: `http://127.0.0.1:${bport}`, uncachedEdgeURL: `http://127.0.0.1:${bport}`, siteID: "p5-site", token: "p5-token" })).toString("base64");
  const envB = (cap) => cleanEnv({ GOOGLE_PLACES_KEY: KEY, GOOGLE_PLACES_API_BASE: mock.url, GOOGLE_REVIEWS_DAILY_CAP: String(cap), NETLIFY_BLOBS_CONTEXT: ctxB64 });
  server = await startNext(envB(1));

  const B1 = await newPage();
  await B1.page.goto(BASE + "/", { waitUntil: "networkidle" });
  await scrollNear(B1.page);
  assert(await waitFor(() => B1.page.locator('[data-reviews="loaded"]').count(), 10000), `Blobs-driverrel nem töltődött be (/api/reviews: ${B1.apiStatuses.join(",")})\n${server.log().slice(-1500)}`);
  await sleep(800);
  const kinds1 = mock.calls().map((c) => c.kind).join(",");
  assert(kinds1 === "search,details", `első betöltés hívásai: ${kinds1} (search,details kell)`);
  await B1.ctx.close();
  const idHits = await scanDir(blobsDir, [MOCK_PLACE_ID]);
  assert(idHits.length > 0, "a place ID nem került a Blobs-tárba (a keresés nem találja)");
  assert(!(await fs.stat(GOOGLE_DIR).catch(() => null)), "Blobs mellett is a data/google-ba írt");

  const B2 = await newPage();
  await B2.page.goto(BASE + "/", { waitUntil: "networkidle" });
  await scrollNear(B2.page);
  assert(await waitFor(() => B2.apiStatuses.length > 0, 10000), "a második betöltésnél nem ment kérés");
  assert(B2.apiStatuses[0] === 429, `a keret felett nem 429 jött: ${B2.apiStatuses[0]}`);
  assert(await waitFor(async () => (await B2.page.locator("[data-reviews]").count()) === 0, 5000), "429 után a blokk látszik");
  assert(mock.calls().length === 2, `a keret felett is hívás történt (${mock.calls().length})`);
  await B2.ctx.close();
  console.log(`B1) Blobs: első betöltés ${kinds1}, place ID a Blobs-tárban (${path.relative(blobsDir, path.resolve(ROOT, idHits[0].file))}); keret=1 mellett a második 429, a blokk eltűnt, nincs új hívás`);

  await server.stop(); server = null;
  server = await startNext(envB(5));
  const B3 = await newPage();
  await B3.page.goto(BASE + "/", { waitUntil: "networkidle" });
  await scrollNear(B3.page);
  assert(await waitFor(() => B3.page.locator('[data-reviews="loaded"]').count(), 10000), "újraindítás után nem töltődött be");
  await sleep(800);
  const kinds3 = mock.calls().slice(2).map((c) => c.kind).join(",");
  assert(kinds3 === "details", `újraindítás után a hívások: ${kinds3} (csak details kell — a tárolt place ID-vel)`);
  await B3.ctx.close();
  const hitsB = [...await scanDir(blobsDir, NEEDLES), ...await scanDir(path.join(ROOT, "data"), NEEDLES)];
  assert(hitsB.length === 0, `Google-tartalom a Blobs-tárban vagy a data/-ban: ${JSON.stringify(hitsB.slice(0, 5))}`);
  const blobFiles = [];
  const walk = async (d) => { for (const e of await fs.readdir(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) await walk(p); else blobFiles.push(path.relative(blobsDir, p)); } };
  await walk(blobsDir);
  const counterFile = blobFiles.find((f) => /google/.test(f) && /daily-calls$/.test(f));
  assert(counterFile, `nincs napi számláló a Blobs „google” tárában (${blobFiles.join(", ")})`);
  const bc = JSON.parse(await fs.readFile(path.join(blobsDir, counterFile), "utf8"));
  assert(bc.count === 2, `a Blobs-számláló nem 2: ${JSON.stringify(bc)}`);
  console.log(`B2) újraindítás után csak details (tárolt place ID); Blobs „google” tár: ${blobFiles.filter((f) => /google/.test(f)).length} fájl, számláló ${bc.count} (${counterFile}); vélemény és darabszám sehol a Blobs-tárban és a data/-ban`);
  await server.stop(); server = null;
  await blobs.stop(); blobs = null;

  /* ================= C) kulcs nélkül ================= */
  build(cleanEnv(), "kulcs nélkül");
  dbReset(); await fs.rm(GOOGLE_DIR, { recursive: true, force: true }); mock.clear();
  server = await startNext(cleanEnv({ GOOGLE_PLACES_API_BASE: mock.url, GOOGLE_PLACE_ID: MOCK_PLACE_ID }));
  for (const p of ["/", "/en", "/de"]) {
    const h = await api(p);
    assert(h.status === 200, `${p} → ${h.status}`);
    assert(!/data-reviews/.test(h.text) && !/id="velemenyek"/.test(h.text), `${p}: kulcs nélkül is van értékelés-blokk a HTML-ben`);
    checkJsonLd(h.text, `${p} (kulcs nélkül)`);
  }
  const C = await newPage();
  await C.page.goto(BASE + "/", { waitUntil: "networkidle" });
  await scrollTo(C.page, 1e6);
  await sleep(1500);
  assert((await C.page.locator("[data-reviews]").count()) === 0, "kulcs nélkül a böngészőben megjelent a blokk");
  assert(C.apiStatuses.length === 0 && mock.calls().length === 0, `kulcs nélkül hívás történt (/api/reviews: ${C.apiStatuses.length}, mock: ${mock.calls().length})`);
  await C.ctx.close();
  const apiNoKey = await api("/api/reviews?lang=hu");
  assert(apiNoKey.status === 404 && /no-store/.test(apiNoKey.headers.get("cache-control") ?? ""), `kulcs nélkül /api/reviews → ${apiNoKey.status}`);
  assert(mock.calls().length === 0, "kulcs nélkül az /api/reviews Places-hívást indított");
  console.log("C) kulcs nélkül: nincs váz a HTML-ben, végiggörgetve 0 hívás, /api/reviews 404 hívás nélkül, nincs aggregateRating");
  passed = true;
} catch (e) {
  console.error("FAIL:", e instanceof CheckFail ? e.message : e?.stack ?? e);
  if (server && !(e instanceof CheckFail)) console.error(server.log().slice(-2000));
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  await server?.stop();
  await blobs?.stop().catch(() => {});
  await mock?.close();
  if (blobsDir) await fs.rm(blobsDir, { recursive: true, force: true });
  if (scratch) await fs.rm(scratch, { recursive: true, force: true });
  await fs.rm(GOOGLE_DIR, { recursive: true, force: true });
  try { dbReset(); } catch (e) { console.error("FAIL: db:reset a végén:", e.message); passed = false; process.exitCode = 1; }
}
if (passed) console.log("PASS: p5-reviews");
else if (!process.exitCode) { console.error("FAIL: a próba nem ért végig"); process.exitCode = 1; }
