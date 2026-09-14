/**
 * G26 — Teljes adatkezelési tájékoztató mindhárom nyelven. Saját `next start` a 3012-es porton, elszigetelt DATA_DIR-rel
 * (előtte `npm run build`). Használat: node scripts/checks/p4-privacy.mjs
 *
 *  A) A megőrzési számok egy helyen: a src/lib/maintenance.ts állandói (REGISTRATION_RETENTION_DAYS, MESSAGE_RETENTION_DAYS,
 *     BACKUPS_KEPT); a src/lib/privacy.ts ezeket importálja, a mag sablonja pedig jelölőket ({{registrationDays}}…) tartalmaz,
 *     nem beírt számot. Kontroll: a „beírt szám” detektor egy hamisított sablonon jelez.
 *  B) A megjelenített /adatkezeles, /en/adatkezeles, /de/adatkezeles: minden kötelező rész megvan (adatkezelő, adatkörönként
 *     cél + jogalap + megőrzés, a karbantartás napjaival a megfelelő szakaszban, jogok, NAIH a teljes elérhetőséggel, Netlify /
 *     Resend / Google, alcím-szerkezet); nincs kitöltetlen {{jelölő}}; nincs benne a régi, kód nélküli ígéret.
 *  C) Az adatkezelő az impresszum mezőiből: próbaadatokkal kitöltött impresszum → a lapon pontosan azok látszanak, az üres mező
 *     címkéje nem; minden mező üresen → semleges mondat, kitalált adat nélkül. Kontroll: a próbaadat előtte nem volt a lapon.
 *  D) Régi tár: a szó szerint változatlan régi szöveg olvasáskor az új sablonra cserélődik; egy átírt régi szöveg marad.
 *  E) Ami a szövegben ígéret, az a kódban is úgy van: a látogatónak nincs Set-Cookie (a nyelvi süti csak a váltóra kattintva,
 *     egy évre: max-age=31536000), a belépési süti 30 napos, a térkép kattintásra töltődik (MapEmbed), a sebességkorlát
 *     IP-hash-t tárol.
 * A végén „PASS: p4-privacy”, ha minden állítás teljesült; különben „FAIL: …” és 1-es kilépési kód.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { ROOT, readSeed, startNext, tmpDir } from "./_p1-harness.mjs";
import { revalidateSite } from "../revalidate.mjs";

const PORT = 3012;
const problems = [];
const bad = (m) => problems.push(m);
const src = (p) => fs.readFile(path.join(ROOT, p), "utf8");
const decode = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
/** A tájékoztató törzse ([data-privacy]) szerkezetként: alcímek és alattuk a szöveg (címkék nélkül). */
function sections(html) {
  const start = html.indexOf("data-privacy");
  if (start < 0) return null;
  const end = html.indexOf("</main>", start);
  const body = html.slice(start, end < 0 ? undefined : end);
  const out = []; let cur = { title: "", text: "" };
  for (const m of body.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>|<(?:p|li)\b[^>]*>([\s\S]*?)<\/(?:p|li)>/gi)) {
    const clean = (x) => decode(x.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
    if (m[1] !== undefined) { out.push(cur); cur = { title: clean(m[1]), text: "" }; } else cur.text += ` ${clean(m[2])}`;
  }
  out.push(cur);
  return out;
}

