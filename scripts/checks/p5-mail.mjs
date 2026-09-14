/**
 * G21 — E-mail szimulációval (helyi Resend-mock). Használat: node scripts/checks/p5-mail.mjs  (PORT, alap 3041)
 *
 *  0. friss build, helyi DB a magból + egy próbaesemény nyitott jelentkezéssel (30 nap múlva)
 *  1. mock (200) + next start: RESEND_API_KEY=teszt, RESEND_API_BASE=<mock>, CONTACT_TO és CONTACT_FROM NÉLKÜL
 *  2. kapcsolati üzenet → pontosan egy levél az info@gyurusimenes.hu-ra, válaszcím a küldő, a tárgyban az oldal,
 *     alapértelmezett feladó, Bearer-kulcs
 *  3. jelentkezés e-maillel hu/en/de → értesítő a ménesnek (magyarul) + visszaigazolás a jelentkezőnek a SAJÁT nyelvén:
 *     a tárgy és a törzs nyelve ellenőrizve, és a másik két nyelv jelölői NINCSENEK benne (a próba így el tud bukni)
 *  4. a mock 500-at ad → a látogató mégis 200/ok választ kap, a mock látta a próbálkozást, és az adat a tárban van
 *     (pozitív kontroll: a keresés a sosem küldött jelölőt NEM találja meg)
 *  5. a szolgáltató elérhetetlen (a mock leállítva) → ugyanígy siker és tárolás
 * A végén a helyi DB visszaáll. Csak ha minden teljesült: PASS: p5-mail
 * A tárolás ellenőrzése tár-függetlenül a data/ könyvtár tartalmában keres (a tár szerkezete változhat).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { startMockResend } from "../mock-resend.mjs";
import { ROOT, CheckFail, assert, cleanEnv, build, startNext, dbReset, scanDir, api, waitFor } from "./_p5-harness.mjs";

const DB = path.join(ROOT, "data/site.json");
const RUN = Date.now().toString(36);
const EVENT_ID = `p5-mail-proba-${RUN}`;
const TITLE = { hu: "P5 próba-esemény", en: "P5 test event", de: "P5 Testveranstaltung" };
const LANG_MARK = {
  hu: { subject: /^Megkaptuk a jelentkezésed/, body: /Köszönjük a jelentkezést/ },
  en: { subject: /^We received your registration/, body: /Thank you for registering/ },
  de: { subject: /^Wir haben Ihre Anmeldung erhalten/, body: /Vielen Dank für Ihre Anmeldung/ },
};
let ipSeq = 0;
const ip = () => `10.55.${Math.floor(++ipSeq / 250)}.${(ipSeq % 250) + 1}`;

let server, mock;
let passed = false;
try {
  /* 0. build + DB + próbaesemény */
  build(cleanEnv(), "kulcs nélkül");
  dbReset();
  const site = JSON.parse(await fs.readFile(DB, "utf8"));
  const date = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  site.events = (site.events ?? []).filter((e) => !String(e.id).startsWith("p5-mail-proba-"));
  site.events.push({
    id: EVENT_ID, title: TITLE, date, location: "Gyűrűsi Ménes",
    summary: { hu: "Automatikus próba — a kapu végén törlődik.", en: "Automated check — removed afterwards.", de: "Automatische Prüfung — wird danach entfernt." },
    published: true, featured: false, registration: true,
  });
  await fs.writeFile(DB, JSON.stringify(site, null, 2));

  /* 1. mock + szerver */
  mock = await startMockResend({ port: 0, status: 200 });
  server = await startNext(cleanEnv({ RESEND_API_KEY: "teszt", RESEND_API_BASE: mock.url }));
  const ev = await api(`/esemenyek/${EVENT_ID}`);
  assert(ev.status === 200 && ev.text.includes("data-registration"), `a próbaesemény lapja nem jelentkezhető (${ev.status})`);

  /* 2. kapcsolati üzenet */
  const cMark = `P5-KAPCSOLAT-${RUN}`;
  const c = await api("/api/contact", { method: "POST", headers: { "x-forwarded-for": ip() }, body: { name: "P5 Küldő", email: "p5-kuldo@example.com", phone: "+36 30 000 0001", message: `${cMark} — próbaüzenet a Túrák oldalról.`, page: "Túrák", lang: "hu" } });
  assert(c.status === 200 && c.json?.ok, `kapcsolati üzenet → ${c.status} ${c.text.slice(0, 200)}`);
  const cm = await waitFor(() => mock.mails().length >= 1 && mock.mails(), 5000);
  assert(cm && cm.length === 1, `a kapcsolati üzenetre nem pontosan egy levél ment (${cm ? cm.length : 0})`);
  const m0 = cm[0];
  assert(m0.status === 200, `a mock nem fogadta el a levelet (${m0.status})`);
  assert(m0.auth === "Bearer teszt", `rossz Authorization: ${m0.auth}`);
  assert(JSON.stringify(m0.body.to) === JSON.stringify(["info@gyurusimenes.hu"]), `a címzett nem az info@gyurusimenes.hu (CONTACT_TO nélkül): ${JSON.stringify(m0.body.to)}`);
  assert(m0.body.reply_to === "p5-kuldo@example.com", `a válaszcím nem a küldő: ${m0.body.reply_to}`);
  assert(m0.body.subject.includes("Túrák"), `a tárgyban nincs benne az oldal: ${m0.body.subject}`);
  assert(m0.body.from === "Gyűrűsi Ménes <weboldal@gyurusimenes.hu>", `nem az alapértelmezett feladó: ${m0.body.from}`);
  assert(m0.body.text.includes(cMark), "a levél törzsében nincs benne az üzenet");
  console.log(`2. kapcsolat OK: → ${m0.body.to[0]}, reply_to ${m0.body.reply_to}, tárgy: „${m0.body.subject}”`);

  /* 3. jelentkezés hu/en/de */
  for (const lang of ["hu", "en", "de"]) {
    mock.clear();
    const email = `p5-${lang}-${RUN}@example.com`;
    const name = `P5 Jelentkező ${lang.toUpperCase()}`;
    const r = await api("/api/register", { method: "POST", headers: { "x-forwarded-for": ip() }, body: { eventId: EVENT_ID, name, phone: "+36 30 000 0002", email, count: "2", note: "", lang } });
    assert(r.status === 200 && r.json?.ok, `jelentkezés (${lang}) → ${r.status} ${r.text.slice(0, 200)}`);
    const mails = await waitFor(() => mock.mails().length >= 2 && mock.mails(), 5000);
    assert(mails && mails.length === 2, `jelentkezés (${lang}): nem két levél ment (${mails ? mails.length : 0})`);
    const notify = mails.find((m) => m.body.to.includes("info@gyurusimenes.hu"));
    const confirm = mails.find((m) => m.body.to.includes(email));
    assert(notify, `jelentkezés (${lang}): nincs értesítő az info@gyurusimenes.hu-ra`);
    assert(notify.body.subject.startsWith("Jelentkezés:") && notify.body.subject.includes(name) && notify.body.subject.includes("2 fő"), `értesítő tárgya (${lang}): ${notify.body.subject}`);
    assert(notify.body.subject.includes(TITLE.hu), `az értesítő nem a magyar eseménycímet adja: ${notify.body.subject}`);
    assert(notify.body.reply_to === email, `értesítő válaszcíme nem a jelentkező (${lang}): ${notify.body.reply_to}`);
    assert(notify.body.text.includes("+36 30 000 0002"), `az értesítőben nincs telefonszám (${lang})`);
    assert(confirm, `jelentkezés (${lang}): nincs visszaigazolás a jelentkezőnek`);
    assert(JSON.stringify(confirm.body.to) === JSON.stringify([email]), `a visszaigazolás más címre is ment: ${JSON.stringify(confirm.body.to)}`);
    assert(LANG_MARK[lang].subject.test(confirm.body.subject), `a visszaigazolás tárgya nem ${lang} nyelvű: ${confirm.body.subject}`);
    assert(LANG_MARK[lang].body.test(confirm.body.text), `a visszaigazolás törzse nem ${lang} nyelvű: ${confirm.body.text.slice(0, 80)}`);
    assert(confirm.body.subject.includes(TITLE[lang]), `a visszaigazolás tárgyában nem a(z) ${lang} eseménycím áll: ${confirm.body.subject}`);
    for (const other of ["hu", "en", "de"].filter((l) => l !== lang)) {
      assert(!LANG_MARK[other].subject.test(confirm.body.subject) && !LANG_MARK[other].body.test(confirm.body.text), `a(z) ${lang} visszaigazolásban ${other} nyelvű szöveg is van`);
      assert(!confirm.body.subject.includes(TITLE[other]), `a(z) ${lang} visszaigazolás tárgyában a(z) ${other} eseménycím áll`);
    }
    assert(confirm.body.reply_to === "info@gyurusimenes.hu", `a visszaigazolás válaszcíme nem a ménes: ${confirm.body.reply_to}`);
    console.log(`3. jelentkezés ${lang} OK: értesítő → info@, visszaigazolás → ${email}: „${confirm.body.subject}”`);
  }

  /* 4. a szolgáltató 500-at ad */
  mock.clear(); mock.setStatus(500);
  const failMsg = `P5-HIBA500-UZENET-${RUN}`, failReg = `P5 Hibaág ${RUN}`, never = `P5-SOSEM-KULDOTT-${RUN}`;
  const c5 = await api("/api/contact", { method: "POST", headers: { "x-forwarded-for": ip() }, body: { name: "P5 Hibaág", email: "p5-hiba@example.com", message: `${failMsg} — a szolgáltató hibázik.`, page: "Oktatás", lang: "hu" } });
  assert(c5.status === 200 && c5.json?.ok, `mock 500 mellett a kapcsolati üzenet nem sikeres a látogatónak: ${c5.status} ${c5.text.slice(0, 200)}`);
  const r5 = await api("/api/register", { method: "POST", headers: { "x-forwarded-for": ip() }, body: { eventId: EVENT_ID, name: failReg, phone: "+36 30 000 0003", email: `p5-hiba-${RUN}@example.com`, count: "3", lang: "de" } });
  assert(r5.status === 200 && r5.json?.ok, `mock 500 mellett a jelentkezés nem sikeres a látogatónak: ${r5.status} ${r5.text.slice(0, 200)}`);
  const attempts = mock.mails();
  assert(attempts.length === 3 && attempts.every((m) => m.status === 500), `a hibaág nem futott le valóban (próbálkozások: ${attempts.map((m) => m.status).join(",") || "0"})`);
  const stored5 = await scanDir(path.join(ROOT, "data"), [failMsg, failReg, never]);
  assert(stored5.some((h) => h.needle === failMsg), "mock 500 mellett a kapcsolati üzenet nem tárolódott");
  assert(stored5.some((h) => h.needle === failReg), "mock 500 mellett a jelentkezés nem tárolódott");
  assert(!stored5.some((h) => h.needle === never), "a tár-keresés olyat is talált, amit sosem küldtünk — a keresés hibás");
  console.log(`4. szolgáltató 500 OK: a látogató sikert kapott, 3 elbukott küldés, tárolva (${[...new Set(stored5.map((h) => h.file))].join(", ")})`);

  /* 5. a szolgáltató elérhetetlen */
  await mock.close(); mock = null;
  const downMsg = `P5-ELERHETETLEN-${RUN}`;
  const cd = await api("/api/contact", { method: "POST", headers: { "x-forwarded-for": ip() }, body: { name: "P5 Leállás", email: "p5-le@example.com", message: `${downMsg} — nincs szolgáltató.`, page: "Táborok", lang: "en" } });
  assert(cd.status === 200 && cd.json?.ok, `elérhetetlen szolgáltatónál a kapcsolati üzenet: ${cd.status} ${cd.text.slice(0, 200)}`);
  assert((await scanDir(path.join(ROOT, "data"), [downMsg])).length > 0, "elérhetetlen szolgáltatónál az üzenet nem tárolódott");
  console.log("5. elérhetetlen szolgáltató OK: siker + tárolás");
  passed = true;
} catch (e) {
  console.error("FAIL:", e instanceof CheckFail ? e.message : e?.stack ?? e);
  if (server && !(e instanceof CheckFail)) console.error(server.log().slice(-2000));
  process.exitCode = 1;
} finally {
  await server?.stop();
  await mock?.close();
  try { dbReset(); } catch (e) { console.error("FAIL: db:reset a végén:", e.message); passed = false; process.exitCode = 1; }
}
if (passed) console.log("PASS: p5-mail");
else if (!process.exitCode) { console.error("FAIL: a próba nem ért végig"); process.exitCode = 1; }
