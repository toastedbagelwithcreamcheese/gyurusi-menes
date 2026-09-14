/**
 * G16 — adatbiztonság egyidejű íráskor. Használat: node scripts/checks/p1-data.mjs   (előtte: npm run build)
 * Mindkét driveren (fájl, és helyi Supabase két szerverpéldánnyal, mint a Netlify-függvények):
 *  1. 30 egyidejű jelentkezés (különböző x-forwarded-for) + 10 üzenet → mind 200, és mind külön kulcson eltárolva;
 *  2. 10 párhuzamos admin-mentés: 10 böngészőlap egyszerre ment 5 aloldal-címet és 5 esemény-címet szerver-akcióval
 *     → mind a 10 változás megmaradt. Supabase-en azt is mérjük, hogy tényleg volt ütközés (a feltételes frissítés üres választ
 *     kapott, mert a version közben változott), és hogy a dokumentumba egyetlen írás sem ment feltétel nélkül;
 *  3. migráció: a dokumentumba ágyazott régi tömbök listázáskor átkerülnek (egy tétel már korábban átmásolva,
 *     egy használhatatlan azonosítóval), több egyidejű listázás után sincs duplikáció, a tömbök kiürülnek.
 * Kontroll: ugyanezen az előtéten 10 feltétel nélküli olvas-módosít-ír (kv tábla) elveszít frissítéseket — a mérés látja a veszteséget.
 * Elszigetelt DATA_DIR-ben fut; a végén npm run db:reset. Csak ha minden állítás teljesült: PASS: p1-data
 */
import fs from "node:fs/promises";
import { chromium } from "playwright-core";
import { CheckError, assert, chromeExe, dayOffset, dbReset, fileAdapter, fixtureEvent, freePort, readSeed, startNext, startSupabase, supabaseAdapter, tmpDir } from "./_p1-harness.mjs";

const RUN = Date.now().toString(36);
const PAGE_KEYS = ["huculosveny", "turak", "oktatas", "taborok", "egyesulet"];
const log = (...a) => console.log(...a);
const cleanups = [];

function initialDoc() {
  const doc = readSeed();
  delete doc.registrations; delete doc.messages;
  doc.events = [fixtureEvent("p1-open", { date: dayOffset(20), registration: true }), ...[1, 2, 3, 4, 5].map((i) => fixtureEvent(`p1-ev-${i}`, { date: dayOffset(30 + i) })), ...doc.events];
  return doc;
}

/* 1. ---------- 30 jelentkezés + 10 üzenet egyszerre ---------- */
async function submissions(ad, bases) {
  const net = ad.label === "fájl" ? 1 : 2;
  const post = (base, route, body, ip) => fetch(base + route, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body) })
    .then(async (r) => ({ route, ip, status: r.status, body: await r.json().catch(() => null) }));
  const jobs = [];
  for (let i = 0; i < 30; i++) jobs.push(post(bases[i % bases.length], "/api/register", { eventId: "p1-open", name: `P1 Jelentkező ${RUN} ${i}`, phone: `+36 30 555 ${1000 + i}`, count: String(1 + (i % 4)), lang: "hu" }, `198.18.${net}.${i + 1}`));
  for (let i = 0; i < 10; i++) jobs.push(post(bases[(i + 1) % bases.length], "/api/contact", { name: `P1 Üzenő ${RUN} ${i}`, email: `p1-${i}@example.com`, message: `Párhuzamos P1-teszt üzenet ${i} (${RUN}).`, page: "p1", lang: "hu" }, `198.19.${net}.${i + 1}`));
  const res = await Promise.all(jobs);
  const bad = res.filter((r) => r.status !== 200 || r.body?.ok !== true || r.body?.stored !== true);
  assert(bad.length === 0, `${ad.label}: ${bad.length}/40 beküldés nem kapott tárolt 200-at: ${JSON.stringify(bad.slice(0, 3))}`);

  const regs = (await ad.records("registrations")).filter((r) => r?.name?.startsWith(`P1 Jelentkező ${RUN} `));
  const msgs = (await ad.records("messages")).filter((m) => m?.name?.startsWith(`P1 Üzenő ${RUN} `));
  const uniq = (xs, f) => new Set(xs.map(f)).size;
  assert(regs.length === 30 && uniq(regs, (r) => r.name) === 30 && uniq(regs, (r) => r.id) === 30, `${ad.label}: ${regs.length} jelentkezés tárolva (${uniq(regs, (r) => r.name)} különböző név) — 30 várt`);
  assert(regs.every((r) => r.eventId === "p1-open" && Number.isInteger(r.count) && r.count >= 1 && r.receivedAt), `${ad.label}: hiányos jelentkezés-rekord`);
  assert(msgs.length === 10 && uniq(msgs, (m) => m.name) === 10 && msgs.every((m) => m.read === false && m.page === "p1"), `${ad.label}: ${msgs.length} üzenet tárolva — 10 várt`);
  const doc = await ad.readDoc();
  assert(!Array.isArray(doc.registrations) && !Array.isArray(doc.messages), `${ad.label}: a tartalomdokumentumba is került jelentkezés/üzenet-tömb`);
  log(`  1. ${ad.label}: 40/40 beküldés 200; 30/30 jelentkezés és 10/10 üzenet külön kulcson (${bases.length} szerverpéldány)`);
}

