/**
 * A Supabase-projekt ellenőrzése és az egyszeri adatátköltöztetés a korábbi (Netlify Blobs-os) élő oldalról.
 * A kulcsokat a környezetből vagy a .env.local-ból olvassa (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, ADMIN_USER, ADMIN_PASSWORD) —
 * értéket soha nem ír ki.
 *
 *   node scripts/supabase-import.mjs --check                      csak olvas: megvan-e a 6 tábla és a 2 tároló, az anon kulcs tényleg nem fér hozzá
 *   node scripts/supabase-import.mjs --from-url <oldal> [--dry-run] [--force]
 *        a futó oldal mentés-API-jából (GET /api/admin/backup, Basic Auth) — a Supabase-es kód élesítése ELŐTT, a régi oldalról
 *   node scripts/supabase-import.mjs --from-file <mentés.json> --files-from <oldal> [--dry-run] [--force]
 *        egy letöltött mentésből; a feltöltött fájlokat (képek, PDF-ek) a megadott oldal /files/<kulcs> címéről tölti le
 *
 * Lépések: séma-ellenőrzés → tartalomdokumentum (üres táblába beszúrja; ha van már sor és eltér, csak --force-szal írja felül,
 * a verzió léptetésével) → jelentkezések és üzenetek (ON CONFLICT DO NOTHING) → fájlok a „files” tárolóba (a meglévőt kihagyja)
 * → visszaolvasás: sorok száma, a dokumentum egyezése, a fájlok bájtra. Csak ha minden egyezik: PASS: supabase-import.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };

const fileEnv = {};
if (existsSync(path.join(ROOT, ".env.local"))) {
  for (const l of readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/); if (!m) continue;
    let v = m[2].trim(); if (/^(["']).*\1$/.test(v)) v = v.slice(1, -1); fileEnv[m[1]] = v;
  }
}
const env = (k) => (process.env[k] ?? fileEnv[k] ?? "").trim();
const URL_ = env("SUPABASE_URL").replace(/\/+$/, ""), SERVICE = env("SUPABASE_SERVICE_ROLE_KEY"), ANON = env("SUPABASE_ANON_KEY");
const TABLES = { site_content: "id", registrations: "id", messages: "id", kv: "key", rate_limits: "key", backups: "name" };
const BUCKETS = ["files", "upload-chunks"];
const COLUMNS = {
  registrations: [["id", "id"], ["eventId", "event_id"], ["name", "name"], ["phone", "phone"], ["email", "email"], ["count", "count"], ["note", "note"], ["receivedAt", "received_at"]],
  messages: [["id", "id"], ["name", "name"], ["email", "email"], ["phone", "phone"], ["message", "message"], ["page", "page"], ["receivedAt", "received_at"], ["read", "read"]],
};
const toRow = (kind, rec) => Object.fromEntries(COLUMNS[kind].filter(([f]) => rec[f] !== undefined).map(([f, c]) => [c, rec[f]]));
const KEY_RE = /^[a-z0-9][a-z0-9-]{2,64}\.(webp|pdf|jpg|png)$/;
const TYPES = { webp: "image/webp", pdf: "application/pdf", jpg: "image/jpeg", png: "image/png" };
const sha = (b) => createHash("sha256").update(b).digest("hex");
const problems = [];
const bad = (m) => { problems.push(m); console.log(`  ✗ ${m}`); };
const DRY = flag("--dry-run");

function die(m) { console.error(`FAIL: supabase-import — ${m}`); process.exit(1); }
if (!URL_ || !SERVICE) die("hiányzik a SUPABASE_URL vagy a SUPABASE_SERVICE_ROLE_KEY (környezet vagy .env.local)");

const H = (key) => ({ apikey: key, authorization: `Bearer ${key}` });
async function rest(method, p, body, prefer, key = SERVICE) {
  const r = await fetch(`${URL_}${p}`, { method, headers: { ...H(key), "content-type": "application/json", ...(prefer ? { prefer } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  let j = null; try { j = t ? JSON.parse(t) : null; } catch { /* nem JSON */ }
  return { status: r.status, ok: r.ok, j, t };
}

