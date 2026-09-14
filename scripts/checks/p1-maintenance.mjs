/**
 * G17 — automatikus karbantartás, mentés, ütemezett függvény, tartós sebességkorlát.
 * Használat: node scripts/checks/p1-maintenance.mjs   (előtte: npm run build)
 *  A) fájl-driver (next start :3012, elszigetelt DATA_DIR): 40 napja véget ért esemény 3 jelentkezéssel, 10 napja véget ért
 *     esemény 2 jelentkezéssel, egy törölt esemény régi és friss jelentkezése, 2 db 365 napnál régebbi és 2 friss üzenet,
 *     32 régi napi mentés → POST /api/admin/maintenance → a lejártak törölve, a frissek megvannak; 30 mentés maradt, köztük
 *     a mai (a dokumentummal és a megmaradt rekordokkal); GET /api/admin/backup → letölthető JSON; alkalmi futás az
 *     /admin/uzenetek betöltésekor: egy órán belül nem, egy óra után igen; ADMIN_USER+ADMIN_PASSWORD mellett az /api/admin/*
 *     hitelesítés nélkül 401, rossz jelszóval 401, jóval 200.
 *  B) netlify/functions/daily-maintenance.mts: schedule "@daily"; a függvény SIMA Node-ban (Next nélkül) betöltve, a Blobs-
 *     szimulátor ellen ugyanezt elvégzi (törlés, mai mentés a „backups” tárban, 30 megtartva, lejárt korlát-bejegyzés törölve).
 *  C) tartós sebességkorlát a Blobs-szimulátorral: jelentkezés → szerver-újraindítás → ugyanarról az IP-ről 10 s-on belül 429,
 *     másik IP-ről 200; a tárban csak IP-hash. Kontroll: fájl-driveren (memória) újraindítás után ugyanez 200.
 * A végén npm run db:reset. Csak ha minden állítás teljesült: PASS: p1-maintenance
 */
import fs from "node:fs/promises";
import path from "node:path";
import { CheckError, ROOT, assert, blobsAdapter, budapestDay, dayOffset, dbReset, fileAdapter, fixtureEvent, minusDays, readSeed, runTsModule, startBlobs, startNext, tmpDir } from "./_p1-harness.mjs";

const log = (...a) => console.log(...a);
const cleanups = [];
const NOW = Date.now();
const iso = (daysAgo) => new Date(NOW - daysAgo * 864e5).toISOString();
const TODAY = budapestDay(new Date(NOW));
const TODAY_FILE = `${TODAY}.json`;
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

function fixtures() {
  const doc = readSeed();
  delete doc.registrations; delete doc.messages;
  doc.events = [
    fixtureEvent("p1-old", { date: dayOffset(-41), endDate: dayOffset(-40), registration: true }),
    fixtureEvent("p1-recent", { date: dayOffset(-12), endDate: dayOffset(-10), registration: true }),
    fixtureEvent("p1-open", { date: dayOffset(20), registration: true }),
    ...doc.events,
  ];
  const reg = (id, eventId, daysAgo) => ({ id, eventId, name: `P1 ${id}`, phone: "+36 30 555 0000", count: 2, receivedAt: iso(daysAgo) });
  const msg = (id, daysAgo) => ({ id, name: `P1 ${id}`, email: `${id}@example.com`, message: "P1 karbantartási teszt.", receivedAt: iso(daysAgo), read: false });
  return {
    doc,
    registrations: [reg("p1-old-1", "p1-old", 45), reg("p1-old-2", "p1-old", 44), reg("p1-old-3", "p1-old", 43), reg("p1-recent-1", "p1-recent", 15), reg("p1-recent-2", "p1-recent", 14), reg("p1-orphan-old", "p1-torolt", 40), reg("p1-orphan-new", "p1-torolt", 5)],
    messages: [msg("p1-msg-old-1", 400), msg("p1-msg-old-2", 380), msg("p1-msg-new-1", 10), msg("p1-msg-new-2", 3)],
    backups: Array.from({ length: 32 }, (_, i) => `${minusDays(TODAY, i + 1)}.json`),
  };
}
const EXPECT = {
  regsKept: ["p1-recent-1", "p1-recent-2", "p1-orphan-new"], regsGone: ["p1-old-1", "p1-old-2", "p1-old-3", "p1-orphan-old"],
  msgsKept: ["p1-msg-new-1", "p1-msg-new-2"], msgsGone: ["p1-msg-old-1", "p1-msg-old-2"],
  backupsKept: [TODAY_FILE, ...Array.from({ length: 29 }, (_, i) => `${minusDays(TODAY, i + 1)}.json`)],
  backupsGone: [30, 31, 32].map((n) => `${minusDays(TODAY, n)}.json`),
};