/* 2. ---------- 10 párhuzamos admin-mentés böngészőből ---------- */
async function parallelSaves(ad, bases, browser) {
  const targets = [
    ...PAGE_KEYS.map((k) => ({ path: `/admin/oldalak/${k}`, value: `P1 ${ad.label} aloldal ${k} ${RUN}`, read: (d) => d.pages?.[k]?.title?.hu })),
    ...[1, 2, 3, 4, 5].map((i) => ({ path: `/admin/esemenyek/p1-ev-${i}`, value: `P1 ${ad.label} esemény ${i} ${RUN}`, read: (d) => d.events?.find((e) => e.id === `p1-ev-${i}`)?.title?.hu })),
  ];
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, locale: "hu-HU" });
  try {
    const pages = await Promise.all(targets.map(async (t, i) => {
      const p = await ctx.newPage();
      const r = await p.goto(bases[i % bases.length] + t.path, { waitUntil: "networkidle" });
      assert(r && r.status() === 200, `${ad.label}: ${t.path} → ${r?.status()}`);
      await p.fill("#title\\.hu", t.value);
      return p;
    }));
    /* Minden lap egyszerre küldi el az űrlapját (requestSubmit: a React szerver-akciója fut, a kattintás várakozásai nélkül),
       így a szerver-akciók ugyanabban az ablakban olvassák és írják a dokumentumot. */
    await Promise.all(pages.map((p) => p.evaluate(() => document.getElementById("title.hu").form.requestSubmit())));
    await Promise.all(pages.map(async (p, i) => {
      try { await p.waitForURL(/[?&]ok=/, { timeout: 90_000 }); }
      catch { const flash = await p.locator("[data-flash]").first().innerText().catch(() => "—"); throw new CheckError(`${ad.label}: ${targets[i].path} mentése nem jelzett sikert (URL: ${p.url()}, sáv: ${flash})`); }
    }));
    const doc = await ad.readDoc();
    const lost = targets.filter((t) => t.read(doc) !== t.value);
    assert(lost.length === 0, `${ad.label}: a 10 párhuzamos mentésből ${lost.length} elveszett: ${lost.map((t) => `${t.path} = ${JSON.stringify(t.read(doc))}`).join("; ")}`);
  } finally { await ctx.close(); }
}

