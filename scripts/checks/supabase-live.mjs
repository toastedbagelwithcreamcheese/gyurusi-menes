/**
 * G30 — élesben a Supabase az adatbázis. Használat: node scripts/checks/supabase-live.mjs   (BASE_URL, alap: az éles demó címe)
 * A kulcsokat a környezetből vagy a .env.local-ból olvassa (ADMIN_USER, ADMIN_PASSWORD, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) — értéket nem ír ki.
 *  1) az admin kezdőlapjának állapotpanelje (Basic Auth): az adatbázis-csoport „Supabase” (data-status-value="on");
 *  2) GET /api/admin/backup ↔ a Supabase site_content sora: az események (azonosító + magyar cím), a beszámolók és a feltöltések azonosítói,
 *     a nyitókép és az utolsó mentés ideje egyezik — tehát az élő oldal ebből a projektből olvas;
 *  3) POST /api/admin/maintenance az éles oldalon → a Supabase kv táblájában a maintenance/last-run időbélyege a futás idejére ugrik,
 *     és a backups táblában megvan a mai (Europe/Budapest) mentés — tehát az élő oldal ebbe a projektbe ír.
 * A karbantartás idempotens (lejárt adatot töröl, a mai mentést csak egyszer írja): próbaadatot nem hoz létre. Csak ha minden teljesült: PASS: supabase-live
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fileEnv = {};
if (existsSync(path.join(ROOT, ".env.local"))) {
  for (const l of readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/); if (!m) continue;
    let v = m[2].trim(); if (/^(["']).*\1$/.test(v)) v = v.slice(1, -1); fileEnv[m[1]] = v;
  }
}
const env = (k) => (process.env[k] ?? fileEnv[k] ?? "").trim();
const BASE = (process.env.BASE_URL || "https://gyurusi-menes-demo.netlify.app").replace(/\/+$/, "");
const SB = env("SUPABASE_URL").replace(/\/+$/, ""), KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const USER = env("ADMIN_USER"), PASS = env("ADMIN_PASSWORD");
const problems = [];
const bad = (m) => { problems.push(m); console.log(`  ✗ ${m}`); };
const done = () => { if (problems.length) { console.log(`FAIL: supabase-live — ${problems.length} hiba`); process.exit(1); } console.log("PASS: supabase-live"); };
if (!SB || !KEY || !PASS) { console.log("FAIL: supabase-live — hiányzik a SUPABASE_URL, a SUPABASE_SERVICE_ROLE_KEY vagy az ADMIN_PASSWORD (környezet vagy .env.local)"); process.exit(1); }

const basic = { authorization: `Basic ${Buffer.from(`${USER}:${PASS}`).toString("base64")}` };
const sb = async (p) => { const r = await fetch(`${SB}/rest/v1/${p}`, { headers: { apikey: KEY, authorization: `Bearer ${KEY}` } }); if (!r.ok) throw new Error(`Supabase ${p}: HTTP ${r.status} ${(await r.text()).slice(0, 160)}`); return r.json(); };
const budapestDay = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

try {
  console.log(`supabase-live: ${BASE} ↔ ${SB}`);

  /* 1) állapotpanel */
  const home = await fetch(`${BASE}/admin`, { headers: basic, redirect: "manual" });
  const html = await home.text();
  const group = html.match(/data-status="database"[\s\S]{0,600}?data-status-value="(on|off)"/);
  if (home.status !== 200) bad(`az admin kezdőlapja HTTP ${home.status} (Basic Auth-tal 200 várt)`);
  else if (!group) bad("az állapotpanelen nincs adatbázis-csoport (data-status=\"database\") — régi kód fut élesben?");
  else if (group[1] !== "on") bad("az állapotpanel szerint az élő oldal NEM a Supabase-t használja (helyi fájl) — a SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY hiányzik a Netlify-on, vagy nem volt új deploy");
  else console.log("1) az admin állapotpanelje: Supabase");

  /* 2) a mentés-API ↔ a site_content sor */
  const bk = await (await fetch(`${BASE}/api/admin/backup`, { headers: { ...basic, "cache-control": "no-cache" } })).json();
  const row = (await sb("site_content?id=eq.site&select=data"))[0]?.data;
  if (!row) bad("a site_content táblában nincs tartalomdokumentum");
  else {
    const pick = (d) => JSON.stringify({
      events: (d.events ?? []).map((e) => [e.id, e.title?.hu]).sort(), reports: (d.reports ?? []).map((r) => r.id).sort(),
      uploads: (d.uploads ?? []).map((u) => u.id).sort(), hero: d.hero?.image, updatedAt: d.updatedAt ?? null,
    });
    if (pick(bk.site) !== pick(row)) bad(`az élő oldal tartalma nem egyezik a site_content sorral:\n    oldal:    ${pick(bk.site).slice(0, 300)}\n    Supabase: ${pick(row).slice(0, 300)}`);
    else console.log(`2) a mentés-API és a site_content egyezik: ${(row.events ?? []).length} esemény, ${(row.reports ?? []).length} beszámoló, ${(row.uploads ?? []).length} feltöltés, nyitókép ${row.hero?.image}, utolsó mentés ${row.updatedAt ?? "—"}`);
  }

  /* 3) karbantartás élesben → írás a Supabase-be */
  const before = (await sb("kv?key=eq.maintenance%2Flast-run&select=value"))[0]?.value?.at ?? null;
  const t0 = Date.now();
  const run = await fetch(`${BASE}/api/admin/maintenance`, { method: "POST", headers: basic });
  const rj = await run.json().catch(() => null);
  if (run.status !== 200 || rj?.ok !== true) bad(`POST /api/admin/maintenance → HTTP ${run.status} ${JSON.stringify(rj).slice(0, 200)}`);
  else {
    const after = (await sb("kv?key=eq.maintenance%2Flast-run&select=value"))[0]?.value?.at ?? null;
    const at = Date.parse(after ?? "");
    if (!Number.isFinite(at) || at < t0 - 60_000 || after === before) bad(`a kv maintenance/last-run nem frissült (előtte ${before}, utána ${after})`);
    const today = `${budapestDay(new Date())}.json`;
    const backups = (await sb(`backups?name=eq.${today}&select=name`)).map((b) => b.name);
    if (!backups.includes(today)) bad(`a backups táblában nincs mai mentés (${today}); a futás jelentése: ${JSON.stringify(rj.report).slice(0, 200)}`);
    if (!problems.length) console.log(`3) karbantartás élesben (${Date.now() - t0} ms): a kv maintenance/last-run ${before ?? "—"} → ${after}; mai mentés a backups táblában (${today}); jelentés: ${JSON.stringify(rj.report)}`);
  }
} catch (e) {
  bad(`váratlan hiba: ${e?.message ?? e}`);
}
done();
