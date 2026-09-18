/**
 * G31 — aloldali kiegészítők, mind adminból szerkeszthetően. Használat: node scripts/with-server.mjs node scripts/checks/p8-extras.mjs  (előtte: npm run build)
 * A with-server fájl-driverrel, nyitott bemutató-adminnal indítja a szervert; az elején és a végén npm run db:reset.
 *  0) kontroll: a magban nincs GYIK, link és aloldalhoz rendelt esemény → a /huculosveny lapon egyik blokk sincs
 *  A) aloldal-szerkesztő (Huculösvény): hibás link (ftp://) → teendőt mondó hiba; félig kitöltött kérdés → hiba; utána érvényes link
 *     (https, felirat hu/en/de) + 3 kérdés, ebből a 3. üres (kihagyandó), a 2. feljebb mozgatva → mentve
 *  B) esemény-szerkesztő: egy közelgő, közzétett esemény a Huculösvény és a Táborok laphoz rendelve; kontrollként egy korábbi és egy
 *     rejtett esemény is a Huculösvényhez → ezek nem jelenhetnek meg
 *  C) nyilvános lap hu/en/de: link-gomb (cím, új lap, rel=noopener, a nyelv felirata), a GYIK a mentett sorrendben (az angolban a
 *     magyarra esik vissza, ahol nincs fordítás), a válasz a HTML-ben; JSON-LD FAQPage 2 kérdéssel; a kapcsolódó események között csak
 *     a közelgő, közzétett esemény; /taborok-on is ott van, a /turak-on nincs (kontroll); az admin aloldal-szerkesztője listázza
 *  D) a link címének törlése és minden kérdés eltávolítása → a blokkok eltűnnek a nyilvános lapról
 * Csak ha minden állítás teljesült: PASS: p8-extras
 */
import { chromium } from "playwright-core";
import { CheckError, assert, chromeExe, dayOffset, dbReset } from "./_p1-harness.mjs";

const BASE = (process.env.BASE_URL ?? "http://localhost:3012").replace(/\/$/, "");
const RUN = Date.now().toString(36);
const log = (...a) => console.log(...a);
const LINK = "https://huculosveny.example.hu/p8";
const Q = [
  { q: { hu: `P8 első kérdés ${RUN}?`, en: `P8 first question ${RUN}?`, de: `P8 erste Frage ${RUN}?` }, a: { hu: `P8 első válasz ${RUN}.`, en: `P8 first answer ${RUN}.`, de: `P8 erste Antwort ${RUN}.` } },
  { q: { hu: `P8 második kérdés ${RUN}?`, en: "", de: "" }, a: { hu: `P8 második válasz ${RUN}.`, en: "", de: "" } },
];