async function load(ad, fx) {
  await ad.writeDoc(fx.doc);
  for (const r of fx.registrations) await ad.putRecord("registrations", r);
  for (const m of fx.messages) await ad.putRecord("messages", m);
  for (const b of fx.backups) await ad.putBackup(b, { format: "gyurusi-menes-backup", version: 1, createdAt: `${b.slice(0, 10)}T00:00:00.000Z`, fixture: true });
  /* Pozitív kontroll: a törlendők tényleg ott vannak (különben a „törölve” állítás semmit nem mérne). */
  assert((await ad.records("registrations")).length === 7 && (await ad.records("messages")).length === 4 && (await ad.backups()).length === 32 && !(await ad.backups()).includes(TODAY_FILE), `${ad.label}: a fixture nem töltődött be`);
}

async function assertAfter(ad, report) {
  const regIds = (await ad.records("registrations")).map((r) => r.id), msgIds = (await ad.records("messages")).map((m) => m.id);
  assert(same(regIds, EXPECT.regsKept), `${ad.label}: megmaradt jelentkezések: ${regIds.join(", ")} — várt: ${EXPECT.regsKept.join(", ")}`);
  assert(same(msgIds, EXPECT.msgsKept), `${ad.label}: megmaradt üzenetek: ${msgIds.join(", ")} — várt: ${EXPECT.msgsKept.join(", ")}`);
  const names = await ad.backups();
  assert(names.length === 30, `${ad.label}: ${names.length} mentés maradt (30 várt)`);
  assert(same(names, EXPECT.backupsKept), `${ad.label}: nem a legújabb 30 mentés maradt: hiányzik ${EXPECT.backupsKept.filter((n) => !names.includes(n)).join(", ")}`);
  const today = await ad.readBackup(TODAY_FILE);
  assert(today?.format === "gyurusi-menes-backup" && !today.fixture && today.site?.pages && Object.keys(today.site.pages).length === 5 && today.site.events.some((e) => e.id === "p1-recent"), `${ad.label}: a mai mentés nem a tartalomdokumentumot tartalmazza`);
  assert(same(today.registrations.map((r) => r.id), EXPECT.regsKept) && same(today.messages.map((m) => m.id), EXPECT.msgsKept), `${ad.label}: a mai mentés rekordjai nem egyeznek (a törlés után kell készülnie)`);
  assert(report.registrationsDeleted === 4 && report.messagesDeleted === 2 && report.backupsDeleted === 3 && report.backup?.name === TODAY_FILE && report.backup?.created === true, `${ad.label}: a futás jelentése nem egyezik: ${JSON.stringify(report)}`);
}

const register = (base, ip) => fetch(`${base}/api/register`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ eventId: "p1-open", name: "P1 Korlát Teszt", phone: "+36 30 555 7777", count: "1", lang: "hu" }) });