/* ---------- A) megőrzési számok: egy helyen, a kódból ---------- */
const maint = await src("src/lib/maintenance.ts");
const num = (name) => Number(maint.match(new RegExp(`export const ${name} = (\\d+);`))?.[1]);
const REG = num("REGISTRATION_RETENTION_DAYS"), MSG = num("MESSAGE_RETENTION_DAYS"), BACK = num("BACKUPS_KEPT");
if (!(REG > 0 && MSG > 0 && BACK > 0)) bad(`a maintenance.ts állandói nem olvashatók (${REG}/${MSG}/${BACK})`);
if ((maint.match(/REGISTRATION_RETENTION_DAYS\s*=/g) ?? []).length !== 1) bad("a REGISTRATION_RETENTION_DAYS nem pontosan egyszer definiált");
const privacyLib = await src("src/lib/privacy.ts");
if (!/import \{[^}]*BACKUPS_KEPT[^}]*MESSAGE_RETENTION_DAYS[^}]*REGISTRATION_RETENTION_DAYS[^}]*\} from "\.\/maintenance"/.test(privacyLib)) bad("a privacy.ts nem a maintenance.ts állandóit importálja");
for (const [tok, name] of [["registrationDays", "REGISTRATION_RETENTION_DAYS"], ["messageDays", "MESSAGE_RETENTION_DAYS"], ["backupDays", "BACKUPS_KEPT"]]) {
  if (!new RegExp(`${tok}: String\\(${name}\\)`).test(privacyLib)) bad(`a privacy.ts a {{${tok}}} jelölőt nem a ${name}-ből tölti`);
}
const DAY_WORDS = { hu: /\b(\d+)\s+nap/g, en: /\b(\d+)\s+(?:more\s+)?days?\b/g, de: /\b(\d+)\s+Tage?\b/g };
/** Beírt napszám a sablonban (a jelölő helyett) — ez szakítaná el a szöveget a kódtól. */
const literalDays = (text, l) => [...text.matchAll(DAY_WORDS[l])].map((m) => m[0]);
const seed = readSeed();
for (const l of ["hu", "en", "de"]) {
  const tpl = seed.legal.privacy[l];
  for (const tok of ["controller", "contactEmail", "registrationDays", "messageDays", "backupDays"]) if (!tpl.includes(`{{${tok}}}`)) bad(`seed ${l}: hiányzik a {{${tok}}} jelölő`);
  const lit = literalDays(tpl.replace(/\(30 napig\)|\(valid for 30 days\)|\(30 Tage gültig\)/g, ""), l);
  if (lit.length) bad(`seed ${l}: beírt napszám a megőrzésnél a jelölő helyett: ${lit.join(", ")}`);
}
/* Kontroll: a detektor a hamisított sablonban megtalálja a beírt számot. */
if (literalDays("- Megőrzés: a beérkezése után 365 nappal automatikusan töröljük.", "hu").length !== 1 || literalDays("deleted 30 days after the event", "en").length !== 1) bad("önteszt: a beírt-szám detektor nem jelez");
/* A belépési süti a szövegben 30 nap — a kódban is. */
const auth = await src("src/lib/admin-auth.ts");
const cookieDays = auth.match(/export const SESSION_DAYS = (\d+);/)?.[1];
const authActions = await src("src/app/[lang]/admin/auth-actions.ts");
if (!/maxAge: SESSION_DAYS \* 86400/.test(authActions)) bad("A) a belépési süti élettartama nem a SESSION_DAYS-ből jön");
console.log(`A) megőrzés a kódból: jelentkezés ${REG} nap, üzenet ${MSG} nap, mentések ${BACK}; a sablon jelölőket használ; belépési süti a kódban: ${cookieDays ?? "?"} nap`);

/* ---------- szerver elszigetelt adatkönyvtárral ---------- */
const dir = await tmpDir("p4-privacy-");
/* P7: a nyilvános lapok ISR-gyorsítótárban vannak — a futó szerveren minden közvetlen tár-írás után érvénytelenítjük őket. */
let serverUp = false;
const writeSite = async (site) => { await fs.writeFile(path.join(dir, "site.json"), JSON.stringify(site, null, 2)); if (serverUp) await revalidateSite(`http://localhost:${PORT}`); };
const base = structuredClone(seed);
await writeSite(base);
const srv = await startNext({ port: PORT, env: { DATA_DIR: dir }, label: "p4-privacy" });
serverUp = true;
const BASE = `http://localhost:${PORT}`;
const page = async (p, init) => { const r = await fetch(BASE + p, { redirect: "manual", headers: { "accept-language": "hu", ...(init?.headers ?? {}) } }); return { status: r.status, html: await r.text(), headers: r.headers }; };
const LP = { hu: "/adatkezeles", en: "/en/adatkezeles", de: "/de/adatkezeles" };