let browser, page;
const go = async (p) => { const r = await page.goto(BASE + p, { waitUntil: "networkidle", timeout: 60_000 }); if (!r || r.status() >= 400) throw new CheckError(`${p} → HTTP ${r?.status()}`); return r; };
const openTranslations = () => page.locator("details[data-translations]").evaluateAll((ds) => ds.forEach((d) => { d.open = true; }));
const flash = async () => (await page.locator("[data-flash]").first().innerText().catch(() => "")).trim();
const submitAndWait = async () => { await Promise.all([page.waitForURL(/[?&](ok|hiba)=/, { timeout: 60_000 }), page.click('form button.btn-primary:has-text("Mentés")')]); return new URL(page.url()).searchParams; };
const html = async (p) => { const r = await fetch(BASE + p, { headers: { "accept-language": "hu" } }); return { status: r.status, text: await r.text() }; };
const ld = (text) => [...text.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

async function fillFaqRow(i, item) {
  await page.fill(`#faq\\.${i}\\.q\\.hu`, item.q.hu); await page.fill(`#faq\\.${i}\\.a\\.hu`, item.a.hu);
  await openTranslations();
  for (const l of ["en", "de"]) { await page.fill(`#faq\\.${i}\\.q\\.${l}`, item.q[l]); await page.fill(`#faq\\.${i}\\.a\\.${l}`, item.a[l]); }
}

async function newEvent(title, date, pages, published) {
  await go("/admin/esemenyek/uj");
  await page.fill("#title\\.hu", title); await page.fill("#date", date);
  await page.fill("#summary\\.hu", "P8 teszt — a próba végén törlődik.");
  for (const k of pages) await page.check(`input[name="pages"][value="${k}"]`);
  if (published) await page.check('input[name="published"]'); else await page.uncheck('input[name="published"]');
  await page.uncheck('input[name="featured"]');
  const q = await submitAndWait();
  assert(q.get("ok"), `az esemény mentése nem sikerült: ${q.get("hiba")}`);
  const id = await page.locator("[data-event-row]", { hasText: title }).first().getAttribute("data-event-row");
  assert(id, `az esemény nem jelent meg a listában: ${title}`);
  await go(`/admin/esemenyek/${id}`);
  for (const k of ["huculosveny", "turak", "oktatas", "taborok", "egyesulet"]) {
    const on = await page.isChecked(`input[name="pages"][value="${k}"]`);
    assert(on === pages.includes(k), `az esemény aloldal-jelölése nem maradt meg (${k}: ${on})`);
  }
  return id;
}

let passed = false;
try {
  dbReset();
  browser = await chromium.launch({ executablePath: chromeExe, headless: true });
  page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "hu-HU" })).newPage();

  /* 0) kontroll */
  const h0 = await html("/huculosveny");
  assert(h0.status === 200 && !/data-page-events|data-page-faq|data-page-link/.test(h0.text), "0: a magban is megjelenik valamelyik új blokk");
  log("0) kontroll: a magban nincs GYIK, link és kapcsolódó esemény — egyik blokk sem látszik");

  /* A) aloldal-szerkesztő */
  await go("/admin/oldalak/huculosveny");
  await page.fill("#link\\.url", "ftp://huculosveny.example.hu");
  await page.fill("#link\\.label\\.hu", "P8 link");
  let q = await submitAndWait();
  assert(q.get("hiba")?.includes("nem érvényes") && q.get("hiba")?.includes("https://"), `A1: az ftp:// cím nem adott teendőt mondó hibát: ${q.get("hiba") ?? q.get("ok")}`);
  const flashA1 = await flash();

  await go("/admin/oldalak/huculosveny");
  await page.click("[data-faq-add]");
  await page.fill("#faq\\.0\\.q\\.hu", "Csak kérdés, válasz nélkül?");
  q = await submitAndWait();
  assert(q.get("hiba")?.includes("1. kérdésnél"), `A2: a félig kitöltött kérdés nem adott hibát: ${q.get("hiba") ?? q.get("ok")}`);

  await go("/admin/oldalak/huculosveny");
  assert((await page.locator("[data-faq-row]").count()) === 0, "A: a hibás mentés után mégis van mentett kérdés");
  await page.fill("#link\\.url", LINK);
  await page.fill("#link\\.label\\.hu", `Tovább a Huculösvény oldalára ${RUN}`);
  await openTranslations();
  await page.fill("#link\\.label\\.en", `To the Hucul Trail site ${RUN}`);
  await page.fill("#link\\.label\\.de", `Zur Seite des Huzulenpfads ${RUN}`);
  for (let i = 0; i < 3; i++) await page.click("[data-faq-add]");
  /* A sorrend: először a 2. (Q[1]) kerül az 1. helyre, majd a 2. helyre a Q[0]; a 3. sor üresen marad. */
  await fillFaqRow(0, Q[0]); await fillFaqRow(1, Q[1]);
  await page.locator('[data-faq-row="1"] button[aria-label="2. kérdés feljebb"]').click();
  assert((await page.inputValue("#faq\\.0\\.q\\.hu")) === Q[1].q.hu, "A3: az átrendezés után nem a 2. kérdés áll elöl");
  q = await submitAndWait();
  assert(q.get("ok"), `A3: a mentés nem sikerült: ${q.get("hiba")}`);
  await go("/admin/oldalak/huculosveny");
  assert((await page.locator("[data-faq-row]").count()) === 2, `A3: mentés után ${await page.locator("[data-faq-row]").count()} kérdés (2 várt — az üres sor kimarad)`);
  assert((await page.inputValue("#faq\\.0\\.q\\.hu")) === Q[1].q.hu && (await page.inputValue("#link\\.url")) === LINK, "A3: a mentett sorrend vagy a link nem maradt meg a szerkesztőben");
  log(`A) aloldal-szerkesztő: ftp:// → „${flashA1.slice(0, 70)}…”; félig kitöltött kérdés → hiba; link + 2 kérdés (átrendezve, az üres sor kihagyva) mentve`);

  /* B) események */
  const TITLE = `P8 közelgő esemény ${RUN}`, PAST = `P8 korábbi esemény ${RUN}`, HIDDEN = `P8 rejtett esemény ${RUN}`;
  const idUp = await newEvent(TITLE, dayOffset(40), ["huculosveny", "taborok"], true);
  const idPast = await newEvent(PAST, dayOffset(-40), ["huculosveny"], true);
  const idHidden = await newEvent(HIDDEN, dayOffset(50), ["huculosveny"], false);
  log(`B) 3 esemény: közelgő (Huculösvény + Táborok), korábbi és rejtett (Huculösvény) — a jelölés a szerkesztőben megmarad`);

  /* C) nyilvános lapok */
  const hu = await html("/huculosveny");
  const linkTag = hu.text.match(/<p class="page-link"[^>]*>\s*<a ([^>]*)>/)?.[1] ?? "";
  assert(linkTag.includes(`href="${LINK}"`) && linkTag.includes('target="_blank"') && linkTag.includes('rel="noopener"'), `C: a link-gomb hibás: ${linkTag}`);
  assert(hu.text.includes(`Tovább a Huculösvény oldalára ${RUN}`), "C: a magyar link-felirat hiányzik");
  const i1 = hu.text.indexOf(Q[1].q.hu), i0 = hu.text.indexOf(Q[0].q.hu);
  assert(i1 > 0 && i0 > i1 && hu.text.includes(Q[0].a.hu) && hu.text.includes(Q[1].a.hu), "C: a GYIK nem a mentett sorrendben, vagy hiányzik a válasz a HTML-ből");
  const faqLd = ld(hu.text).flatMap((g) => g["@graph"] ?? []).find((n) => n["@type"] === "FAQPage");
  assert(faqLd?.mainEntity?.length === 2 && faqLd.mainEntity[0].name === Q[1].q.hu && faqLd.mainEntity[1].acceptedAnswer.text === Q[0].a.hu, `C: a JSON-LD FAQPage hibás: ${JSON.stringify(faqLd).slice(0, 200)}`);
  const evBlock = hu.text.slice(hu.text.indexOf("data-page-events"), hu.text.indexOf("data-page-faq"));
  assert(evBlock.includes(TITLE) && !evBlock.includes(PAST) && !evBlock.includes(HIDDEN), "C: a kapcsolódó események között nem csak a közelgő, közzétett esemény van");
  const en = await html("/en/huculosveny");
  assert(en.text.includes(`To the Hucul Trail site ${RUN}`) && en.text.includes(Q[0].q.en) && en.text.includes(Q[1].q.hu), "C: angolul a link felirata vagy a GYIK (fordítás / magyar visszaesés) hibás");
  const de = await html("/de/huculosveny");
  assert(de.text.includes(`Zur Seite des Huzulenpfads ${RUN}`) && de.text.includes(Q[0].a.de), "C: németül a link felirata vagy a válasz hiányzik");
  const tab = await html("/taborok"), tur = await html("/turak");
  assert(tab.text.includes(TITLE) && /data-page-events/.test(tab.text), "C: a Táborok lapon nincs ott a hozzárendelt esemény");
  assert(!/data-page-events|data-page-faq|data-page-link/.test(tur.text), "C kontroll: a Túrák lapon is megjelent valamelyik blokk");
  await page.setViewportSize({ width: 390, height: 844 });
  await go("/huculosveny");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(overflow <= 0, `C: mobilon ${overflow} px vízszintes túlcsordulás`);
  await page.locator("[data-faq-item] summary").first().click();
  assert(await page.locator("[data-faq-item]").first().evaluate((d) => d.open), "C: a GYIK sora kattintásra nem nyílik");
  await page.setViewportSize({ width: 1280, height: 900 });
  await go("/admin/oldalak/huculosveny");
  const info = await page.locator("[data-page-events-info]").innerText();
  assert(info.includes(TITLE) && !info.includes(PAST) && !info.includes(HIDDEN), "C: az admin aloldal-szerkesztője nem a hozzárendelt közelgő eseményt listázza");
  log("C) nyilvános lap: link-gomb (új lap, noopener) 3 nyelven, GYIK a mentett sorrendben (angolul magyar visszaeséssel), FAQPage JSON-LD 2 kérdéssel, csak a közelgő közzétett esemény; Táborok igen, Túrák nem; mobilon nincs túlcsordulás; az admin listázza");

  /* D) kiürítés */
  await page.fill("#link\\.url", "");
  for (let n = await page.locator("[data-faq-remove]").count(); n > 0; n--) await page.locator("[data-faq-remove]").first().click();
  q = await submitAndWait();
  assert(q.get("ok"), `D: a kiürítés mentése nem sikerült: ${q.get("hiba")}`);
  for (const id of [idUp, idPast, idHidden]) {
    await go(`/admin/esemenyek/${id}`);
    await page.locator('[data-delete="event"] [data-confirm-start]').click();
    const yes = page.locator('[data-delete="event"] [data-confirm-yes]'); await yes.waitFor(); await page.waitForTimeout(450);
    await Promise.all([page.waitForURL(/\/admin\/esemenyek(\?|$)/, { timeout: 60_000 }), yes.click()]);
  }
  const h9 = await html("/huculosveny");
  assert(!/data-page-events|data-page-faq|data-page-link/.test(h9.text) && !h9.text.includes(RUN), "D: a kiürítés után is látszik valamelyik blokk");
  log("D) a link törlése, a kérdések eltávolítása és az események törlése után egyik blokk sem látszik");
  passed = true;
} catch (e) {
  console.error(e instanceof CheckError ? `FAIL: ${e.message}` : `FAIL: váratlan hiba: ${e?.stack ?? e}`);
} finally {
  await browser?.close().catch(() => {});
  dbReset();
}
if (passed) console.log("PASS: p8-extras");
process.exit(passed ? 0 : 1);
