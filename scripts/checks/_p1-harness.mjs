/**
 * Közös tesztkeret a P1 kapukhoz (p1-data.mjs, p1-maintenance.mjs). Nem önálló kapu, nem ír PASS-t.
 *  · startNext: saját `next start` a megadott porton, tiszta környezettel (DATA_DIR, NETLIFY_BLOBS_CONTEXT… csak amit átadunk).
 *  · startBlobs: a @netlify/blobs helyi szimulátora (BlobsServer, ideiglenes könyvtárral) és elé egy vékony előtét, amely
 *    a szimulátorból hiányzó két Netlify-garanciát pótolja: ETag a GET-válaszon (tartalom-hash), és ATOMI feltételes írás
 *    (If-Match / If-None-Match kulcsonként sorba állítva). A 11.0.3-as szimulátor GET-je nem ad ETag-et, a feltételes PUT-ja
 *    pedig „ellenőriz, aztán ír”, így két egyidejű író mindkettője átcsúszhat — ezekkel a kód ütközéskezelése nem mérhető.
 *    Az előtét kulcsonként számolja a feltételes és feltétel nélküli írásokat és az ütközéseket (412).
 *  · fileAdapter / blobsAdapter: a teszt ugyanazokkal a lépésekkel olvassa-írja a két drivert.
 *  · runTsModule: TypeScript-modul futtatása sima Node-ban (típuslehántással), Next és útvonal-aliasok nélkül.
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getStore } from "@netlify/blobs";
import { BlobsServer } from "@netlify/blobs/server";

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
  for (const k of ["NETLIFY_BLOBS_CONTEXT", "NETLIFY_SITE_ID", "NETLIFY_TOKEN", "NETLIFY", "DATA_DIR", "ADMIN_USER", "ADMIN_PASSWORD", "RESEND_API_KEY", "GOOGLE_PLACES_KEY", "RATELIMIT_SALT"]) delete base[k];
  const logs = [];
  const child = spawn(process.execPath, [path.join(ROOT, "node_modules/next/dist/bin/next"), "start", "-p", String(port)], {
    cwd: ROOT, env: { ...base, PORT: String(port), ...env }, detached: true, stdio: ["ignore", "pipe", "pipe"],
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
    if (!rv.ok) fail(`${label}: a nyilvános lapok érvénytelenítése induláskor nem sikerült (${rv.status})`);
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

/** Blobs-szimulátor + Netlify-szemantikájú előtét. `slowKeys`: "<tárnév>/<kulcs>" (pl. "site:site/site"), ezek GET-je `readDelayMs`-ig tart. */
export async function startBlobs({ slowKeys = [], readDelayMs = 0 } = {}) {
  const dir = await tmpDir("p1-blobs-");
  const token = "p1-token", siteID = "p1site";
  const backend = new BlobsServer({ directory: dir, token });
  const { port: backendPort } = await backend.start();
  const backendURL = `http://127.0.0.1:${backendPort}`;
  const stats = { conditional: {}, unconditional: {}, conflicts: {} };
  const timeline = []; // a lassított kulcsok GET-jei és minden PUT: { id, op, t0, t1, status, cond }
  const bump = (m, k) => { m[k] = (m[k] ?? 0) + 1; };
  const queues = new Map();
  const serial = (k, fn) => { const run = (queues.get(k) ?? Promise.resolve()).then(fn); queues.set(k, run.catch(() => {})); return run; };
  const etagOf = (buf) => `"${createHash("sha256").update(buf).digest("hex")}"`;

  const server = http.createServer(async (req, res) => {
    try {
      const arrived = Date.now();
      const chunks = []; for await (const c of req) chunks.push(c);
      const body = Buffer.concat(chunks);
      const url = new URL(req.url, "http://elotet");
      const parts = url.pathname.split("/").filter((p) => p && !p.startsWith("region:")).map(decodeURIComponent);
      const key = parts.length >= 3 ? parts.slice(2).join("/") : null;
      const id = key ? `${parts[1]}/${key}` : null;
      const auth = { authorization: req.headers.authorization ?? "" };
      const send = (status, headers = {}, buf) => { res.writeHead(status, headers); res.end(buf); };

      if (req.method === "GET" && key) {
        const t0 = Date.now();
        if (slowKeys.includes(id)) await sleep(readDelayMs);
        const r = await fetch(backendURL + req.url, { headers: auth });
        const buf = Buffer.from(await r.arrayBuffer());
        const h = {}; const meta = r.headers.get("x-amz-meta-user"); if (meta) h["x-amz-meta-user"] = meta;
        if (r.status === 200) h.etag = etagOf(buf);
        if (slowKeys.includes(id)) timeline.push({ id, op: "GET", t0, t1: Date.now(), status: r.status });
        return send(r.status, h, buf);
      }
      if ((req.method === "PUT" || req.method === "DELETE") && key) {
        return await serial(id, async () => {
          if (req.method === "DELETE") { const r = await fetch(backendURL + req.url, { method: "DELETE", headers: auth }); return send(r.status); }
          const ifMatch = req.headers["if-match"], ifNone = req.headers["if-none-match"];
          if (ifMatch || ifNone) {
            bump(stats.conditional, id);
            const cur = await fetch(backendURL + req.url, { headers: auth });
            const exists = cur.status === 200;
            const curTag = exists ? etagOf(Buffer.from(await cur.arrayBuffer())) : null;
            if ((ifNone === "*" && exists) || (ifMatch && (!exists || curTag !== ifMatch))) { bump(stats.conflicts, id); timeline.push({ id, op: "PUT", cond: true, t0: arrived, t1: Date.now(), status: 412 }); return send(412); }
          } else bump(stats.unconditional, id);
          const headers = { ...auth };
          for (const h of ["content-type", "x-amz-meta-user", "cache-control"]) if (req.headers[h]) headers[h] = req.headers[h];
          const r = await fetch(backendURL + req.url, { method: "PUT", headers, body });
          timeline.push({ id, op: "PUT", cond: !!(ifMatch || ifNone), t0: arrived, t1: Date.now(), status: r.status });
          return send(r.status, r.status === 200 ? { etag: etagOf(body) } : {});
        });
      }
      /* Lista és HEAD változatlanul (a lista ETag-je a szimulátoré — azt a kód csak változásjelzőnek használja). */
      const r = await fetch(backendURL + req.url, { method: req.method, headers: auth });
      const buf = req.method === "HEAD" ? undefined : Buffer.from(await r.arrayBuffer());
      const h = {}; for (const k of ["content-type", "x-amz-meta-user"]) { const v = r.headers.get(k); if (v) h[k] = v; }
      return send(r.status, h, buf);
    } catch (e) { res.writeHead(500); res.end(String(e)); }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const shimURL = `http://127.0.0.1:${server.address().port}`;
  const context = Buffer.from(JSON.stringify({ edgeURL: shimURL, uncachedEdgeURL: shimURL, siteID, token })).toString("base64");
  let stopped = false;
  return {
    dir, context,
    store: (name) => getStore({ name, siteID, token, edgeURL: shimURL, uncachedEdgeURL: shimURL, consistency: "strong" }),
    timeline: (key) => timeline.filter((e) => e.id === key),
    snapshot: (key) => ({ conditional: stats.conditional[key] ?? 0, unconditional: stats.unconditional[key] ?? 0, conflicts: stats.conflicts[key] ?? 0 }),
    async stop() {
      if (stopped) return; stopped = true;
      server.closeAllConnections?.(); await new Promise((r) => server.close(r));
      await backend.stop(); await fs.rm(dir, { recursive: true, force: true });
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

/** A Blobs-driver adatai a szimulátorban (az előtéten át). */
export function blobsAdapter(blobs) {
  const site = blobs.store("site"), backups = blobs.store("backups");
  return {
    label: "blobs",
    readDoc: () => site.get("site", { type: "json" }),
    writeDoc: (d) => site.setJSON("site", d),
    records: async (kind) => {
      const { blobs: list } = await site.list({ prefix: `${kind}/` });
      return (await Promise.all(list.map((b) => site.get(b.key, { type: "json" })))).filter(Boolean);
    },
    putRecord: (kind, rec) => site.setJSON(`${kind}/${rec.id}`, rec),
    backups: async () => (await backups.list()).blobs.map((b) => b.key).filter((n) => BACKUP_RE.test(n)).sort().reverse(),
    readBackup: (name) => backups.get(name, { type: "json" }),
    putBackup: (name, data) => backups.setJSON(name, data),
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
  /* Aszinkron indítás: a Blobs-előtét ebben a folyamatban fut — egy spawnSync megállítaná, és a gyerek örökké rá várna. */
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--no-warnings", "--import", "data:text/javascript," + encodeURIComponent(register), "--input-type=module", "-e", main], { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", (d) => { stdout += d; }); child.stderr.on("data", (d) => { stderr += d; });
    const timer = setTimeout(() => child.kill("SIGKILL"), 120_000);
    child.on("close", (status, signal) => { clearTimeout(timer); resolve({ status, signal, stdout, stderr }); });
  });
}