/** Nyelvenként: az alcímek (a sorrend is), a szakaszonként kötelező szavak és a kötelező adatok. */
const REQUIRED = {
  hu: {
    controller: "Az adatkezelő", rights: "Jogaid", complaint: "Panasz",
    messages: "Kapcsolati üzenet", registrations: "Jelentkezés eseményre", backups: "Biztonsági mentés", cookies: "Sütik", map: "Google Térkép", reviews: "Google-értékelések", processors: "Adatfeldolgozók",
    purpose: "Cél:", basis: "Jogalap:", retention: "Megőrzés:", days: (n) => `${n} nappal`, backupDays: (n) => `${n} napi mentést`,
    rightsWords: ["hozzáférés", "helyesbítés", "törlés", "korlátozás", "tiltakozni", "visszavonni", "adathordozhatóság"],
  },
  en: {
    controller: "Data controller", rights: "Your rights", complaint: "Complaints",
    messages: "Contact messages", registrations: "Event registration", backups: "Backups", cookies: "Cookies", map: "Google Maps", reviews: "Google reviews", processors: "Processors",
    purpose: "Purpose:", basis: "Legal basis:", retention: "Retention:", days: (n) => `${n} days`, backupDays: (n) => `last ${n} daily backups`,
    rightsWords: ["access", "corrected", "erased", "restricted", "object", "withdraw", "portability"],
  },
  de: {
    controller: "Verantwortlicher", rights: "Ihre Rechte", complaint: "Beschwerde",
    messages: "Kontaktnachrichten", registrations: "Anmeldung zu Veranstaltungen", backups: "Datensicherung", cookies: "Cookies", map: "Google Maps", reviews: "Google-Bewertungen", processors: "Auftragsverarbeiter",
    purpose: "Zweck:", basis: "Rechtsgrundlage:", retention: "Speicherdauer:", days: (n) => `${n} Tage`, backupDays: (n) => `letzten ${n} täglichen Sicherungen`,
    rightsWords: ["Auskunft", "berichtigen", "löschen", "einschränken", "widersprechen", "widerrufen", "Datenübertragbarkeit"],
  },
};
const NAIH = ["Nemzeti Adatvédelmi és Információszabadság Hatóság", "NAIH", "1055 Budapest, Falk Miksa utca 9-11.", "1363 Budapest, Pf. 9.", "ugyfelszolgalat@naih.hu", "+36 1 391 1400", "www.naih.hu"];
const PROCESSORS = ["Netlify, Inc.", "101 2nd Street, San Francisco, CA 94105", "Supabase Pte. Ltd.", "65 Chulia Street #38-02/03, OCBC Centre, Singapore 049513", "Resend", "Plus Five Five, Inc.", "Google Ireland Limited", "Gordon House, Barrow Street, Dublin 4"];

function checkRequired(l, html, where) {
  const R = REQUIRED[l]; const secs = sections(html);
  if (!secs) { bad(`${where}: nincs [data-privacy] törzs`); return null; }
  const find = (title) => secs.find((s) => s.title.startsWith(title));
  for (const k of ["controller", "messages", "registrations", "backups", "cookies", "map", "reviews", "processors", "rights", "complaint"]) if (!find(R[k])) bad(`${where}: hiányzó alcím „${R[k]}”`);
  for (const [k, n] of [["messages", MSG], ["registrations", REG]]) {
    const s = find(R[k]); if (!s) continue;
    for (const w of [R.purpose, R.basis, R.retention]) if (!s.text.includes(w)) bad(`${where} / ${R[k]}: hiányzik „${w}”`);
    if (!s.text.includes(R.days(n))) bad(`${where} / ${R[k]}: a megőrzés nem ${R.days(n)} (a maintenance.ts szerint) — szöveg: ${s.text.slice(0, 160)}`);
  }
  const other = find(R.messages)?.text ?? ""; if (other.includes(R.days(REG)) && REG !== MSG) bad(`${where}: az üzeneteknél a jelentkezés napszáma áll`);
  const back = find(R.backups); if (back && !back.text.includes(R.backupDays(BACK))) bad(`${where} / ${R.backups}: nem a ${BACK} mentés áll`);
  for (const k of ["cookies", "map", "reviews"]) { const s = find(R[k]); if (s && !s.text.toLowerCase().includes(R.basis.replace(":", "").toLowerCase())) bad(`${where} / ${R[k]}: nincs jogalap`); }
  const rights = find(R.rights); for (const w of R.rightsWords) if (rights && !rights.text.includes(w)) bad(`${where} / ${R.rights}: hiányzik „${w}”`);
  const complaint = find(R.complaint); for (const w of NAIH) if (complaint && !complaint.text.includes(w)) bad(`${where} / ${R.complaint}: hiányzik „${w}”`);
  const proc = find(R.processors); for (const w of PROCESSORS.slice(0, 4)) if (proc && !proc.text.includes(w)) bad(`${where} / ${R.processors}: hiányzik „${w}”`);
  const all = secs.map((s) => `${s.title} ${s.text}`).join(" ");
  for (const w of PROCESSORS.slice(4)) if (!all.includes(w)) bad(`${where}: hiányzik „${w}”`);
  const left = all.match(/\{\{\s*\w+\s*\}\}/g); if (left) bad(`${where}: kitöltetlen jelölő: ${left.join(", ")}`);
  if (/A jelentkezéseket az esemény után töröljük|Registrations are deleted after the event|Anmeldungen werden nach der Veranstaltung gelöscht/.test(all)) bad(`${where}: a régi, kód nélküli ígéret`);
  return { secs, find };
}