/* 3. ---------- Migráció a régi, dokumentumba ágyazott tömbökből ---------- */
async function migration(ad, bases) {
  const at = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  const legacyRegs = [1, 2, 3].map((i) => ({ id: `lg-${RUN}-r${i}`, eventId: "p1-open", name: `P1 Régi jelentkező ${RUN} ${i}`, phone: `+36 30 999 000${i}`, count: 2, receivedAt: at(i) }));
  const legacyMsgs = [
    { id: `lg-${RUN}-m1`, name: `P1 Régi üzenő ${RUN} 1`, email: "p1-regi1@example.com", message: "Régi üzenet a dokumentumból.", receivedAt: at(1), read: false },
    { id: `Régi azonosító #${RUN}`, name: `P1 Régi üzenő ${RUN} 2`, email: "p1-regi2@example.com", message: "Régi üzenet, használhatatlan azonosítóval.", receivedAt: at(2), read: true },
  ];
  /* Egy korábbi, félbeszakadt migráció már átmásolta a 3. jelentkezést: ebből nem lehet második példány. */
  await ad.putRecord("registrations", legacyRegs[2]);
  const doc = await ad.readDoc();
  doc.registrations = legacyRegs; doc.messages = legacyMsgs;
  await ad.writeDoc(doc);

  const regsBefore = await ad.records("registrations"), msgsBefore = await ad.records("messages");
  assert(!regsBefore.some((r) => r.id === legacyRegs[0].id) && !msgsBefore.some((m) => m.name === legacyMsgs[0].name), `${ad.label}: kontroll: a régi tételek már a listázás előtt a saját kulcsukon voltak`);
  assert(Array.isArray((await ad.readDoc()).registrations), `${ad.label}: kontroll: a régi tömb nincs a dokumentumban`);

  /* Listázás: több egyidejű lapbetöltés (Supabase-en mindkét példányon) — a párhuzamos migráció sem duplikálhat. */
  const loads = await Promise.all([...bases, ...bases].flatMap((b) => [fetch(`${b}/admin/jelentkezesek`), fetch(`${b}/admin/uzenetek`)]));
  assert(loads.every((r) => r.status === 200), `${ad.label}: admin-lista: ${loads.map((r) => r.status).join(",")}`);

  const regsAfter = await ad.records("registrations"), msgsAfter = await ad.records("messages");
  assert(regsAfter.length === regsBefore.length + 2, `${ad.label}: jelentkezések a migráció után: ${regsAfter.length}, várt ${regsBefore.length + 2} (duplikáció vagy veszteség)`);
  assert(msgsAfter.length === msgsBefore.length + 2, `${ad.label}: üzenetek a migráció után: ${msgsAfter.length}, várt ${msgsBefore.length + 2}`);
  for (const r of legacyRegs) assert(regsAfter.filter((x) => x.name === r.name).length === 1, `${ad.label}: „${r.name}” nem pontosan egyszer szerepel`);
  for (const m of legacyMsgs) assert(msgsAfter.filter((x) => x.name === m.name).length === 1, `${ad.label}: „${m.name}” nem pontosan egyszer szerepel`);
  const odd = msgsAfter.find((x) => x.name === legacyMsgs[1].name);
  assert(/^legacy-[0-9a-f]{20}$/.test(odd.id) && odd.read === true && odd.message === legacyMsgs[1].message, `${ad.label}: a használhatatlan azonosítójú régi üzenet rosszul került át: ${JSON.stringify(odd)}`);
  const docAfter = await ad.readDoc();
  assert(!(docAfter.registrations?.length) && !(docAfter.messages?.length), `${ad.label}: a régi tömbök nem ürültek ki a dokumentumból`);

  /* Az admin lapon is pontosan egyszer (a sor-attribútumot számoljuk — a lap RSC-adata a szöveget másodszor is tartalmazza). */
  const html = await (await fetch(`${bases[0]}/admin/jelentkezesek`)).text();
  for (const r of legacyRegs) assert(html.split(`data-registration-row="${r.id}"`).length - 1 === 1, `${ad.label}: az admin listában ${r.id} nem egyszer szerepel`);
  const mhtml = await (await fetch(`${bases[bases.length - 1]}/admin/uzenetek`)).text();
  assert(mhtml.split(`data-message="${odd.id}"`).length - 1 === 1, `${ad.label}: az üzenetlistában a régi üzenet nem egyszer szerepel`);
  /* Második kör: semmi nem változik. */
  await fetch(`${bases[0]}/admin/jelentkezesek`);
  assert((await ad.records("registrations")).length === regsAfter.length && (await ad.records("messages")).length === msgsAfter.length, `${ad.label}: az ismételt listázás megváltoztatta a rekordszámot`);
  log(`  3. ${ad.label}: 3 régi jelentkezés (1 már átmásolva) és 2 régi üzenet átkerült, duplikáció nélkül; a tömbök kiürültek`);
}

/* Kontroll: feltétel nélküli olvas-módosít-ír ugyanezen az előtéten veszít — tehát a fenti „mind megmaradt” mérés látná a hibát. */
async function lostUpdateControl(sb) {
  const key = "p1-control";
  await sb.api("POST", "/rest/v1/kv?on_conflict=key", { key, value: { fields: {} } }, "resolution=merge-duplicates,return=minimal");
  const h = { ...sb.headers, "content-type": "application/json" };
  await Promise.all(Array.from({ length: 10 }, async (_, i) => {
    /* Az előtéten át: az olvasás lassított, így a 10 író mind ugyanazt a régi értéket látja. */
    const cur = (await (await fetch(`${sb.proxyURL}/rest/v1/kv?key=eq.${key}&select=value`, { headers: h })).json())[0].value;
    cur.fields[`f${i}`] = i;
    await fetch(`${sb.proxyURL}/rest/v1/kv?key=eq.${key}`, { method: "PATCH", headers: h, body: JSON.stringify({ value: cur }) });
  }));
  const kept = Object.keys((await sb.api("GET", `/rest/v1/kv?key=eq.${key}&select=value`))[0].value.fields).length;
  await sb.api("DELETE", `/rest/v1/kv?key=eq.${key}`);
  assert(kept < 10, `kontroll: 10 feltétel nélküli olvas-módosít-ír mind megmaradt (${kept}) — így a mérés nem látná a veszteséget`);
  log(`  kontroll: feltétel nélküli írással 10 párhuzamos frissítésből csak ${kept} maradt meg`);
}