let passed = false;
try {
  /* ---------------- A) fájl-driver ---------------- */
  log("A) fájl-driver (next start :3012, elszigetelt DATA_DIR)");
  const dirA = await tmpDir("p1-maint-fajl-");
  cleanups.push(() => fs.rm(dirA, { recursive: true, force: true }));
  const fa = fileAdapter(dirA);
  await load(fa, fixtures());
  let srv = await startNext({ port: 3012, env: { DATA_DIR: dirA }, label: "fájl" });
  cleanups.push(() => srv.stop());

  const run = await fetch(`${srv.base}/api/admin/maintenance`, { method: "POST" });
  const runJson = await run.json().catch(() => null);
  assert(run.status === 200 && runJson?.ok === true, `POST /api/admin/maintenance → ${run.status} ${JSON.stringify(runJson)}`);
  await assertAfter(fa, runJson.report);
  log(`  A1: karbantartás: 4 lejárt jelentkezés (40 napja véget ért esemény + törölt esemény régi tétele) és 2 régi üzenet törölve, a frissek megvannak; 30 mentés maradt, a mai (${TODAY_FILE}) létrejött`);

  const dl = await fetch(`${srv.base}/api/admin/backup`);
  const cd = dl.headers.get("content-disposition") ?? "";
  assert(dl.status === 200 && /application\/json/.test(dl.headers.get("content-type") ?? "") && /^attachment; filename="gyurusi-menes-mentes-\d{4}-\d{2}-\d{2}\.json"$/.test(cd) && /no-store/.test(dl.headers.get("cache-control") ?? ""), `GET /api/admin/backup → ${dl.status}, ${dl.headers.get("content-type")}, „${cd}”`);
  const bk = await dl.json();
  assert(bk.format === "gyurusi-menes-backup" && Object.keys(bk.site?.pages ?? {}).length === 5 && bk.site.events.some((e) => e.id === "p1-open") && same(bk.registrations.map((r) => r.id), EXPECT.regsKept) && same(bk.messages.map((m) => m.id), EXPECT.msgsKept), "a letöltött mentésből hiányzik a dokumentum vagy a rekordok");
  const homeHtml = await (await fetch(`${srv.base}/admin`)).text();
  assert(/href="\/api\/admin\/backup"[^>]*data-backup-download|data-backup-download[^>]*href="\/api\/admin\/backup"/.test(homeHtml) && homeHtml.includes("Mentés letöltése"), "az admin kezdőlapján nincs „Mentés letöltése” gomb");
  log(`  A2: GET /api/admin/backup → JSON-letöltés (${cd}); az admin kezdőlapján „Mentés letöltése” gomb`);

  /* Alkalmi futás: az imént futott → egy órán belül az /admin/uzenetek nem futtatja újra; egy órával korábbi időbélyeggel igen. */
  await fa.putRecord("messages", { id: "p1-msg-old-3", name: "P1 p1-msg-old-3", email: "old3@example.com", message: "P1 karbantartási teszt.", receivedAt: iso(500), read: false });
  let page = await fetch(`${srv.base}/admin/uzenetek`);
  let html = await page.text();
  assert(page.status === 200 && html.includes('data-message="p1-msg-old-3"') && (await fa.records("messages")).some((m) => m.id === "p1-msg-old-3"), "alkalmi futás: egy órán belül újra lefutott (a friss lejárt üzenet eltűnt)");
  await fs.writeFile(path.join(dirA, "maintenance.json"), JSON.stringify({ at: iso(2 / 24) }));
  page = await fetch(`${srv.base}/admin/uzenetek`);
  html = await page.text();
  const lastRun = JSON.parse(await fs.readFile(path.join(dirA, "maintenance.json"), "utf8"));
  assert(page.status === 200 && !html.includes('data-message="p1-msg-old-3"') && !(await fa.records("messages")).some((m) => m.id === "p1-msg-old-3") && NOW - Date.parse(lastRun.at) < 10 * 60e3 + (Date.now() - NOW), "alkalmi futás: egy óra után az /admin/uzenetek betöltése nem futtatta a karbantartást");
  log("  A3: alkalmi futás az /admin/uzenetek betöltésekor: egy órán belül nem ismétlődik, egy óra után lefut");
  await srv.stop();

  const USER = "p1admin", PASS = "p1:jelszó-ű";
  srv = await startNext({ port: 3012, env: { DATA_DIR: dirA, ADMIN_USER: USER, ADMIN_PASSWORD: PASS }, label: "fájl+jelszó" });
  const basic = (u, p) => ({ authorization: `Basic ${Buffer.from(`${u}:${p}`).toString("base64")}` });
  const codes = {
    backupNone: (await fetch(`${srv.base}/api/admin/backup`)).status,
    maintNone: (await fetch(`${srv.base}/api/admin/maintenance`, { method: "POST" })).status,
    backupWrong: (await fetch(`${srv.base}/api/admin/backup`, { headers: basic(USER, "rossz") })).status,
    maintWrong: (await fetch(`${srv.base}/api/admin/maintenance`, { method: "POST", headers: basic(USER, "p1") })).status,
    adminNone: (await fetch(`${srv.base}/admin`, { redirect: "manual" })).status,
    backupOk: (await fetch(`${srv.base}/api/admin/backup`, { headers: basic(USER, PASS) })).status,
    maintOk: (await fetch(`${srv.base}/api/admin/maintenance`, { method: "POST", headers: basic(USER, PASS) })).status,
    adminOk: (await fetch(`${srv.base}/admin`, { headers: basic(USER, PASS), redirect: "manual" })).status,
  };
  assert(codes.backupNone === 401 && codes.maintNone === 401 && codes.backupWrong === 401 && codes.maintWrong === 401 && codes.adminNone === 401, `jelszó mellett hitelesítés nélkül/rossz jelszóval nem 401: ${JSON.stringify(codes)}`);
  assert(codes.backupOk === 200 && codes.maintOk === 200 && codes.adminOk === 200, `jó jelszóval nem 200: ${JSON.stringify(codes)}`);
  log(`  A4: ADMIN_USER+ADMIN_PASSWORD mellett /api/admin/backup és /maintenance: nélküle 401, rossz jelszóval 401, jóval 200 (a proxy /admin-ja ugyanígy) ${JSON.stringify(codes)}`);
  await srv.stop();

  /* ---------------- B) ütemezett Netlify-függvény, Next nélkül, Blobs ellen ---------------- */
  log("B) netlify/functions/daily-maintenance.mts — sima Node-ban, Blobs-szimulátor ellen");
  const fnFile = "netlify/functions/daily-maintenance.mts";
  const src = await fs.readFile(path.join(ROOT, fnFile), "utf8");
  assert(/export\s+const\s+config\s*=\s*\{\s*schedule:\s*"@daily"\s*\}/.test(src) && /export\s+default\s+async\s+function/.test(src), `${fnFile}: nincs export default függvény vagy config = { schedule: "@daily" }`);
  const blobs = await startBlobs();
  cleanups.push(() => blobs.stop());
  const ba = blobsAdapter(blobs);
  await load(ba, fixtures());
  const rl = blobs.store("ratelimit");
  await rl.setJSON(`register-${"0".repeat(24)}`, { hits: [NOW - 3600e3], exp: NOW - 3590e3 });
  await rl.setJSON(`contact-${"f".repeat(24)}`, { hits: [NOW], exp: NOW + 3600e3 });
  const dirB = await tmpDir("p1-maint-fn-");
  cleanups.push(() => fs.rm(dirB, { recursive: true, force: true }));
  const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(NETLIFY|DATA_DIR|RATELIMIT_SALT)/.test(k)));
  const out = await runTsModule(fnFile, `if (m.config?.schedule !== "@daily") { console.log("CONFIG-HIBA"); process.exit(3); } const r = await m.default(new Request("http://localhost/.netlify/functions/daily-maintenance", { method: "POST", body: "{}" })); console.log("REPORT " + await r.text());`,
    { ...cleanEnv, NETLIFY_BLOBS_CONTEXT: blobs.context, DATA_DIR: dirB });
  const line = (out.stdout ?? "").split("\n").find((l) => l.startsWith("REPORT "));
  assert(out.status === 0 && line, `a függvény sima Node-ban nem futott le (kilépés ${out.status}): ${(out.stderr || out.stdout || "").slice(-1500)}`);
  const fnReport = JSON.parse(line.slice(7));
  await assertAfter(ba, fnReport);
  const rlKeys = (await rl.list()).blobs.map((b) => b.key);
  assert(fnReport.rateLimitsPruned === 1 && !rlKeys.includes(`register-${"0".repeat(24)}`) && rlKeys.includes(`contact-${"f".repeat(24)}`), `a lejárt sebességkorlát-bejegyzés takarítása hibás: ${JSON.stringify(fnReport)} / ${rlKeys.join(",")}`);
  assert((await fs.readdir(dirB)).length === 0, "a függvény a fájl-driverre írt, nem a Blobs-ra");
  log(`  B: schedule "@daily"; a függvény Next nélkül betöltve a Blobs ellen: 4 jelentkezés + 2 üzenet törölve, mai mentés a „backups” tárban, 30 megtartva, 1 lejárt korlát-bejegyzés törölve (${fnReport.ms} ms)`);

  /* ---------------- C) tartós sebességkorlát ---------------- */
  log("C) tartós sebességkorlát (Blobs-szimulátor), újraindítással");
  const dirC = await tmpDir("p1-maint-rl-");
  cleanups.push(() => fs.rm(dirC, { recursive: true, force: true }));
  const envB = { NETLIFY_BLOBS_CONTEXT: blobs.context, DATA_DIR: dirC };
  srv = await startNext({ port: 3012, env: envB, label: "blobs-1" });
  const t0 = Date.now();
  const r1 = await register(srv.base, "203.0.113.50");
  const r1j = await r1.json().catch(() => null);
  assert(r1.status === 200 && r1j?.stored === true, `első jelentkezés → ${r1.status} ${JSON.stringify(r1j)}`);
  await srv.stop();
  srv = await startNext({ port: 3012, env: envB, label: "blobs-2" });
  const r2 = await register(srv.base, "203.0.113.50");
  const elapsed = Date.now() - t0;
  assert(elapsed < 9500, `nem mérhető: az újraindítás ${elapsed} ms-ig tartott, a 10 s-os ablak lejárt volna`);
  const r2j = await r2.json().catch(() => null);
  assert(r2.status === 429 && r2j?.ok === false && typeof r2j.error === "string", `újraindítás után ugyanarról az IP-ről (${elapsed} ms) → ${r2.status} ${JSON.stringify(r2j)} — 429 várt`);
  const r3 = await register(srv.base, "203.0.113.51");
  assert(r3.status === 200, `másik IP-ről → ${r3.status} (200 várt)`);
  const keys = (await rl.list()).blobs.map((b) => b.key);
  const regKeys = keys.filter((k) => /^register-[0-9a-f]{24}$/.test(k));
  assert(regKeys.length >= 2 && keys.includes("_salt"), `a „ratelimit” tár kulcsai: ${keys.join(", ")}`);
  for (const k of keys) assert(!k.includes("203.0.113") && !(await rl.get(k, { type: "text" })).includes("203.0.113"), `nyers IP a sebességkorlát tárában: ${k}`);
  log(`  C1: jelentkezés → újraindítás → ugyanarról az IP-ről ${elapsed} ms után 429, másik IP-ről 200; a tárban ${regKeys.length} IP-hash kulcs, nyers IP nincs`);
  await srv.stop();
  assert((await fs.readdir(dirC)).length === 0, "a Blobs-futás a fájl-driverre is írt");

  /* Kontroll: memóriában (fájl-driver) az újraindítás elviszi a korlátot — a C1-es 429-et tehát a tartós tár adta. */
  await fileAdapter(dirC).writeDoc(fixtures().doc);
  srv = await startNext({ port: 3012, env: { DATA_DIR: dirC }, label: "fájl-kontroll-1" });
  const t1 = Date.now();
  const c1 = (await register(srv.base, "203.0.113.60")).status, c2 = (await register(srv.base, "203.0.113.60")).status;
  await srv.stop();
  srv = await startNext({ port: 3012, env: { DATA_DIR: dirC }, label: "fájl-kontroll-2" });
  const c3 = (await register(srv.base, "203.0.113.60")).status;
  const elapsed2 = Date.now() - t1;
  await srv.stop();
  assert(c1 === 200 && c2 === 429, `kontroll: a memóriabeli korlát sem működik (${c1}, ${c2})`);
  assert(elapsed2 < 9500 && c3 === 200, `kontroll: memóriában az újraindítás után ${c3} (${elapsed2} ms) — 200 várt`);
  log(`  C2 kontroll: fájl-driveren (memória) 200 → 429, újraindítás után (${elapsed2} ms) 200`);
  passed = true;
} catch (e) {
  console.error(e instanceof CheckError ? `FAIL: ${e.message}` : `FAIL: váratlan hiba: ${e?.stack ?? e}`);
} finally {
  for (const c of cleanups.reverse()) { try { await c(); } catch { /* takarítás */ } }
  dbReset();
}
if (passed) console.log("PASS: p1-maintenance");
process.exit(passed ? 0 : 1);
