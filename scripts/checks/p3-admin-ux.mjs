/**
 * G20 — admin-használhatóság. Használat: node scripts/with-server.mjs node scripts/checks/p3-admin-ux.mjs   (előtte: npm run build)
 * A with-server fájl-driverrel, jelszó nélkül indítja a szervert (BASE_URL, alap a 3012-es port); a teszt a helyi data/
 * könyvtárat írja-olvassa, az elején és a végén npm run db:reset.
 *  A) Kétlépcsős törlés mind a hat helyen (jelentkezés, üzenet, kép, beszámoló, útvonal, esemény): az első kattintás után
 *     „Biztosan törlöd?” + „Igen, törlöm” / „Mégse”, és a rekord még megvan; dupla kattintásra sem töröl; „Mégse” → vissza;
 *     magától visszaáll ~6 s után; a megerősítés után törölve (a tárban is). Natív confirm() egyszer sem nyílik.
 *  B) Fordítások: a lenyitó alapból zárva (az angol mező nem látszik); a címke „Hiányzik: EN” / „Hiányzik: EN, DE” / „Kész” /
 *     „Nincs szöveg”, gépelésre élőben vált; mentés után a jelvény eltűnik. Az eseménylistán jelvény csak a hiányos, közzétett
 *     eseménynél (kontroll: teljes fordítású és rejtett hiányos esemény → nincs jelvény).
 *  C) Főoldal és kapcsolat: 4 ugró-fül a 4 részre, részenként saját mentés gomb; két részt módosítva csak az egyiket mentve a
 *     tárban csak az a rész változik (a többi kulcs bájtra azonos), a visszajelzés a Flash-sávban és a gomb mellett is.
 *  D) Túraútvonal: új útvonal (név és leírás három nyelven, térképkép, két meglévő fotó + egy frissen feltöltött a P2 feltöltőjével,
 *     4-es korlát) → közzétéve a /turak lapon kártya (térkép + 3 fotó, 4 nagyítható kép, /en és /de a saját nevével), az
 *     illusztráció eltűnik; egy fotóra kattintva a nagyító az adott képpel nyílik; második útvonal + „↑” → a lap sorrendje követi;
 *     a közzététel visszavonása után az illusztráció jön vissza, a jelmagyarázat mindhárom nyelven csak a körök neveit adja
 *     (kontroll: a korábbi jelmagyarázat szövegén a tiltott-szó keresés talál).
 *  E) Állapotpanel az admin kezdőlapján (e-mail, Google, admin-jelszó, a változók nevével); kulcs nélkül a „Próba e-mail
 *     küldése” érthető hibát ad (RESEND_API_KEY + teendő). Kontroll egy második szerveren (szabad port, kamu kulcsokkal, helyi
 *     Resend-mockkal): „Beállítva”, a kulcsok értéke nincs a HTML-ben, a próba e-mail a mockhoz megy (címzett CONTACT_TO nélkül
 *     info@gyurusimenes.hu, a kulcs a Bearer fejlécben), és a Flash-sáv sikert mond.
 * Csak ha minden állítás teljesült: PASS: p3-admin-ux
 */
import { chromium } from "playwright-core";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import sharp from "sharp";
import { CheckError, ROOT, assert, chromeExe, dayOffset, dbReset, freePort, readSeed, sleep, startNext, tmpDir } from "./_p1-harness.mjs";
import { revalidateSite } from "../revalidate.mjs";

const BASE = (process.env.BASE_URL ?? "http://localhost:3012").replace(/\/$/, "");
const DATA = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");
const PHOTOS = JSON.parse(await fs.readFile(path.join(ROOT, "src/content/photos.json"), "utf8"));
const TAG = Date.now().toString(36);
const log = (...a) => console.log(...a);
const cleanups = [];
let browser = null, srv2 = null, passed = false;

const readSite = async () => JSON.parse(await fs.readFile(path.join(DATA, "site.json"), "utf8"));
const writeSite = (s) => fs.writeFile(path.join(DATA, "site.json"), JSON.stringify(s, null, 2));
const exists = (p) => fs.stat(path.join(DATA, p)).then(() => true, () => false);
/** Kulcssorrendtől független JSON — a „bájtra azonos” összevetéshez. */
const canon = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((q) => [q, x[q]])) : x));
async function until(fn, ms = 15_000, step = 150) {
  const t0 = Date.now();
  for (;;) { if (await fn()) return true; if (Date.now() - t0 > ms) return false; await sleep(step); }
}
const L = (hu, en, de) => ({ hu, en, de });
const getText = async (url) => { const r = await fetch(url, { redirect: "manual" }); assert(r.status === 200, `${url} → ${r.status}`); return r.text(); };