/* ---------------- 1) séma ---------------- */
async function checkSchema() {
  console.log(`1) séma: ${URL_}`);
  for (const [t, pk] of Object.entries(TABLES)) {
    const r = await rest("GET", `/rest/v1/${t}?select=${pk}&limit=1`);
    if (!r.ok) bad(`a(z) ${t} tábla nem érhető el (HTTP ${r.status}: ${r.j?.message ?? r.t.slice(0, 120)}) — futtasd le a supabase/migrations/*.sql-t a Supabase SQL Editorban`);
    if (ANON) {
      const a = await rest("GET", `/rest/v1/${t}?select=${pk}&limit=1`, undefined, undefined, ANON);
      const leaked = a.ok && Array.isArray(a.j) && a.j.length > 0;
      if (a.ok && !leaked && r.ok) { /* 200 + üres lista: RLS szűr — de ha a táblában van adat, azt is ellenőrizzük lent */ }
      if (leaked) bad(`az anon kulccsal olvasható a(z) ${t} tábla — az RLS nincs bekapcsolva`);
    }
  }
  const b = await rest("GET", "/storage/v1/bucket");
  const names = Array.isArray(b.j) ? b.j.map((x) => x.name) : [];
  for (const n of BUCKETS) {
    const x = Array.isArray(b.j) ? b.j.find((y) => y.name === n) : null;
    if (!x) bad(`hiányzik a(z) „${n}” Storage-tároló (${names.join(", ") || "nincs tároló"})`);
    else if (x.public) bad(`a(z) „${n}” tároló nyilvános — privátnak kell lennie`);
  }
  if (ANON) {
    const a = await rest("POST", "/storage/v1/object/list/files", { prefix: "" }, undefined, ANON);
    if (a.ok && Array.isArray(a.j) && a.j.length > 0) bad("az anon kulccsal listázható a „files” tároló");
    const w = await rest("POST", "/rest/v1/kv", { key: "anon-probe", value: {} }, undefined, ANON);
    if (w.ok) { bad("az anon kulccsal írható a kv tábla"); await rest("DELETE", "/rest/v1/kv?key=eq.anon-probe"); }
  } else console.log("  (SUPABASE_ANON_KEY nincs megadva — az anon-hozzáférés próbája kimarad)");
  if (!problems.length) console.log(`  a 6 tábla (${Object.keys(TABLES).join(", ")}) és a 2 privát tároló megvan; az anon kulcs nem olvas, nem ír`);
  return problems.length === 0;
}