try {
  /* ---------- B) kötelező részek, a mag tartalmával ---------- */
  for (const l of ["hu", "en", "de"]) {
    const r = await page(LP[l]);
    if (r.status !== 200) { bad(`${LP[l]} → HTTP ${r.status}`); continue; }
    const res = checkRequired(l, r.html, LP[l]);
    if (res) {
      const c = res.find(REQUIRED[l].controller);
      const imp = seed.legal.imprint;
      for (const v of [imp.operator, imp.person, imp.address, imp.email]) if (v && !c?.text.includes(v)) bad(`${LP[l]}: az adatkezelőnél nem látszik az impresszum mezője: ${v}`);
      console.log(`B) ${LP[l]}: ${res.secs.length - 1} alcím, kötelező részek megvannak (jelentkezés ${REG} nap, üzenet ${MSG} nap, mentés ${BACK})`);
    }
  }
  /* Kontroll: a kötelező-rész ellenőrzés egy hiányos lapon tényleg jelez. */
  const before = problems.length;
  checkRequired("hu", `<div data-privacy><h2>Az adatkezelő</h2><p>x</p><h2>Kapcsolati üzenet</h2><li>Cél: x</li><li>Megőrzés: 30 nappal</li></div></main>`, "kontroll");
  const flagged = problems.length - before; problems.splice(before);
  if (flagged < 10) bad(`önteszt: a hiányos kontroll-lapon csak ${flagged} hibát jelzett`);
  console.log(`B) kontroll: a hiányos lapon ${flagged} hibát jelez`);

  /* ---------- C) adatkezelő az impresszum mezőiből ---------- */
  const probe = { operator: "P4 Próba Üzemeltető Egyesület", person: "P4 Képviselő Anna", address: "9999 Próbafalva, Teszt utca 4.", email: "p4-adatkezelo@example.com", phone: "+36 1 555 0404", taxId: "", regNo: "P4-NYT-0404", hosting: base.legal.imprint.hosting };
  const pre = await page(LP.hu);
  if (pre.html.includes(probe.operator) || pre.html.includes(probe.email)) bad("kontroll: a próbaadat már a módosítás előtt a lapon volt");
  await writeSite({ ...base, legal: { ...base.legal, imprint: probe } });
  const LABEL_TAX = { hu: "Adószám", en: "Tax number", de: "Steuernummer" }, LABEL_REG = { hu: "Nyilvántartási szám", en: "Registration number", de: "Registernummer" };
  for (const l of ["hu", "en", "de"]) {
    const r = await page(LP[l]); const c = sections(r.html)?.find((s) => s.title.startsWith(REQUIRED[l].controller));
    if (!c) { bad(`${LP[l]}: nincs adatkezelő-szakasz`); continue; }
    for (const v of [probe.operator, probe.person, probe.address, probe.email, probe.phone, probe.regNo]) if (!c.text.includes(v)) bad(`${LP[l]}: az adatkezelőnél nem látszik „${v}”`);
    if (!c.text.includes(`${LABEL_REG[l]}: ${probe.regNo}`)) bad(`${LP[l]}: a nyilvántartási szám nem a saját címkéjével áll`);
    if (c.text.includes(LABEL_TAX[l])) bad(`${LP[l]}: az üres adószám címkéje megjelent`);
    if (!sections(r.html).some((s) => s.text.includes(`${probe.email}`) && s.title.startsWith(REQUIRED[l].rights))) bad(`${LP[l]}: a jogoknál nem az impresszum e-mail-címe áll`);
  }
  console.log("C) az impresszum próbaadatai (név, képviselő, cím, e-mail, telefon, nyilvántartási szám) mindhárom nyelven az adatkezelőnél; az üres adószám nem látszik");
  const empty = { operator: "", person: "", address: "", email: "", phone: "", taxId: "", regNo: "", hosting: "" };
  await writeSite({ ...base, legal: { ...base.legal, imprint: empty } });
  const NEUTRAL = { hu: "Az adatkezelő adatai még nincsenek megadva.", en: "The controller's details have not been provided yet.", de: "Die Angaben zum Verantwortlichen sind noch nicht hinterlegt." };
  for (const l of ["hu", "en", "de"]) {
    const r = await page(LP[l]); const c = sections(r.html)?.find((s) => s.title.startsWith(REQUIRED[l].controller));
    if (!c?.text.includes(NEUTRAL[l])) bad(`${LP[l]}: üres impresszumnál nincs semleges mondat (${c?.text.slice(0, 120)})`);
    if (c && /:\s*$|Gyűrűsi Ménes|Vörös József/.test(c.text.split(".")[0])) bad(`${LP[l]}: üres impresszumnál is adatot mutat: ${c.text.slice(0, 120)}`);
    if (sections(r.html).some((s) => s.title.startsWith(REQUIRED[l].rights) && !s.text.includes(base.contact.email))) bad(`${LP[l]}: üres impresszum-e-mail mellett a jogoknál nem a kapcsolati e-mail áll`);
  }
  console.log("C) üres impresszum: semleges mondat mindhárom nyelven, a kérések címe a kapcsolati e-mail");

  /* ---------- D) régi tár: változatlan régi szöveg → új sablon; átírt régi szöveg → marad ---------- */
  const OLD = {
    hu: "Ez a tájékoztató arról szól, milyen adatokat kezel a gyurusimenes.hu, és miért.\n\nKapcsolati űrlap: a neved, e-mail-címed, telefonszámod (ha megadod) és az üzeneted csak azért kell, hogy válaszolni tudjunk. Az üzenet e-mailben érkezik hozzánk, és a weboldal adminfelületén is megőrizzük, amíg az ügy le nem zárul.\n\nJelentkezés eseményre: a neved, telefonszámod, a létszám és a megjegyzésed az igényfelméréshez kell; telefonon keresünk. Ha e-mail-címet adsz meg, visszaigazolást küldünk rá. A jelentkezéseket az esemény után töröljük.\n\nSütik: az oldal egyetlen sütit használ, amely a választott nyelvet jegyzi meg egy évig. Nincs látogatottságmérés, nincs hirdetési követés.\n\nTérkép: a kapcsolat alatti Google Térkép csak akkor töltődik be, ha a „Térkép betöltése” gombra kattintasz; ekkor a Google saját sütiket helyezhet el és adatokat kezelhet a saját adatvédelmi tájékoztatója szerint.\n\nTárhely: az oldalt a Netlify szolgáltatja; az adatok az ő szerverein tárolódnak.\n\nJogaid: kérheted az adataid törlését vagy módosítását az info@gyurusimenes.hu címen.",
    en: "This notice explains what data gyurusimenes.hu processes, and why.\n\nContact form: your name, e-mail address, phone number (if given) and message are used only to reply to you. The message reaches us by e-mail and is kept in the website's admin area until the matter is closed.\n\nEvent registration: your name, phone number, the number of people and your note are needed for the survey of interest; we call you. If you give an e-mail address, we send a confirmation to it. Registrations are deleted after the event.\n\nCookies: the site uses a single cookie, which remembers your chosen language for one year. There is no traffic measurement and no advertising tracking.\n\nMap: the Google Map below the contact section loads only when you click “Load map”; Google may then set its own cookies and process data under its own privacy policy.\n\nHosting: the site is served by Netlify; data is stored on their servers.\n\nYour rights: you can ask for your data to be deleted or corrected at info@gyurusimenes.hu.",
    de: "Diese Hinweise erklären, welche Daten gyurusimenes.hu verarbeitet und warum.\n\nKontaktformular: Name, E-Mail-Adresse, Telefonnummer (falls angegeben) und Nachricht dienen ausschließlich der Beantwortung. Die Nachricht erreicht uns per E-Mail und wird im Adminbereich der Website aufbewahrt, bis die Anfrage erledigt ist.\n\nAnmeldung zu Veranstaltungen: Name, Telefonnummer, Personenzahl und Anmerkung werden für die Bedarfsabfrage benötigt; wir rufen Sie an. Wenn Sie eine E-Mail-Adresse angeben, senden wir eine Bestätigung. Anmeldungen werden nach der Veranstaltung gelöscht.\n\nCookies: Die Website verwendet ein einziges Cookie, das die gewählte Sprache ein Jahr lang speichert. Es gibt keine Reichweitenmessung und kein Werbe-Tracking.\n\nKarte: Die Google-Karte unter dem Kontaktbereich wird erst geladen, wenn Sie auf „Karte laden“ klicken; Google kann dann eigene Cookies setzen und Daten gemäß seiner eigenen Datenschutzerklärung verarbeiten.\n\nHosting: Die Website wird von Netlify bereitgestellt; die Daten werden auf deren Servern gespeichert.\n\nIhre Rechte: Sie können die Löschung oder Berichtigung Ihrer Daten unter info@gyurusimenes.hu verlangen.",
  };
  await writeSite({ ...base, legal: { ...base.legal, privacy: OLD } });
  const migrated = await page(LP.hu);
  if (/A jelentkezéseket az esemény után töröljük/.test(migrated.html) || !sections(migrated.html)?.some((s) => s.title === REQUIRED.hu.processors.concat(" és más címzettek"))) bad("D) a változatlan régi szöveg nem cserélődött az új sablonra");
  const edited = { ...OLD, hu: `${OLD.hu}\n\nP4 átírt bekezdés.` };
  await writeSite({ ...base, legal: { ...base.legal, privacy: edited } });
  const kept = await page(LP.hu);
  if (!kept.html.includes("P4 átírt bekezdés.")) bad("D) kontroll: az átírt régi szöveg nem maradt meg (a csere túl mohó)");
  console.log("D) régi tár: a változatlan régi szöveg helyén az új sablon; az átírt régi szöveg megmarad (kontroll)");
  await writeSite(base);

  /* ---------- E) a szöveg ígéretei a kódban ---------- */
  for (const p of ["/", "/en", "/de", "/turak", "/adatkezeles", "/esemenyek"]) {
    const r = await page(p);
    const sc = r.headers.getSetCookie?.() ?? [];
    if (r.status !== 200) bad(`E) ${p} → HTTP ${r.status}`);
    if (sc.length) bad(`E) ${p}: a látogató sütit kap: ${sc.join(" | ")}`);
  }
  const ls = await src("src/components/site/LangSwitch.tsx");
  if (!/max-age=31536000/.test(ls) || (ls.match(/document\.cookie\s*=/g) ?? []).length !== 1) bad("E) a nyelvi süti nem egyetlen, egyéves süti a LangSwitch-ben");
  if (!/onClick=\{\(\) => \{ remember\(l\)/.test(ls)) bad("E) a nyelvi süti nem kattintásra állítódik");
  const cookieMatches = [...(await Promise.all(["src/app", "src/components", "src/lib", "src/proxy.ts"].map(async (p) => {
    const st = await fs.stat(path.join(ROOT, p)); if (!st.isDirectory()) return [[p, await src(p)]];
    const files = []; const walk = async (d) => { for (const e of await fs.readdir(path.join(ROOT, d), { withFileTypes: true })) { const q = path.join(d, e.name); if (e.isDirectory()) await walk(q); else if (/\.tsx?$/.test(e.name)) files.push([q, await src(q)]); } };
    await walk(p); return files;
  }))).flat()].filter(([, s]) => /document\.cookie\s*=|cookies\(\)\)?\.set\(|\.cookies\.set\(|Set-Cookie/i.test(s)).map(([p]) => p);
  const allowed = ["src/components/site/LangSwitch.tsx", "src/app/[lang]/admin/auth-actions.ts"];
  if (!cookieMatches.includes("src/app/[lang]/admin/auth-actions.ts")) bad("E) önteszt: a süti-állító minta a belépési akciót sem találja");
  const unexpected = cookieMatches.filter((p) => !allowed.includes(p));
  if (unexpected.length) bad(`E) sütit állító kód a nyelvi és a belépési sütin kívül: ${unexpected.join(", ")}`);
  if (cookieDays !== "30") bad(`E) a belépési süti a kódban ${cookieDays} napos, a szövegben 30`);
  const map = await src("src/components/site/MapEmbed.tsx");
  if (!/useState\(false\)/.test(map) || !/\{on \? \(\s*<iframe/.test(map)) bad("E) a térkép nem kattintásra töltődik (MapEmbed)");
  const rl = await src("src/lib/ratelimit.ts");
  if (!/createHash\("sha256"\)\.update\(\(await salt\(\)\) \+ clientIp\(req\)\)/.test(rl)) bad("E) a sebességkorlát kulcsa nem az IP sózott hash-e");
  console.log(`E) a látogató 6 lapon nem kap sütit; sütit csak ${cookieMatches.join(" és ")} állít; belépési süti ${cookieDays} nap; térkép kattintásra; IP helyett sózott hash`);
} finally {
  await srv.stop?.();
  await fs.rm(dir, { recursive: true, force: true });
}

if (problems.length) { for (const p of problems) console.error("FAIL:", p); console.error(`FAIL: p4-privacy — ${problems.length} hiba`); process.exit(1); }
console.log("PASS: p4-privacy");