async function seedFixtures() {
  const site = await readSite();
  const ev = (id, extra = {}) => ({
    id, date: dayOffset(25), location: "Gyűrűsi Ménes, Gyűrűs", image: "osveny-ugras-allo", published: true, featured: false, registration: false,
    title: L(`P3 ${id}`, `P3 ${id} EN`, `P3 ${id} DE`), summary: L("P3 teszt.", "P3 test.", "P3-Test."), ...extra,
  });
  site.events = [
    ev("p3-del-esemeny", { registration: true }),
    ev("p3-tr-hianyos", { title: L("P3 hiányos", "", "P3 unvollständig"), summary: L("P3 hiányos leírás.", "", "") }),
    ev("p3-tr-csak-de", { title: L("P3 csak a német hiányzik", "P3 only German missing", ""), summary: L("P3.", "P3.", "P3.") }),
    ev("p3-tr-kesz"),
    ev("p3-tr-rejtett", { published: false, title: L("P3 rejtett hiányos", "", ""), summary: L("P3.", "", "") }),
    ...site.events,
  ];
  await fs.mkdir(path.join(DATA, "files"), { recursive: true });
  const webp = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 120, g: 90, b: 60 } } }).webp({ quality: 80 }).toBuffer();
  await fs.writeFile(path.join(DATA, "files/u-p3kep01.webp"), webp);
  site.uploads = [{ id: "u-p3kep01", src: "/files/u-p3kep01.webp", width: 800, height: 600, alt: "P3 törlendő kép", uploadedAt: new Date().toISOString() }, ...site.uploads];
  const pdf = Buffer.from("%PDF-1.4\n%P3 teszt\n%%EOF\n");
  await fs.writeFile(path.join(DATA, "files/r-p3besz01.pdf"), pdf);
  site.reports = [{ id: "p3-rep-1", title: "P3 törlendő beszámoló", year: 2026, date: dayOffset(-3), file: "r-p3besz01.pdf", size: pdf.length, published: true }, ...site.reports];
  site.routes = [{ id: "p3-del-utvonal", name: L("P3 törlendő útvonal", "P3 route to delete", "P3 zu löschende Route"), summary: L("", "", ""), photos: [], published: false, order: 0 }];
  await writeSite(site); await revalidateSite(BASE);
  const rec = async (kind, r) => { await fs.mkdir(path.join(DATA, kind), { recursive: true }); await fs.writeFile(path.join(DATA, kind, `${r.id}.json`), JSON.stringify(r, null, 2)); };
  await rec("registrations", { id: "p3-reg-1", eventId: "p3-del-esemeny", name: "P3 Jelentkező", phone: "+36 30 000 0003", count: 2, receivedAt: new Date().toISOString() });
  await rec("messages", { id: "p3-msg-1", name: "P3 Üzenő", email: "p3@example.com", message: "P3 törlendő üzenet a kétlépcsős törlés teszthez.", receivedAt: new Date().toISOString(), read: false });
}

