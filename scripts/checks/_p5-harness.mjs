/**
 * Közös segédek a P5 kapuszkriptekhez (p5-mail, p5-reviews): build, saját `next start` a PORT-on (alap 3041),
 * tiszta környezet, helyi DB-visszaállítás, rekurzív tár-keresés. Nem kapu: nem ír PASS-t.
 * A szkriptek csak a SAJÁT portjukon futó listenert állítják le — más portot nem bántanak.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const PORT = process.env.PORT ?? "3041";
export const BASE = `http://localhost:${PORT}`;
export const CHROME = process.env.PW_CHROME ?? path.join(os.homedir(), "Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const NEXT_BIN = path.join(ROOT, "node_modules/next/dist/bin/next");

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export class CheckFail extends Error {}
/** Hibás állítás: kivétel, hogy a szkript `finally` ága mindent leállítson és a DB-t visszaállítsa. */
export const fail = (m) => { throw new CheckFail(m); };
export const assert = (cond, m) => { if (!cond) fail(m); };

/** A folyamat környezete a próbához: a gépen beállított integrációs változók NEM szivároghatnak be. */
export function cleanEnv(extra = {}) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(GOOGLE_|RESEND_|CONTACT_|NETLIFY|ADMIN_|BASE_URL$|NEXT_PUBLIC_SITE_URL$)/.test(k)));
  /* A Next a .env.local-ból csak a folyamatban NEM létező kulcsot tölti be — a törlés tehát nem elég, a fő repóban a
     .env.local CONTACT_TO/CONTACT_FROM értéke beszivárogna. Üres érték = beállítatlan (a kód mindenhol `?.trim() ||`-t használ). */
  const blank = Object.fromEntries(["RESEND_API_KEY", "RESEND_API_BASE", "RESEND_API_URL", "CONTACT_TO", "CONTACT_FROM", "GOOGLE_PLACES_KEY", "GOOGLE_PLACE_ID", "GOOGLE_PLACES_API_BASE", "ADMIN_USER", "ADMIN_PASSWORD", "ADMIN_SESSION_SECRET"].map((k) => [k, ""]));
  /* Jelszó nélkül a production build admin-ja zárva (fail-closed): a próbák (állapotpanel, revalidate) a nyitott demót kérik. */
  return { ...env, ...blank, ADMIN_OPEN_DEMO: "1", ...extra, PORT };
}

/** Friss production build a megadott környezettel (a `P5_SKIP_BUILD=1` csak fejlesztés közbeni gyors ismétléshez). */
export function build(env, label) {
  if (process.env.P5_SKIP_BUILD === "1") { console.log(`(build kihagyva: ${label})`); return; }
  const t = Date.now();
  const r = spawnSync(process.execPath, [NEXT_BIN, "build"], { cwd: ROOT, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) fail(`a build elbukott (${label}):\n${(r.stdout + r.stderr).split("\n").slice(-40).join("\n")}`);
  console.log(`build kész (${label}), ${((Date.now() - t) / 1000).toFixed(1)} s`);
}

export function killPort() {
  spawnSync("sh", ["-c", `lsof -ti tcp:${PORT} -sTCP:LISTEN | xargs kill -9 2>/dev/null`], { stdio: "ignore" });
}

/** `next start` a PORT-on; visszaadja a leállítót és a naplót (hibánál ebből idézünk). */
export async function startNext(env) {
  killPort();
  let log = "";
  const child = spawn(process.execPath, [NEXT_BIN, "start", "-p", PORT], { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", (c) => { log += c; });
  child.stderr.on("data", (c) => { log += c; });
  let exited = false; child.on("exit", () => { exited = true; });
  for (let i = 0; i < 120; i++) {
    if (exited) fail(`a next start kilépett:\n${log.slice(-2000)}`);
    try { const r = await fetch(`${BASE}/`, { redirect: "manual" }); if (r.status < 500) break; } catch { /* még indul */ }
    await sleep(500);
    if (i === 119) fail(`a next start nem indult el 60 s alatt:\n${log.slice(-2000)}`);
  }
  /* P7: a nyilvános lapok ISR-gyorsítótára a közös .next könyvtárban él — induláskor minden nyilvános lap érvénytelen, hogy egy
     korábbi futás (más adatbázis, más kulcs) lapja ne jöjjön. */
  {
    const auth = env.ADMIN_PASSWORD ? { authorization: `Basic ${Buffer.from(`${env.ADMIN_USER ?? ""}:${env.ADMIN_PASSWORD}`).toString("base64")}` } : {};
    const rv = await fetch(`${BASE}/api/admin/revalidate`, { method: "POST", headers: auth }).catch((e) => ({ ok: false, status: String(e) }));
    if (!rv.ok) fail(`a nyilvános lapok érvénytelenítése induláskor nem sikerült (${rv.status})`);
  }
  return {
    log: () => log,
    stop: async () => { if (!exited) { child.kill("SIGTERM"); for (let i = 0; i < 20 && !exited; i++) await sleep(100); } killPort(); },
  };
}

export function dbReset() {
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts/db-reset.mjs")], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) fail(`db:reset elbukott: ${r.stderr}`);
}

/** Egy kifejezés szerepel-e a szövegben: sztring pontosan, RegExp mintaként (pl. szám hex-hash-részlet nélkül). */
export const hasNeedle = (text, n) => (n instanceof RegExp ? new RegExp(n.source, n.flags.replace("g", "")).test(text) : text.includes(String(n)));

/** Rekurzív keresés: mely fájlokban szerepel valamelyik kifejezés (bájt-szinten, a JSON-ban tárolt szövegre is). */
export async function scanDir(dir, needles) {
  const hits = [];
  if (!existsSync(dir)) return hits;
  const walk = async (d) => {
    for (const e of await fs.readdir(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { await walk(p); continue; }
      if (!e.isFile()) continue;
      const st = await fs.stat(p);
      if (st.size > 128 * 1024 * 1024) fail(`túl nagy fájl a keresésben, nem hagyjuk ki csendben: ${p}`);
      const buf = await fs.readFile(p);
      let latin;
      for (const n of needles) {
        const hit = n instanceof RegExp ? hasNeedle((latin ??= buf.toString("latin1")), n) : buf.includes(Buffer.from(String(n), "utf8"));
        if (hit) hits.push({ file: path.relative(ROOT, p), needle: String(n) });
      }
    }
  };
  await walk(dir);
  return hits;
}

/** JSON-kérés a futó szerverre. */
export async function api(p, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(BASE + p, { method, redirect: "manual", headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* nem JSON */ }
  return { status: res.status, headers: res.headers, text, json };
}

/** Feltétel várása (a böngészős és a hálózati lépésekhez). */
export async function waitFor(fn, timeout = 10000, step = 100) {
  const t = Date.now();
  for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t > timeout) return v; await sleep(step); }
}
