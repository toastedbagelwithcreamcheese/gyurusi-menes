/**
 * Helyi Supabase a tesztekhez — NEM az éles projekt. Csak adatbázis, REST, Storage és átjáró fut (a többi konténer ki van hagyva).
 * A Colima a külső SSD-t nem csatolja, ezért a stack egy home alatti munkakönyvtárból indul (~/.cache/gyurusi-menes-supabase);
 * a repó supabase/config.toml-ja és supabase/migrations/*.sql-je minden indításkor oda másolódik. Portok: 5435x (a gépen más stackek is futnak).
 *
 *   node scripts/supabase-local.mjs start    elindítja (ha kell), és ha a migrációk változtak, újraépíti az adatbázist
 *   node scripts/supabase-local.mjs reset    minden tábla és tároló kiürítése (a séma marad)
 *   node scripts/supabase-local.mjs env      SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… (a helyi demókulcs) — próbákhoz
 *   node scripts/supabase-local.mjs stop
 * Modulként: import { ensureLocalSupabase, resetLocalSupabase } from "./supabase-local.mjs".
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, copyFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const WORKDIR = path.join(os.homedir(), ".cache/gyurusi-menes-supabase");
export const API_URL = "http://127.0.0.1:54351";
const EXCLUDE = "gotrue,realtime,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor";
const STORAGE_CONTAINER = "supabase_storage_gyurusi-menes";
export const TABLES = { site_content: "id", registrations: "id", messages: "id", kv: "key", rate_limits: "key", backups: "name" };
export const BUCKETS = ["files", "upload-chunks"];

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: "utf8", ...opts });

function syncWorkdir() {
  const src = path.join(ROOT, "supabase"), dst = path.join(WORKDIR, "supabase");
  mkdirSync(path.join(dst, "migrations"), { recursive: true });
  copyFileSync(path.join(src, "config.toml"), path.join(dst, "config.toml"));
  const want = readdirSync(path.join(src, "migrations")).filter((n) => n.endsWith(".sql")).sort();
  for (const n of readdirSync(path.join(dst, "migrations"))) if (!want.includes(n)) rmSync(path.join(dst, "migrations", n));
  const h = createHash("sha256");
  for (const n of want) { const buf = readFileSync(path.join(src, "migrations", n)); copyFileSync(path.join(src, "migrations", n), path.join(dst, "migrations", n)); h.update(n).update(buf); }
  return h.digest("hex");
}

function containerEnv(name, key) {
  const r = run("docker", ["inspect", name, "--format", "{{range .Config.Env}}{{println .}}{{end}}"]);
  if (r.status !== 0) return null;
  const line = r.stdout.split("\n").find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1) : null;
}
const running = () => run("docker", ["ps", "--filter", `name=${STORAGE_CONTAINER}`, "--format", "{{.Names}}"]).stdout.trim() === STORAGE_CONTAINER;

/** Elindítja a helyi stacket (ha nem fut), a változott migrációkkal újraépíti, és visszaadja a próbákhoz szükséges környezetet. */
export async function ensureLocalSupabase() {
  const hash = syncWorkdir();
  const stamp = path.join(WORKDIR, ".migrations-hash");
  if (!running()) {
    const r = run("supabase", ["start", "-x", EXCLUDE], { cwd: WORKDIR, stdio: ["ignore", "pipe", "pipe"], timeout: 600_000 });
    if (r.status !== 0) throw new Error(`a helyi Supabase nem indult el: ${(r.stderr || r.stdout).slice(-800)}`);
    writeFileSync(stamp, hash);
  } else if (!existsSync(stamp) || readFileSync(stamp, "utf8") !== hash) {
    const r = run("supabase", ["db", "reset", "--local", "--yes"], { cwd: WORKDIR, stdio: ["ignore", "pipe", "pipe"], timeout: 600_000 });
    if (r.status !== 0) throw new Error(`a helyi adatbázis újraépítése nem sikerült: ${(r.stderr || r.stdout).slice(-800)}`);
    writeFileSync(stamp, hash);
  }
  const serviceKey = containerEnv(STORAGE_CONTAINER, "SERVICE_KEY"), anonKey = containerEnv(STORAGE_CONTAINER, "ANON_KEY");
  if (!serviceKey || !anonKey) throw new Error("a helyi Supabase kulcsai nem olvashatók ki a storage-konténerből");
  for (let i = 0; i < 60; i++) {
    const ok = await fetch(`${API_URL}/rest/v1/kv?select=key&limit=1`, { headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } }).then((r) => r.ok, () => false);
    if (ok) return { url: API_URL, serviceKey, anonKey, env: { SUPABASE_URL: API_URL, SUPABASE_SERVICE_ROLE_KEY: serviceKey } };
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("a helyi Supabase REST 60 s alatt sem válaszolt");
}

/** Minden tábla és tároló kiürítése (a séma és a tárolók megmaradnak). */
export async function resetLocalSupabase({ url, serviceKey }) {
  const h = { apikey: serviceKey, authorization: `Bearer ${serviceKey}` };
  for (const [table, pk] of Object.entries(TABLES)) {
    const r = await fetch(`${url}/rest/v1/${table}?${pk}=not.is.null`, { method: "DELETE", headers: h });
    if (!r.ok) throw new Error(`${table} ürítése: HTTP ${r.status} ${await r.text()}`);
  }
  for (const bucket of BUCKETS) {
    const r = await fetch(`${url}/storage/v1/bucket/${bucket}/empty`, { method: "POST", headers: h });
    if (!r.ok) throw new Error(`${bucket} ürítése: HTTP ${r.status} ${await r.text()}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  const cmd = process.argv[2] ?? "start";
  try {
    if (cmd === "stop") { const r = run("supabase", ["stop"], { cwd: WORKDIR, stdio: "inherit" }); process.exit(r.status ?? 1); }
    const sb = await ensureLocalSupabase();
    if (cmd === "reset") { await resetLocalSupabase(sb); console.log("helyi Supabase kiürítve"); }
    else if (cmd === "env") console.log(`SUPABASE_URL=${sb.url}\nSUPABASE_SERVICE_ROLE_KEY=${sb.serviceKey}`);
    else console.log(`helyi Supabase fut: ${sb.url} (táblák: ${Object.keys(TABLES).join(", ")}; tárolók: ${BUCKETS.join(", ")})`);
  } catch (e) { console.error(`FAIL: supabase-local — ${e.message}`); process.exit(1); }
}