/* ---------------- 2) forrás ---------------- */
async function loadSource() {
  const fromUrl = opt("--from-url"), fromFile = opt("--from-file");
  if (fromUrl) {
    const user = env("ADMIN_USER"), pass = env("ADMIN_PASSWORD");
    if (!pass) die("a --from-url-hez ADMIN_PASSWORD (és ha kell, ADMIN_USER) kell");
    const r = await fetch(`${fromUrl.replace(/\/+$/, "")}/api/admin/backup`, { headers: { authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`, "cache-control": "no-cache" } });
    if (!r.ok) die(`a forrás mentés-API-ja HTTP ${r.status}`);
    return { backup: await r.json(), filesFrom: fromUrl.replace(/\/+$/, "") };
  }
  if (fromFile) {
    const filesFrom = opt("--files-from");
    return { backup: JSON.parse(readFileSync(fromFile, "utf8")), filesFrom: filesFrom?.replace(/\/+$/, "") };
  }
  die("add meg a forrást: --from-url <oldal> vagy --from-file <mentés.json> --files-from <oldal> (vagy csak --check)");
}

async function importData() {
  const { backup, filesFrom } = await loadSource();
  if (backup?.format !== "gyurusi-menes-backup" || !backup.site) die("a forrás nem gyurusi-menes-backup formátumú");
  const site = backup.site, regs = backup.registrations ?? [], msgs = backup.messages ?? [];
  const fileKeys = [...(site.uploads ?? []).map((u) => String(u.src ?? "").replace(/^\/files\//, "")), ...(site.reports ?? []).map((r) => String(r.file ?? ""))].filter((k) => KEY_RE.test(k));
  console.log(`2) forrás: ${site.events?.length ?? 0} esemény, ${site.uploads?.length ?? 0} feltöltött kép, ${site.reports?.length ?? 0} beszámoló, ${regs.length} jelentkezés, ${msgs.length} üzenet, ${fileKeys.length} fájl${DRY ? " — PRÓBAFUTÁS, nem ír" : ""}`);

  /* tartalomdokumentum */
  const cur = await rest("GET", "/rest/v1/site_content?id=eq.site&select=data,version");
  const existing = cur.j?.[0];
  if (!existing) {
    console.log("3) tartalomdokumentum: a tábla üres → beszúrás");
    if (!DRY) { const r = await rest("POST", "/rest/v1/site_content?on_conflict=id", { id: "site", data: site }, "resolution=ignore-duplicates,return=representation"); if (!r.ok || r.j?.length !== 1) bad(`a dokumentum beszúrása: HTTP ${r.status} ${r.t.slice(0, 160)}`); }
  } else if (JSON.stringify(existing.data) === JSON.stringify(site)) {
    console.log("3) tartalomdokumentum: már ugyanez van a táblában");
  } else if (flag("--force")) {
    console.log(`3) tartalomdokumentum: eltér a táblában lévőtől → felülírás (--force), verzió ${existing.version} → ${existing.version + 1}`);
    if (!DRY) { const r = await rest("PATCH", `/rest/v1/site_content?id=eq.site&version=eq.${existing.version}`, { data: site, version: existing.version + 1, updated_at: new Date().toISOString() }, "return=representation"); if (!r.ok || r.j?.length !== 1) bad(`a dokumentum felülírása: HTTP ${r.status} (közben változott?)`); }
  } else {
    bad("a site_content táblában már van ETTŐL ELTÉRŐ dokumentum (pl. az oldal az első betöltéskor a magot tette bele) — nézd meg, és ha a forrás a helyes, futtasd újra --force-szal");
  }

  /* rekordok */
  for (const [kind, list] of [["registrations", regs], ["messages", msgs]]) {
    if (!list.length) { console.log(`4) ${kind}: nincs mit átvinni`); continue; }
    if (DRY) { console.log(`4) ${kind}: ${list.length} sor átvitele (próbafutás)`); continue; }
    const r = await rest("POST", `/rest/v1/${kind}?on_conflict=id`, list.map((x) => toRow(kind, x)), "resolution=ignore-duplicates,return=representation");
    if (!r.ok) bad(`${kind}: HTTP ${r.status} ${r.t.slice(0, 160)}`); else console.log(`4) ${kind}: ${r.j.length} új sor (${list.length - r.j.length} már megvolt)`);
  }

  /* fájlok */
  for (const key of fileKeys) {
    const head = await fetch(`${URL_}/storage/v1/object/files/${key}`, { headers: H(SERVICE) });
    if (head.ok) { await head.arrayBuffer(); console.log(`5) ${key}: már a tárolóban`); continue; }
    if (!filesFrom) { bad(`${key}: nincs forrás a letöltéshez (--files-from)`); continue; }
    const src = await fetch(`${filesFrom}/files/${key}`);
    if (!src.ok) { bad(`${key}: a forrásoldalon HTTP ${src.status}`); continue; }
    const buf = Buffer.from(await src.arrayBuffer());
    if (DRY) { console.log(`5) ${key}: ${buf.length} bájt feltöltése (próbafutás)`); continue; }
    const up = await fetch(`${URL_}/storage/v1/object/files/${key}`, { method: "POST", headers: { ...H(SERVICE), "content-type": TYPES[key.split(".").pop()], "x-upsert": "false" }, body: buf });
    if (!up.ok) { bad(`${key}: feltöltés HTTP ${up.status} ${(await up.text()).slice(0, 120)}`); continue; }
    const back = await fetch(`${URL_}/storage/v1/object/files/${key}`, { headers: H(SERVICE) });
    const got = Buffer.from(await back.arrayBuffer());
    if (sha(got) !== sha(buf)) bad(`${key}: a visszaolvasott fájl nem egyezik`); else console.log(`5) ${key}: ${buf.length} bájt feltöltve, bájtra egyezik`);
  }
  if (!fileKeys.length) console.log("5) fájlok: nincs feltöltött kép vagy beszámoló");

  /* visszaolvasás */
  if (!DRY) {
    const doc = (await rest("GET", "/rest/v1/site_content?id=eq.site&select=data")).j?.[0]?.data;
    if (JSON.stringify(doc) !== JSON.stringify(site) && !problems.length) bad("a visszaolvasott dokumentum nem egyezik a forrással");
    for (const [kind, list] of [["registrations", regs], ["messages", msgs]]) {
      const ids = new Set(((await rest("GET", `/rest/v1/${kind}?select=id&limit=10000`)).j ?? []).map((x) => x.id));
      const missing = list.filter((x) => !ids.has(x.id));
      if (missing.length) bad(`${kind}: ${missing.length} sor hiányzik a táblából`);
    }
    if (!problems.length) console.log(`6) visszaolvasva: a dokumentum egyezik, ${regs.length} jelentkezés és ${msgs.length} üzenet megvan, ${fileKeys.length} fájl a tárolóban`);
  }
}

const schemaOk = await checkSchema();
if (!flag("--check")) {
  if (!schemaOk) die("a séma hiányos — előbb futtasd le a supabase/migrations/*.sql-t a Supabase SQL Editorban");
  await importData();
}
if (problems.length) { console.log(`FAIL: supabase-import — ${problems.length} hiba`); process.exit(1); }
console.log(`PASS: supabase-import${flag("--check") ? " (csak ellenőrzés)" : DRY ? " (próbafutás)" : ""}`);