let passed = false;
try {
  const browser = await chromium.launch({ executablePath: chromeExe, headless: true });
  cleanups.push(() => browser.close());

  log("A) fájl-driver (next start :3012, elszigetelt DATA_DIR)");
  const dirA = await tmpDir("p1-data-fajl-");
  cleanups.push(() => fs.rm(dirA, { recursive: true, force: true }));
  const fa = fileAdapter(dirA);
  await fa.writeDoc(initialDoc());
  const srvFile = await startNext({ port: 3012, env: { DATA_DIR: dirA }, label: "fájl" });
  cleanups.push(() => srvFile.stop());
  await submissions(fa, [srvFile.base]);
  await parallelSaves(fa, [srvFile.base], browser);
  log("  2. fájl: 10 párhuzamos admin-mentésből mind a 10 megmaradt");
  await migration(fa, [srvFile.base]);
  const tmpLeft = (await fs.readdir(dirA, { recursive: true })).filter((f) => String(f).endsWith(".tmp"));
  assert(tmpLeft.length === 0, `fájl: ideiglenes fájlok maradtak: ${tmpLeft.join(", ")}`);
  await srvFile.stop();

  log("B) helyi Supabase mérő előtéttel, két szerverpéldány (next start :3012 + szabad port)");
  const sb = await startSupabase({ slow: ["site_content", "kv:p1-control"], readDelayMs: 250 });
  cleanups.push(() => sb.stop());
  await lostUpdateControl(sb);
  const ba = supabaseAdapter(sb);
  await ba.writeDoc(initialDoc());
  const dirB = await tmpDir("p1-data-supabase-");
  cleanups.push(() => fs.rm(dirB, { recursive: true, force: true }));
  const env = { ...sb.env, DATA_DIR: dirB };
  const portB = await freePort();
  const [srvA, srvB] = await Promise.all([startNext({ port: 3012, env, label: "supabase-A" }), startNext({ port: portB, env, label: "supabase-B" })]);
  cleanups.push(() => srvA.stop(), () => srvB.stop());
  const bases = [srvA.base, srvB.base];
  await submissions(ba, bases);
  const before = sb.snapshot("site_content"), savesStart = Date.now();
  await parallelSaves(ba, bases, browser);
  const after = sb.snapshot("site_content");
  const conflicts = after.conflicts - before.conflicts, conditional = after.conditional - before.conditional, unconditional = after.unconditional - before.unconditional;
  assert(unconditional === 0, `supabase: a mentések alatt ${unconditional} feltétel nélküli írás ment a dokumentumba`);
  if (conflicts < 1 || process.env.P1_TIMELINE) {
    const tl = sb.timeline("site_content").filter((e) => e.t0 >= savesStart);
    const z = tl[0]?.t0 ?? 0;
    console.error("  idővonal (ms):", tl.map((e) => `${e.op}${e.cond ? "*" : ""} ${e.t0 - z}-${e.t1 - z} ${e.status}`).join(" | "));
  }
  assert(conflicts >= 1, `supabase: a párhuzamos mentések alatt nem volt ütközés (${conditional} feltételes írás) — így a teszt nem bizonyítja az újrapróbálást`);
  log(`  2. supabase: 10 párhuzamos admin-mentésből mind a 10 megmaradt — ${conditional} feltételes írás, ebből ${conflicts} ütközés (a version közben változott) újrapróbálva, feltétel nélküli írás: 0`);
  await migration(ba, bases);
  const strays = await fs.readdir(dirB);
  assert(strays.length === 0, `supabase: az alkalmazás a fájl-driverre is írt (${strays.join(", ")}) — nem a Supabase-drivert használta`);
  await Promise.all([srvA.stop(), srvB.stop()]);
  passed = true;
} catch (e) {
  console.error(e instanceof CheckError ? `FAIL: ${e.message}` : `FAIL: váratlan hiba: ${e?.stack ?? e}`);
} finally {
  for (const c of cleanups.reverse()) { try { await c(); } catch { /* takarítás */ } }
  dbReset();
}
if (passed) console.log("PASS: p1-data");
process.exit(passed ? 0 : 1);
