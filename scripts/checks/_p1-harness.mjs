/**
 * Közös tesztkeret a P1 kapukhoz (p1-data.mjs, p1-maintenance.mjs). Nem önálló kapu, nem ír PASS-t.
 *  · startNext: saját `next start` a megadott porton, tiszta környezettel (DATA_DIR, SUPABASE_URL… csak amit átadunk).
 *  · startSupabase: a HELYI Supabase (scripts/supabase-local.mjs — nem az éles projekt), kiürítve, és elé egy mérő előtét: táblánként
 *    számolja a feltételes írásokat (PATCH …&version=eq.N, ill. ON CONFLICT DO NOTHING beszúrás), ezek közül az ütközéseket (üres
 *    válasz: a feltétel közben megszűnt) és a feltétel nélküli írásokat; a megadott táblák GET-jeit késlelteti, hogy a párhuzamos
 *    írók olvasásai biztosan átfedjenek.
 *  · fileAdapter / supabaseAdapter: a teszt ugyanazokkal a lépésekkel olvassa-írja a két drivert.
 *  · runTsModule: TypeScript-modul futtatása sima Node-ban (típuslehántással), Next és útvonal-aliasok nélkül.
 */
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureLocalSupabase, resetLocalSupabase } from "../supabase-local.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export class CheckError extends Error {}
export const fail = (m) => { throw new CheckError(m); };
export const assert = (cond, m) => { if (!cond) fail(m); };
export const chromeExe = process.env.PW_CHROME ?? path.join(os.homedir(), "Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
export const readSeed = () => JSON.parse(readFileSync(path.join(ROOT, "data/seed.json"), "utf8"));
export const tmpDir = (prefix) => fs.mkdtemp(path.join(os.tmpdir(), prefix));
/** YYYY-MM-DD, `days` nappal a mai (UTC) nap után/előtt. */
export const dayOffset = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
/** Budapesti naptári nap — a napi mentés neve is ez. */
export const budapestDay = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
/** Naptári kivonás egy YYYY-MM-DD napból (időzóna- és óraátállítás-független). */
export const minusDays = (ymd, n) => { const [y, m, d] = ymd.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10); };

export function fixtureEvent(id, { date, endDate, registration = false } = {}) {
  return {
    id, published: true, featured: false, registration, date, ...(endDate ? { endDate } : {}), location: "Gyűrűsi Ménes, Gyűrűs", image: "osveny-ugras-allo",
    title: { hu: `P1 ${id}`, en: `P1 ${id} EN`, de: `P1 ${id} DE` }, summary: { hu: "P1 teszt.", en: "P1 test.", de: "P1-Test." },
  };
}

export function dbReset() {
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts/db-reset.mjs")], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) console.error("db:reset hiba:", r.stderr);
}

export const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.unref(); s.on("error", reject);
  s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

const OWN_PORT = 3012; // a P1 fázis saját portja: csak ezen állítunk le idegen listenert
const killPort = (port) => spawnSync("sh", ["-c", `lsof -ti tcp:${port} -sTCP:LISTEN | xargs kill -9 2>/dev/null`], { stdio: "ignore" });