try {
  assert((await fetch(`${BASE}/robots.txt`).catch(() => null))?.ok, `a szerver nem érhető el: ${BASE} (futtasd a with-server alatt)`);
  dbReset();
  await seedFixtures();
  const dir = await tmpDir("p3-admin-ux-");
  cleanups.push(() => fs.rm(dir, { recursive: true, force: true }));
  const jpeg = path.join(dir, "utvonal-foto.jpg");
  await fs.writeFile(jpeg, await sharp({ create: { width: 1600, height: 1200, channels: 3, background: { r: 70, g: 110, b: 80 } } }).jpeg({ quality: 85 }).toBuffer());

  browser = await chromium.launch({ executablePath: chromeExe, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "hu-HU" });
  const page = await ctx.newPage();
  const errors = [], dialogs = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("dialog", (d) => { dialogs.push(`${d.type()}: ${d.message()}`); void d.dismiss(); });
  const go = async (p) => { const r = await page.goto(BASE + p, { waitUntil: "networkidle" }); assert(r && r.status() < 400, `${p} → ${r?.status()}`); };

  /* ================= A) kétlépcsős törlés ================= */
  log("A) Kétlépcsős törlés");
  const siteHas = (key, id) => async () => (await readSite())[key].some((x) => x.id === id);
  const arm = async (box, label) => {
    await box.locator("[data-confirm-start]").click();
    const armed = box.locator('[data-confirm="armed"]');
    await armed.waitFor({ timeout: 5000 });
    const txt = (await armed.innerText()).replace(/\s+/g, " ");
    assert(/Biztosan törlöd/.test(txt) && txt.includes("Igen, törlöm") && txt.includes("Mégse"), `A: ${label}: az első kattintás után ez látszik: „${txt}”`);
    return txt;
  };
  const confirmNow = async (box, navigate) => {
    await sleep(450); // a megerősítő gomb az első kattintás után 0,3 s-ig szándékosan nem reagál
    const yes = box.locator("[data-confirm-yes]");
    if (navigate) await Promise.all([page.waitForURL(navigate, { timeout: 20_000 }), yes.click()]);
    else await yes.click();
  };
  const targets = [
    { label: "jelentkezés", where: "/admin/jelentkezesek", scope: '[data-registration-row="p3-reg-1"]', present: () => exists("registrations/p3-reg-1.json"), extra: "dupla" },
    { label: "üzenet", where: "/admin/uzenetek", scope: '[data-message="p3-msg-1"]', present: () => exists("messages/p3-msg-1.json"), extra: "megse" },
    { label: "kép", where: "/admin/kepek", scope: '[data-image-tile="u-p3kep01"]', hover: true, present: async () => (await siteHas("uploads", "u-p3kep01")()) || (await exists("files/u-p3kep01.webp")) },
    { label: "beszámoló", where: "/admin/beszamolok", scope: '[data-report-row="p3-rep-1"]', present: async () => (await siteHas("reports", "p3-rep-1")()) || (await exists("files/r-p3besz01.pdf")) },
    { label: "útvonal", where: "/admin/utvonalak/p3-del-utvonal", scope: '[data-delete="route"]', present: siteHas("routes", "p3-del-utvonal"), navigate: /\/admin\/utvonalak(\?|$)/ },
    { label: "esemény", where: "/admin/esemenyek/p3-del-esemeny", scope: '[data-delete="event"]', present: siteHas("events", "p3-del-esemeny"), navigate: /\/admin\/esemenyek(\?|$)/, extra: "ido" },
  ];
  const summary = [];
  for (const t of targets) {
    assert(await t.present(), `A: ${t.label}: a fixture nincs a tárban`);
    await go(t.where);
    const box = page.locator(t.scope);
    assert((await box.count()) === 1 && (await box.locator("[data-confirm-start]").count()) === 1, `A: ${t.label}: nincs törlés gomb itt: ${t.scope}`);
    assert((await box.locator("[data-confirm-yes]").count()) === 0, `A: ${t.label}: a megerősítés már kattintás előtt látszik`);
    if (t.hover) await box.hover();
    if (t.extra === "dupla") {
      await box.locator("[data-confirm-start]").dblclick();
      await sleep(900);
      assert(await t.present(), `A: ${t.label}: dupla kattintásra törlődött`);
      if ((await box.locator('[data-confirm="armed"]').count()) === 0) await arm(box, t.label);
    } else await arm(box, t.label);
    await sleep(700);
    assert(await t.present(), `A: ${t.label}: már az első kattintásra törlődött`);
    let note = "";
    if (t.extra === "megse") {
      await box.locator("[data-confirm-no]").click();
      await box.locator('[data-confirm="idle"]').waitFor({ timeout: 5000 });
      await sleep(300);
      assert(await t.present(), `A: ${t.label}: a „Mégse” után törlődött`);
      await arm(box, t.label);
      note = " (Mégse → vissza, megmaradt)";
    }
    if (t.extra === "ido") {
      const t0 = Date.now() - 700; // az élesítés óta eltelt (a fenti várakozással együtt)
      await box.locator('[data-confirm="idle"]').waitFor({ timeout: 10_000 });
      const ms = Date.now() - t0;
      assert(ms >= 5500 && ms <= 8500, `A: ${t.label}: a megerősítés ${ms} ms után állt vissza (≈6 s várt)`);
      assert(await t.present(), `A: ${t.label}: a visszaállás közben törlődött`);
      await arm(box, t.label);
      note = ` (magától visszaállt ${(ms / 1000).toFixed(1)} s után, megmaradt)`;
    }
    await confirmNow(box, t.navigate);
    assert(await until(async () => !(await t.present())), `A: ${t.label}: a megerősítés után sem törlődött`);
    await page.locator(t.scope).waitFor({ state: "detached", timeout: 15_000 });
    summary.push(`${t.label}${note}`);
  }
  assert(dialogs.length === 0, `A: natív dialógus nyílt: ${dialogs.join(" | ")}`);
  log(`  A: első kattintás → „Biztosan törlöd? Igen, törlöm / Mégse”, a rekord megvan; megerősítés → törölve a tárból: ${summary.join("; ")}; dupla kattintás nem töröl; natív dialógus: 0`);

  /* ================= B) fordítások ================= */
  log("B) Fordítások");
  await go("/admin/esemenyek");
  const badge = (id) => page.locator(`[data-event-row="${id}"] [data-missing-translation]`);
  assert((await badge("p3-tr-hianyos").getAttribute("data-missing-translation")) === "en,de" && (await badge("p3-tr-hianyos").innerText()).includes("EN, DE"), "B: a hiányos esemény jelvénye nem „EN, DE”");
  assert((await badge("p3-tr-csak-de").getAttribute("data-missing-translation")) === "de", "B: a csak németül hiányos esemény jelvénye nem „DE”");
  assert((await badge("p3-tr-kesz").count()) === 0 && (await badge("p3-tr-rejtett").count()) === 0, "B: jelvény a teljes vagy a rejtett eseménynél");
  await go("/admin/esemenyek/p3-tr-hianyos");
  const det = (n) => page.locator(`details[data-translations="${n}"]`);
  const st = (n) => det(n).locator("[data-tr-status]");
  assert((await det("title").locator("summary").innerText()).includes("Fordítások (angol, német)"), "B: a lenyitó felirata nem „Fordítások (angol, német)”");
  assert(!(await det("title").evaluate((d) => d.open)) && !(await page.locator("#title\\.en").isVisible()) && (await page.locator("#title\\.hu").isVisible()), "B: a fordítások alapból nyitva vannak, vagy a magyar mező nem látszik");
  const s0 = { title: await st("title").innerText(), summary: await st("summary").innerText(), body: await st("body").innerText() };
  assert(s0.title === "Hiányzik: EN" && s0.summary === "Hiányzik: EN, DE" && s0.body === "Nincs szöveg", `B: kezdő címkék: ${JSON.stringify(s0)}`);
  await det("title").locator("summary").click();
  assert((await det("title").evaluate((d) => d.open)) && (await page.locator("#title\\.en").isVisible()), "B: kattintásra nem nyílt le a fordítás");
  await page.fill("#title\\.en", "P3 incomplete");
  assert(await until(async () => (await st("title").innerText()) === "Kész", 3000), `B: az angol cím beírása után a címke: ${await st("title").innerText()}`);
  await det("summary").locator("summary").click();
  await page.fill("#summary\\.en", "P3 incomplete description.");
  assert(await until(async () => (await st("summary").innerText()) === "Hiányzik: DE", 3000), "B: az angol leírás után a címke nem „Hiányzik: DE”");
  await page.fill("#summary\\.de", "P3 unvollständige Beschreibung.");
  assert(await until(async () => (await st("summary").getAttribute("data-tr-status")) === "done", 3000), "B: mindhárom nyelv után a címke nem „Kész”");
  await Promise.all([page.waitForURL(/\/admin\/esemenyek(\?|$)/, { timeout: 20_000 }), page.click('button:has-text("Mentés")')]);
  const saved = (await readSite()).events.find((e) => e.id === "p3-tr-hianyos");
  assert(saved.title.en === "P3 incomplete" && saved.summary.de === "P3 unvollständige Beschreibung.", "B: a lenyitott mezők értéke nem mentődött");
  assert((await badge("p3-tr-hianyos").count()) === 0 && (await badge("p3-tr-csak-de").count()) === 1, "B: mentés után is hiány-jelvény a kiegészített eseményen");
  await go("/admin/esemenyek/p3-tr-kesz");
  assert((await st("title").innerText()) === "Kész" && !(await det("title").evaluate((d) => d.open)), "B: a teljes eseménynél nem „Kész”");
  log(`  B: jelvény: hiányos → EN, DE; csak német hiányzik → DE; teljes és rejtett → nincs; szerkesztő: zárt lenyitó, címkék ${JSON.stringify(s0)} → gépelésre „Kész”; mentés után a jelvény eltűnt`);

  /* ================= C) szekciónkénti mentés ================= */
  log("C) Főoldal és kapcsolat");
  await go("/admin/tartalom");
  const tabs = await page.locator("[data-content-tabs] a").evaluateAll((as) => as.map((a) => [a.getAttribute("href"), a.textContent.trim()]));
  assert(canon(tabs) === canon([["#nyitokep", "Nyitókép"], ["#tulajdonos", "Tulajdonos"], ["#bemutatkozas", "Bemutatkozás"], ["#kapcsolat", "Kapcsolat"]]), `C: fülek: ${JSON.stringify(tabs)}`);
  for (const [id] of tabs.map(([h]) => [h.slice(1)])) {
    assert((await page.locator(`section#${id}[data-section] form [data-section-save="${id}"]`).count()) === 1, `C: a(z) ${id} részben nincs saját mentés gomb`);
  }
  assert((await page.locator("button", { hasText: /^Mentés$/ }).count()) === 0, "C: maradt közös „Mentés” gomb");
  await page.click('[data-content-tabs] a[href="#tulajdonos"]');
  await sleep(400);
  assert(await page.locator("#tulajdonos").evaluate((el) => { const r = el.getBoundingClientRect(); return r.top > -10 && r.top < innerHeight / 2; }), "C: a „Tulajdonos” fül nem ugrott a részhez");
  const before = await readSite();
  const HERO = `P3 főcím ${TAG}`, INTRO = `P3 bemutatkozás ${TAG}`;
  await page.fill("#hero\\.title\\.hu", HERO);
  await page.fill("#intro\\.title\\.hu", INTRO);
  assert((await page.locator('[data-section="nyitokep"] [data-section-dirty]').isVisible()) && (await page.locator('[data-section="bemutatkozas"] [data-section-dirty]').isVisible()) && (await page.locator('[data-section="kapcsolat"] [data-section-dirty]').count()) === 0, "C: a „nem mentett módosítás” jelzés rossz részeken áll");
  await page.click('[data-section-save="nyitokep"]');
  await page.locator('[data-section="nyitokep"] [data-section-status="ok"]').waitFor({ timeout: 20_000 });
  const flash1 = (await page.locator('[data-flash="ok"] > span').innerText()).trim();
  const after1 = await readSite();
  assert(after1.hero.title.hu === HERO, "C: a nyitókép főcíme nem mentődött");
  assert(after1.intro.title.hu === before.intro.title.hu, "C: a nyitókép mentése a bemutatkozás beírt (nem mentett) címét is elmentette");
  for (const k of new Set([...Object.keys(before), ...Object.keys(after1)])) if (k !== "hero") assert(canon(after1[k]) === canon(before[k]), `C: a nyitókép mentése a(z) „${k}” részt is módosította`);
  assert(/Nyitókép/.test(flash1), `C: a Flash-sáv: „${flash1}”`);
  if ((await page.inputValue("#intro\\.title\\.hu")) !== INTRO) await page.fill("#intro\\.title\\.hu", INTRO);
  await page.click('[data-section-save="bemutatkozas"]');
  await page.locator('[data-section="bemutatkozas"] [data-section-status="ok"]').waitFor({ timeout: 20_000 });
  const after2 = await readSite();
  assert(after2.intro.title.hu === INTRO && after2.hero.title.hu === HERO, "C: a bemutatkozás mentése után a két rész nem a várt");
  for (const k of new Set([...Object.keys(after1), ...Object.keys(after2)])) if (k !== "intro") assert(canon(after2[k]) === canon(after1[k]), `C: a bemutatkozás mentése a(z) „${k}” részt is módosította`);
  const home = await getText(`${BASE}/`);
  assert(home.includes(HERO) && home.includes(INTRO), "C: a főoldal nem a mentett főcímet / bemutatkozás-címet adja");
  log(`  C: 4 fül (${tabs.map((x) => x[1]).join(" · ")}), részenként saját gomb; nyitókép mentése → csak a hero változott („${flash1}”), a beírt bemutatkozás-cím nem; bemutatkozás mentése → csak az intro; a főoldal mindkettőt mutatja`);

  /* ================= D) túraútvonalak ================= */
  log("D) Túraútvonalak");
  const MAP = "osveny-ugras-gyuru", PH1 = "aranyfeny-sorfal", PH2 = "ket-lo-taj", PH4 = "osveny-ugras-allo", OTHER = "dron-palya";
  for (const id of [MAP, PH1, PH2, PH4, OTHER]) assert(PHOTOS[id], `D: nincs ilyen kurált fotó: ${id}`);
  let pub = await getText(`${BASE}/turak`);
  assert(pub.includes("data-route-map") && !pub.includes("data-trails"), "D0: útvonal nélkül nem az illusztráció látszik");
  await go("/admin/utvonalak");
  assert(await page.locator("[data-routes-empty]").isVisible(), "D: az üres útvonal-lista nem mondja el, mi a teendő");
  await Promise.all([page.waitForURL(/\/admin\/utvonalak\/uj/), page.locator("a", { hasText: "+ Új útvonal" }).first().click()]);
  const NAME = { hu: `P3 Erdei próbakör ${TAG}`, en: `P3 Forest test loop ${TAG}`, de: `P3 Waldtestrunde ${TAG}` };
  await page.fill("#name\\.hu", NAME.hu);
  await det("name").locator("summary").click();
  await page.fill("#name\\.en", NAME.en); await page.fill("#name\\.de", NAME.de);
  await page.fill("#summary\\.hu", "P3 teszt-leírás az útvonalhoz.");
  await det("summary").locator("summary").click();
  await page.fill("#summary\\.en", "P3 test description."); await page.fill("#summary\\.de", "P3 Testbeschreibung.");
  await page.check(`input[name="mapImage"][value="${MAP}"]`);
  const photoBox = page.locator('[data-photo-picker="photos"]');
  const opt = (id) => photoBox.locator(`[data-photo-option="${id}"] input`);
  const count = () => photoBox.locator("[data-photo-count]").getAttribute("data-photo-count");
  await opt(PH1).check(); await opt(PH2).check();
  assert((await count()) === "2", "D: két fotó kijelölése után a számláló nem 2");
  await photoBox.locator("details.picker-upload > summary").click();
  const up = photoBox.locator("[data-image-upload]");
  await up.locator("[data-upload-file]").setInputFiles(jpeg);
  await up.locator("[data-upload-alt]").fill("P3 útvonal-fotó");
  await up.locator("[data-upload-submit]").click();
  const okUp = up.locator('[data-upload-status="ok"]');
  await okUp.waitFor({ timeout: 60_000 });
  const upId = await okUp.getAttribute("data-upload-id");
  await page.waitForLoadState("networkidle"); await sleep(800); // a router.refresh() lefutott
  assert(upId && (await opt(upId).isChecked()) && (await count()) === "3", `D: a feltöltött kép (${upId}) nincs kijelölve, vagy a számláló nem 3`);
  assert((await page.inputValue("#name\\.hu")) === NAME.hu, "D: a feltöltés után elveszett a beírt név");
  await opt(PH4).check();
  assert((await count()) === "4" && (await opt(OTHER).isDisabled()), "D: 4 kijelölt fotó mellett egy ötödik is választható");
  await opt(PH4).uncheck();
  assert((await count()) === "3" && !(await opt(OTHER).isDisabled()), "D: a kivétel után nem lett újra választható");
  await Promise.all([page.waitForURL(/\/admin\/utvonalak(\?|$)/, { timeout: 30_000 }), page.click("[data-route-save]")]);
  const r1 = (await readSite()).routes.find((r) => r.name?.hu === NAME.hu);
  assert(r1 && r1.published === true && r1.mapImage === MAP && canon(r1.photos) === canon([PH1, PH2, upId]) && canon(r1.name) === canon(NAME) && r1.order === 0, `D: a mentett útvonal: ${JSON.stringify(r1)}`);
  pub = await getText(`${BASE}/turak`);
  assert(pub.includes("data-trails") && pub.includes(`data-trail="${r1.id}"`) && !pub.includes("data-route-map"), "D: közzétett útvonal mellett nem kártya látszik, vagy az illusztráció is ott maradt");
  const cStart = pub.indexOf(`data-trail="${r1.id}"`);
  const card = pub.slice(cStart, pub.indexOf("</li>", cStart));
  const zooms = card.match(/data-zoom="\d+"/g) ?? [];
  assert(card.includes(NAME.hu) && card.includes("P3 teszt-leírás") && zooms.length === 4, `D: a kártyán név/leírás hiányzik, vagy a nagyítható képek száma ${zooms.length} (4 várt)`);
  for (const id of [MAP, PH1, PH2, upId]) assert(card.includes(id), `D: a kártyán nincs ott a(z) ${id} kép`);
  for (const [l, name] of [["en", NAME.en], ["de", NAME.de]]) assert((await getText(`${BASE}/${l}/turak`)).includes(name), `D: a /${l}/turak nem a(z) ${l} nevet adja`);
  await go("/turak");
  const cardEl = page.locator(`[data-trail="${r1.id}"]`);
  await cardEl.scrollIntoViewIfNeeded(); await sleep(800);
  await cardEl.locator('[data-trail-photos] [data-zoom="2"]').click();
  const zoom = cardEl.locator('.zoom[data-open="true"]');
  await zoom.waitFor({ timeout: 5000 });
  const zimg = zoom.locator(".zoom-fig img");
  await zimg.waitFor({ timeout: 5000 });
  assert(await until(() => zimg.evaluate((i) => i.complete && i.naturalWidth > 0), 10_000), "D: a nagyított kép nem töltődött be");
  const zAlt = await zimg.getAttribute("alt");
  assert(zAlt === PHOTOS[PH2].alt, `D: a nagyító nem a kattintott képet mutatja: „${zAlt}”`);
  await page.keyboard.press("Escape");
  await cardEl.locator('.zoom[data-open="false"]').waitFor({ state: "attached", timeout: 5000 });

  await go("/admin/utvonalak/uj");
  const NAME2 = `P3 Második kör ${TAG}`;
  await page.fill("#name\\.hu", NAME2);
  await photoBox.locator(`[data-photo-option="${OTHER}"] input`).check();
  await Promise.all([page.waitForURL(/\/admin\/utvonalak(\?|$)/, { timeout: 30_000 }), page.click("[data-route-save]")]);
  const r2 = (await readSite()).routes.find((r) => r.name?.hu === NAME2);
  assert(r2 && r2.order === 1 && r2.published, `D: a második útvonal: ${JSON.stringify(r2)}`);
  assert((await page.locator(`[data-route-row="${r2.id}"] [data-missing-translation]`).getAttribute("data-missing-translation")) === "en,de", "D: a fordítás nélküli útvonalon nincs hiány-jelvény");
  /* A kártyák címei és sorszámai a Túrák lap útvonal-szekciójában, sorrendben (a név a nagyító gomb feliratában is szerepel, ezért a <h3>-at nézzük). */
  const cardOrder = (html) => {
    const sec = html.slice(html.indexOf("data-trails"), html.indexOf("</section>", html.indexOf("data-trails")));
    return { names: [...sec.matchAll(/<h3 class="h2">([^<]*)<\/h3>/g)].map((m) => m[1]), numbers: [...sec.matchAll(/<p class="eyebrow">([^<]*)<\/p>/g)].map((m) => m[1]) };
  };
  const o1 = cardOrder(await getText(`${BASE}/turak`));
  assert(canon(o1.names) === canon([NAME.hu, NAME2]) && canon(o1.numbers) === canon(["1. útvonal", "2. útvonal"]), `D: a lapon nem az admin sorrendje: ${JSON.stringify(o1)}`);
  await page.click(`[data-route-row="${r2.id}"] [data-route-move="up"]`);
  assert(await until(async () => (await readSite()).routes.find((r) => r.id === r2.id)?.order === 0), "D: a „↑” nem változtatta meg a sorrendet");
  const o2 = cardOrder(await getText(`${BASE}/turak`));
  assert(canon(o2.names) === canon([NAME2, NAME.hu]) && canon(o2.numbers) === canon(["1. útvonal", "2. útvonal"]), `D: a sorrendcsere után a lap sorrendje nem követi az admint: ${JSON.stringify(o2)}`);
  for (const r of [r1, r2]) {
    await go("/admin/utvonalak");
    await page.click(`[data-route-row="${r.id}"] [data-route-toggle]`);
    assert(await until(async () => (await readSite()).routes.find((x) => x.id === r.id)?.published === false), `D: a közzététel visszavonása nem mentődött (${r.id})`);
  }
  await go("/admin/utvonalak");
  assert((await page.locator("[data-routes-live]").getAttribute("data-routes-live")) === "0", "D: a lista nem jelzi, hogy most az illusztráció látszik");
  const LEGEND = { "": ["Erdei kör", "Dombháti kör", "Legelős kör"], "/en": ["Forest loop", "Ridge loop", "Pasture loop"], "/de": ["Waldrunde", "Höhenrunde", "Weidenrunde"] };
  const FORBIDDEN = /kezdő|rövid|délelőtt|gyakorlott|hosszú|völgy|beginner|short|morning|experienced|long ride|valley|Anfänger|kurz|Vormittag|erfahren|Langer|Nachbartal/i;
  for (const [pfx, names] of Object.entries(LEGEND)) {
    const html = await getText(`${BASE}${pfx}/turak`);
    assert(html.includes("data-route-map") && !html.includes("data-trails"), `D: ${pfx || "/"}turak: a visszavonás után nem az illusztráció látszik`);
    const sStart = html.indexOf('class="route"');
    const section = html.slice(sStart, html.indexOf("</section>", sStart));
    const lStart = section.indexOf("data-route-legend");
    const legend = section.slice(lStart, section.indexOf('<p class="route-note"', lStart));
    const got = [...legend.matchAll(/<b>([^<]*)<\/b>/g)].map((m) => m[1]);
    const leftover = names.reduce((s, n) => s.replace(n, ""), legend.slice(legend.indexOf(">") + 1).replace(/<[^>]+>/g, "")).replace(/\s+/g, "");
    assert(canon(got) === canon(names) && leftover === "", `D: ${pfx || "/"}turak jelmagyarázata: ${JSON.stringify(got)}, maradék szöveg: „${leftover}”`);
    const bad = section.match(FORBIDDEN);
    assert(!bad, `D: ${pfx || "/"}turak: időtartam/nehézség-szó az illusztráció szövegében: „${bad?.[0]}”`);
  }
  const oldDicts = ["hu", "en", "de"].map((l) => spawnSync("git", ["show", `2780a7d:src/content/${l}.ts`], { cwd: ROOT, encoding: "utf8" }).stdout.match(/route: \{.*\}/)?.[0] ?? "");
  assert(oldDicts.every((s) => FORBIDDEN.test(s)), "kontroll: a korábbi (2780a7d) jelmagyarázat szövegén sem talál a tiltott-szó keresés — a fenti állítás így nem bizonyít");
  log(`  D: útvonal felvéve (térkép ${MAP}, fotók ${PH1}, ${PH2}, ${upId} a P2 feltöltőjével; 4-es korlát működik) → /turak kártya 4 nagyítható képpel, /en és /de a saját nevével; a 2. fotóra a nagyító „${zAlt.slice(0, 40)}…” képpel nyílt; ↑ → a lap sorrendje követi; visszavonás → illusztráció, jelmagyarázat csak nevekkel (kontroll: a régi szövegen a keresés talál)`);

  /* ================= E) állapotpanel ================= */
  log("E) Állapotpanel");
  const ENV = ["RESEND_API_KEY", "CONTACT_TO", "CONTACT_FROM", "GOOGLE_PLACES_KEY", "GOOGLE_PLACE_ID", "ADMIN_PASSWORD", "ADMIN_USER"];
  await go("/admin");
  const panel = page.locator("[data-status-panel]");
  assert(await panel.isVisible(), "E: nincs állapotpanel az admin kezdőlapján");
  for (const n of ENV) assert((await panel.locator(`[data-env="${n}"] code`).innerText()) === n, `E: nincs sor a(z) ${n} változóhoz`);
  for (const g of ["mail", "google", "admin"]) assert((await panel.locator(`[data-status="${g}"]`).count()) === 1, `E: nincs „${g}” csoport`);
  assert((await panel.locator('[data-env="RESEND_API_KEY"]').getAttribute("data-env-set")) === "0", "E: a with-server szerverén be van állítva a RESEND_API_KEY — a próba valódi e-mailt küldene; futtasd kulcs nélkül");
  const toLocal = (await panel.locator("[data-mail-to]").innerText()).trim();
  assert(/^[^@\s]+@[^@\s]+$/.test(toLocal), `E: a címzett nem e-mail-cím: „${toLocal}”`);
  await Promise.all([page.waitForURL(/\/admin\?/, { timeout: 20_000 }), panel.locator("[data-test-mail]").click()]);
  const errFlash = page.locator('[data-flash="err"]');
  await errFlash.waitFor({ timeout: 10_000 });
  const et = (await errFlash.locator("span").innerText()).replace(/\s+/g, " ");
  assert(et.includes("RESEND_API_KEY") && et.includes("Állítsd be") && et.includes("deployold újra"), `E: kulcs nélkül nem érthető a próba-e-mail üzenete: „${et}”`);

  const mockHits = [];
  const mock = http.createServer(async (req, res) => {
    let body = ""; for await (const c of req) body += c;
    let json = null; try { json = JSON.parse(body); } catch { /* nem JSON */ }
    mockHits.push({ method: req.method, url: req.url, auth: req.headers.authorization, body: json });
    res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ id: "p3-mock" }));
  });
  await new Promise((r) => mock.listen(0, "127.0.0.1", r));
  cleanups.push(() => new Promise((r) => mock.close(r)));
  const dir2 = await tmpDir("p3-ux-mock-");
  cleanups.push(() => fs.rm(dir2, { recursive: true, force: true }));
  await fs.writeFile(path.join(dir2, "site.json"), JSON.stringify(readSeed(), null, 2));
  const KEY = `re_p3_titkos_${TAG}`, GKEY = `AIza-p3-titkos-${TAG}`;
  srv2 = await startNext({
    port: await freePort(), label: "mock",
    env: { DATA_DIR: dir2, RESEND_API_KEY: KEY, RESEND_API_URL: `http://127.0.0.1:${mock.address().port}/emails`, CONTACT_TO: "", CONTACT_FROM: "", GOOGLE_PLACES_KEY: GKEY, GOOGLE_PLACE_ID: "", ADMIN_PASSWORD: "", ADMIN_USER: "" },
  });
  const html2 = await getText(`${srv2.base}/admin`);
  assert(!html2.includes(KEY) && !html2.includes(GKEY), "E2: egy kulcs értéke megjelent az admin HTML-jében");
  const page2 = await ctx.newPage();
  page2.on("pageerror", (e) => errors.push(String(e)));
  await page2.goto(`${srv2.base}/admin`, { waitUntil: "networkidle" });
  const panel2 = page2.locator("[data-status-panel]");
  const set2 = Object.fromEntries(await Promise.all(ENV.map(async (n) => [n, await panel2.locator(`[data-env="${n}"]`).getAttribute("data-env-set")])));
  assert(set2.RESEND_API_KEY === "1" && set2.GOOGLE_PLACES_KEY === "1" && set2.CONTACT_TO === "0" && set2.ADMIN_PASSWORD === "0", `E2: a panel állapota: ${JSON.stringify(set2)}`);
  assert((await panel2.locator("[data-mail-to]").innerText()).trim() === "info@gyurusimenes.hu", "E2: CONTACT_TO nélkül nem az info@gyurusimenes.hu a címzett");
  /* A panel a feladóról is igazat mondjon: a kiírt cím az, amivel a levél ténylegesen megy (lent a mock méri), és a
     megjegyzés nem nevezheti a Resend tesztcímének (a P5-ös egyesítés óta az alapértelmezés a gyurusimenes.hu-s cím). */
  const fromShown = (await panel2.locator("[data-mail-from]").innerText()).trim();
  const fromRow = (await panel2.locator('[data-env="CONTACT_FROM"]').innerText()).replace(/\s+/g, " ");
  assert(!/tesztcím|resend\.dev/i.test(fromRow) && /hitelesítve/.test(fromRow), `E2: a feladó-sor megjegyzése félrevezető: „${fromRow}”`);
  await Promise.all([page2.waitForURL(/\/admin\?/, { timeout: 20_000 }), panel2.locator("[data-test-mail]").click()]);
  const okFlash = page2.locator('[data-flash="ok"]');
  await okFlash.waitFor({ timeout: 10_000 });
  const ot = (await okFlash.locator("span").innerText()).trim();
  assert(ot.includes("Próba e-mail elküldve") && ot.includes("info@gyurusimenes.hu"), `E2: a sikeres próba üzenete: „${ot}”`);
  const hit = mockHits[0];
  assert(mockHits.length === 1 && hit.method === "POST" && hit.auth === `Bearer ${KEY}` && canon(hit.body?.to) === canon(["info@gyurusimenes.hu"]) && hit.body?.from === "Gyűrűsi Ménes <weboldal@gyurusimenes.hu>" && /Próba/.test(hit.body?.subject ?? ""), `E2: a Resend-mock ezt kapta: ${JSON.stringify(mockHits)}`);
  assert(fromShown === hit.body.from, `E2: a panelen kiírt feladó („${fromShown}”) nem az, amivel a levél ment („${hit.body.from}”)`);
  await page2.close();
  log(`  E: panel 3 csoporttal és 7 változó nevével; kulcs nélkül a próba → „${et.slice(0, 110)}…”; kontroll-szerver kamu kulcsokkal: „Beállítva”, a kulcsok értéke nincs a HTML-ben, a próba a mockhoz ment (Bearer kulcs, címzett info@gyurusimenes.hu, feladó az alapértelmezés) → „${ot}”`);

  assert(errors.length === 0, `böngésző-hibák: ${errors.join(" | ")}`);
  passed = true;
} catch (e) {
  console.error(e instanceof CheckError ? `FAIL: ${e.message}` : `FAIL: váratlan hiba: ${e?.stack ?? e}`);
  if (srv2?.logs?.length) console.error("--- mock-szerver napló (vége) ---\n" + srv2.logs.join("").slice(-2000));
} finally {
  if (browser) await browser.close().catch(() => {});
  if (srv2) await srv2.stop().catch(() => {});
  for (const c of cleanups.reverse()) await c().catch(() => {});
  dbReset();
}
if (passed) { console.log("PASS: p3-admin-ux"); process.exit(0); }
process.exit(1);