/** `next start` a kész builddel. Csak az `env`-ben átadott tár-/admin-változók jutnak el hozzá (a shellből örökölt nem). */
export async function startNext({ port, env = {}, label = "next" }) {
  if (port === OWN_PORT) killPort(port);
  const base = { ...process.env };
  for (const k of ["NETLIFY_BLOBS_CONTEXT", "NETLIFY_SITE_ID", "NETLIFY_TOKEN", "NETLIFY", "DATA_DIR", "ADMIN_USER", "ADMIN_PASSWORD", "ADMIN_OPEN_DEMO", "RESEND_API_KEY", "GOOGLE_PLACES_KEY", "RATELIMIT_SALT", "STORE_DRIVER"]) delete base[k];
  /* A Next a .env.local-ból a folyamatban NEM létező kulcsot tölti be: az éles Supabase- és levelező kulcsok üres értékkel zárva
     maradnak, hacsak a próba (env) kifejezetten meg nem adja őket. */
  for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY", "SUPABASE_PROJECT_ID", "RESEND_API_KEY", "CONTACT_TO", "CONTACT_FROM", "GOOGLE_PLACES_KEY", "GOOGLE_PLACE_ID", "ADMIN_USER", "ADMIN_PASSWORD"]) base[k] = "";
  const logs = [];
  /* Jelszó nélkül a production build admin-ja zárva (fail-closed); a próbák a nyitott demót kifejezetten kérik — a zárt eset
     próbája `env: { ADMIN_OPEN_DEMO: "" }`-vel indít (p3-auth D). */
  const child = spawn(process.execPath, [path.join(ROOT, "node_modules/next/dist/bin/next"), "start", "-p", String(port)], {
    cwd: ROOT, env: { ...base, ADMIN_OPEN_DEMO: "1", PORT: String(port), ...env }, detached: true, stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (d) => logs.push(String(d))); child.stderr.on("data", (d) => logs.push(String(d)));
  let exitCode = null; const exited = new Promise((r) => child.on("exit", (c) => { exitCode = c ?? -1; r(); }));
  const url = `http://localhost:${port}`;
  const t0 = Date.now();
  for (;;) {
    if (exitCode !== null) fail(`${label}: a next start kilépett (${exitCode}): ${logs.join("").slice(-1200)}`);
    /* Statikus útvonal a készenléthez: egy ISR-lap lekérése a közös .next gyorsítótárba írhatna. */
    try { const r = await fetch(`${url}/robots.txt`, { redirect: "manual" }); if (r.status === 200) break; } catch { /* még indul */ }
    if (Date.now() - t0 > 90_000) fail(`${label}: a szerver 90 s alatt sem indult el`);
    await sleep(120);
  }
  /* P7: a nyilvános lapok ISR-gyorsítótára a közös .next könyvtárban él — egy korábbi, más adatkönyvtárral futott szerver lapja
     ne jöjjön: induláskor minden nyilvános lap érvénytelen (a szerver saját admin-hitelesítésével). */
  {
    const pass = env.ADMIN_PASSWORD, auth = pass ? { authorization: `Basic ${Buffer.from(`${env.ADMIN_USER ?? ""}:${pass}`).toString("base64")}` } : {};
    const rv = await fetch(`${url}/api/admin/revalidate`, { method: "POST", headers: auth }).catch((e) => ({ ok: false, status: String(e) }));
    /* Jelszó és ADMIN_OPEN_DEMO nélkül az admin-API szándékosan zárva (503, p3-auth D): ott érvényteleníteni sem lehet — az a próba
       nyilvános lapokból csak az admin-link hiányát nézi, ami a gyorsítótártól független. */
    const locked = !pass && (env.ADMIN_OPEN_DEMO ?? "1") !== "1";
    if (!rv.ok && !(locked && rv.status === 503)) fail(`${label}: a nyilvános lapok érvénytelenítése induláskor nem sikerült (${rv.status})`);
  }
  let stopped = false;
  return {
    base: url, logs, readyMs: Date.now() - t0,
    async stop() {
      if (stopped) return; stopped = true;
      try { process.kill(-child.pid, "SIGKILL"); } catch { /* már nem fut */ }
      await Promise.race([exited, sleep(5000)]);
      if (port === OWN_PORT) killPort(port);
    },
  };
}

/** Mező ↔ oszlop a rekordtáblákban (ugyanaz, mint a src/lib/records.ts-ben). */
const COLUMNS = {
  registrations: [["id", "id"], ["eventId", "event_id"], ["name", "name"], ["phone", "phone"], ["email", "email"], ["count", "count"], ["note", "note"], ["receivedAt", "received_at"]],
  messages: [["id", "id"], ["name", "name"], ["email", "email"], ["phone", "phone"], ["message", "message"], ["page", "page"], ["receivedAt", "received_at"], ["read", "read"]],
};
export const toRow = (kind, rec) => Object.fromEntries(COLUMNS[kind].filter(([f]) => rec[f] !== undefined).map(([f, c]) => [c, rec[f]]));
export const fromRow = (kind, row) => {
  const o = {}; for (const [f, c] of COLUMNS[kind]) if (row[c] !== null && row[c] !== undefined) o[f] = row[c];
  if (o.receivedAt) o.receivedAt = new Date(o.receivedAt).toISOString();
  return o;
};

const HOP = new Set(["connection", "keep-alive", "transfer-encoding", "content-length", "host", "expect", "upgrade", "proxy-connection"]);

/**
 * Helyi Supabase + mérő előtét. `slow`: táblanevek (pl. "site_content") vagy kv-kulcsok ("kv:p1-control") — ezek GET-je `readDelayMs`-ig tart.
 * A statisztika és az idővonal kulcsa ugyanez az azonosító. Induláskor és leállításkor a helyi tár kiürül.
 */
export async function startSupabase({ slow = [], readDelayMs = 0 } = {}) {
  const sb = await ensureLocalSupabase();
  await resetLocalSupabase(sb);
  const stats = { conditional: {}, unconditional: {}, conflicts: {} };
  const timeline = [];
  const bump = (m, k) => { m[k] = (m[k] ?? 0) + 1; };

  const server = http.createServer(async (req, res) => {
    try {
      const arrived = Date.now();
      const parts = []; for await (const c of req) parts.push(c);
      const body = Buffer.concat(parts);
      const url = new URL(req.url, "http://elotet");
      const table = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/)?.[1] ?? null;
      const id = table === "kv" ? `kv:${(url.searchParams.get("key") ?? "").replace(/^eq\./, "")}` : table;
      const isSlow = req.method === "GET" && !!table && slow.includes(id);
      if (isSlow) await sleep(readDelayMs);
      const headers = Object.fromEntries(Object.entries(req.headers).filter(([k]) => !HOP.has(k)));
      const r = await fetch(sb.url + req.url, { method: req.method, headers, body: req.method === "GET" || req.method === "HEAD" ? undefined : body, redirect: "manual" });
      const buf = Buffer.from(await r.arrayBuffer());
      if (table && ["POST", "PATCH", "PUT"].includes(req.method)) {
        const prefer = String(req.headers.prefer ?? "");
        const cond = (req.method === "PATCH" && url.searchParams.has("version")) || (req.method === "POST" && prefer.includes("ignore-duplicates"));
        const empty = buf.toString("utf8").trim() === "[]";
        if (cond) { bump(stats.conditional, id); if (r.ok && empty) bump(stats.conflicts, id); } else bump(stats.unconditional, id);
        timeline.push({ id, op: req.method, cond, t0: arrived, t1: Date.now(), status: r.ok && cond && empty ? 409 : r.status });
      } else if (isSlow) timeline.push({ id, op: "GET", t0: arrived, t1: Date.now(), status: r.status });
      const out = {}; r.headers.forEach((v, k) => { if (!HOP.has(k) && k !== "content-encoding") out[k] = v; });
      res.writeHead(r.status, out); res.end(buf);
    } catch (e) { res.writeHead(502); res.end(String(e)); }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const proxyURL = `http://127.0.0.1:${server.address().port}`;
  const headers = { apikey: sb.serviceKey, authorization: `Bearer ${sb.serviceKey}` };
  /** Közvetlen hívás a helyi Supabase-re (az előtét nélkül — a teszt saját írásai ne számítsanak bele a mérésbe). */
  const api = async (method, p, body, prefer) => {
    const r = await fetch(sb.url + p, { method, headers: { ...headers, "content-type": "application/json", ...(prefer ? { prefer } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const t = await r.text();
    if (!r.ok) throw new Error(`helyi Supabase ${method} ${p}: HTTP ${r.status} ${t.slice(0, 200)}`);
    return t ? JSON.parse(t) : null;
  };
  let stopped = false;
  return {
    url: sb.url, proxyURL, serviceKey: sb.serviceKey, anonKey: sb.anonKey, headers, api,
    env: { SUPABASE_URL: proxyURL, SUPABASE_SERVICE_ROLE_KEY: sb.serviceKey },
    timeline: (key) => timeline.filter((e) => e.id === key),
    snapshot: (key) => ({ conditional: stats.conditional[key] ?? 0, unconditional: stats.unconditional[key] ?? 0, conflicts: stats.conflicts[key] ?? 0 }),
    async stop() {
      if (stopped) return; stopped = true;
      server.closeAllConnections?.(); await new Promise((r) => server.close(r));
      await resetLocalSupabase(sb).catch(() => {});
    },
  };
}

const BACKUP_RE = /^\d{4}-\d{2}-\d{2}\.json$/;

/** A fájl-driver adatai egy (elszigetelt) DATA_DIR alatt. */
export function fileAdapter(dir) {
  const readJsonDir = async (sub) => {
    const d = path.join(dir, sub);
    const names = (await fs.readdir(d).catch(() => [])).filter((n) => n.endsWith(".json"));
    return Promise.all(names.map(async (n) => JSON.parse(await fs.readFile(path.join(d, n), "utf8"))));
  };
  const put = async (file, data) => { await fs.mkdir(path.dirname(file), { recursive: true }); const tmp = `${file}.teszt.tmp`; await fs.writeFile(tmp, JSON.stringify(data, null, 2)); await fs.rename(tmp, file); };
  return {
    label: "fájl",
    readDoc: async () => JSON.parse(await fs.readFile(path.join(dir, "site.json"), "utf8")),
    writeDoc: (d) => put(path.join(dir, "site.json"), d),
    records: (kind) => readJsonDir(kind),
    putRecord: (kind, rec) => put(path.join(dir, kind, `${rec.id}.json`), rec),
    backups: async () => (await fs.readdir(path.join(dir, "backups")).catch(() => [])).filter((n) => BACKUP_RE.test(n)).sort().reverse(),
    readBackup: async (name) => JSON.parse(await fs.readFile(path.join(dir, "backups", name), "utf8")),
    putBackup: (name, data) => put(path.join(dir, "backups", name), data),
  };
}

/** A Supabase-driver adatai a helyi Supabase-ben (közvetlenül, az előtét nélkül). */
export function supabaseAdapter(sb) {
  const { api } = sb;
  const upsert = (table, conflict, row) => api("POST", `/rest/v1/${table}?on_conflict=${conflict}`, row, "resolution=merge-duplicates,return=minimal");
  return {
    label: "supabase",
    readDoc: async () => (await api("GET", "/rest/v1/site_content?id=eq.site&select=data"))[0]?.data ?? null,
    /* A verzió léptetésével: egy közben induló feltételes író így észreveszi a változást. */
    writeDoc: async (d) => { const cur = (await api("GET", "/rest/v1/site_content?id=eq.site&select=version"))[0]; await upsert("site_content", "id", { id: "site", data: d, version: (cur?.version ?? 0) + 1 }); },
    records: async (kind) => (await api("GET", `/rest/v1/${kind}?select=*&limit=1000`)).map((r) => fromRow(kind, r)),
    putRecord: (kind, rec) => upsert(kind, "id", toRow(kind, rec)),
    backups: async () => (await api("GET", "/rest/v1/backups?select=name&order=name.desc")).map((r) => r.name).filter((n) => BACKUP_RE.test(n)),
    readBackup: async (name) => (await api("GET", `/rest/v1/backups?name=eq.${encodeURIComponent(name)}&select=data`))[0]?.data ?? null,
    putBackup: (name, data) => upsert("backups", "name", { name, data }),
  };
}

/**
 * Egy TypeScript-modul (pl. a Netlify-függvény) futtatása SIMA Node-ban: típuslehántás + egy feloldó horog, amely
 * a kiterjesztés nélküli relatív importot .ts-re, a JSON-importot import-attribútumosra fordítja. Nincs Next, nincs
 * `@/` alias — ha a modul futásidőben ilyenre támaszkodna, itt elbukik. `code` a modul `m` nevű változóval fut.
 */
export function runTsModule(file, code, env) {
  const hook = `export async function resolve(s, c, next) {
    if (/^\\.{1,2}\\//.test(s) && !/\\.[cm]?[jt]sx?$|\\.json$/.test(s)) { try { const r = await next(s + ".ts", c); return { ...r, format: "module-typescript" }; } catch {} }
    if (s.endsWith(".json")) { const r = await next(s, { ...c, importAttributes: { type: "json" } }); return { ...r, importAttributes: { type: "json" } }; }
    return next(s, c);
  }`;
  const register = `import { register } from "node:module"; register(${JSON.stringify("data:text/javascript," + encodeURIComponent(hook))});`;
  const main = `const m = await import(${JSON.stringify(new URL(`file://${path.resolve(ROOT, file)}`).href)}); ${code}`;
  /* Aszinkron indítás: a Supabase-előtét ebben a folyamatban fut — egy spawnSync megállítaná, és a gyerek örökké rá várna. */
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--no-warnings", "--import", "data:text/javascript," + encodeURIComponent(register), "--input-type=module", "-e", main], { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", (d) => { stdout += d; }); child.stderr.on("data", (d) => { stderr += d; });
    const timer = setTimeout(() => child.kill("SIGKILL"), 120_000);
    child.on("close", (status, signal) => { clearTimeout(timer); resolve({ status, signal, stdout, stderr }); });
  });
}
