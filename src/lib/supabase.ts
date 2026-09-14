import http from "node:http";
import https from "node:https";
import { Readable } from "node:stream";

/**
 * Supabase-kapcsolat — KIZÁRÓLAG szerveroldalon, a service_role kulccsal (SUPABASE_SERVICE_ROLE_KEY): PostgREST (táblák) és Storage (fájlok).
 * SDK nélkül, node:http(s)-sel, mert:
 *   · a Next a globális fetch-et becsomagolja: egy ISR-lap renderelése közben a GET-ek adat-gyorsítótárba kerülhetnek, a
 *     `cache: "no-store"` pedig dinamikussá tenné a lapot — az adatréteg ne szóljon bele a lapok gyorsítótárazásába;
 *   · a napi Netlify-függvény (netlify/functions/) a Next nélkül is betölti ezt a modult (relatív importok, next/* nélkül).
 * A séma: supabase/migrations/*.sql (a Supabase SQL Editorban futtatandó). A táblákon RLS van, szabály nélkül: az anon kulcs semmit nem ér el.
 */

/** Be van-e állítva a Supabase (URL + service_role kulcs). */
export const supabaseConfigured = () => !!(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
/** A tár-driver: Supabase, ha be van állítva és a STORE_DRIVER nem „file”; különben a helyi fájl-driver (data/). */
export const supabaseActive = () => process.env.STORE_DRIVER?.trim().toLowerCase() !== "file" && supabaseConfigured();
/** Netlify-on (read-only fájlrendszer) adatbázis nélkül nem lehet írni — a hibaüzenet megmondja, mit kell beállítani. */
export const databaseMissingOnNetlify = () => process.env.NETLIFY === "true" && !supabaseActive();
export const DATABASE_MISSING_MESSAGE = "Az adatbázis nincs beállítva: add meg a SUPABASE_URL és a SUPABASE_SERVICE_ROLE_KEY változót a Netlify-on, majd deployold újra az oldalt.";

/* Paraméter-tulajdonság (readonly a konstruktorban) nélkül: a napi Netlify-függvényt a tesztek típuslehántással futtatják, az azt nem ismeri. */
export class SupabaseError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) { super(message); this.name = "SupabaseError"; this.status = status; this.code = code; }
}

const TIMEOUT_MS = 20_000;
const agents = { http: new http.Agent({ keepAlive: true, maxSockets: 24 }), https: new https.Agent({ keepAlive: true, maxSockets: 24 }) };
const baseUrl = () => (process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const authHeaders = () => { const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim(); return { apikey: key, authorization: `Bearer ${key}` }; };

type Raw = { status: number; headers: http.IncomingHttpHeaders; stream: http.IncomingMessage };

function request(method: string, path: string, headers: Record<string, string>, body?: Buffer): Promise<Raw> {
  const url = new URL(baseUrl() + path);
  const mod = url.protocol === "http:" ? http : https;
  return new Promise((resolve, reject) => {
    const req = mod.request(url, {
      method, agent: url.protocol === "http:" ? agents.http : agents.https,
      headers: { ...authHeaders(), ...headers, ...(body ? { "content-length": String(body.byteLength) } : {}) },
    }, (res) => resolve({ status: res.statusCode ?? 0, headers: res.headers, stream: res }));
    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error(`időtúllépés (${TIMEOUT_MS / 1000} s)`)));
    req.on("error", reject);
    req.end(body);
  });
}

async function readAll(stream: Readable): Promise<Buffer> {
  const parts: Buffer[] = [];
  for await (const c of stream) parts.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(parts);
}

/** A PostgREST / Storage hibaválaszából olvasható, teendőt mondó üzenet. */
function failure(what: string, status: number, body: Buffer): SupabaseError {
  let j: { message?: string; error?: string; hint?: string; code?: string; statusCode?: string | number } = {};
  try { j = JSON.parse(body.toString("utf8")); } catch { /* nem JSON */ }
  const code = j.code ?? (j.statusCode !== undefined ? String(j.statusCode) : undefined);
  let detail = [j.message ?? j.error, j.hint].filter(Boolean).join(" — ") || body.toString("utf8").slice(0, 200);
  if (code === "42P01" || code === "PGRST205" || /relation .* does not exist|Could not find the table/i.test(detail)) {
    detail += " — a tábla nem létezik: futtasd le a supabase/migrations mappa SQL-jét a Supabase SQL Editorban";
  } else if (status === 401 || status === 403) {
    detail += " — ellenőrizd a SUPABASE_SERVICE_ROLE_KEY értékét (a service_role kulcs kell, nem az anon)";
  }
  return new SupabaseError(`Adatbázis-hiba (${what}): HTTP ${status}${detail ? ` — ${detail}` : ""}`, status, code);
}

async function call(what: string, method: string, path: string, headers: Record<string, string> = {}, body?: Buffer): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  if (!supabaseConfigured()) throw new SupabaseError(DATABASE_MISSING_MESSAGE, 0);
  let res: Raw;
  try { res = await request(method, path, headers, body); }
  catch (e) { throw new SupabaseError(`Adatbázis-hiba (${what}): a Supabase nem érhető el — ${e instanceof Error ? e.message : e}`, 0); }
  const buf = await readAll(res.stream);
  if (res.status >= 400) throw failure(what, res.status, buf);
  return { status: res.status, headers: res.headers, body: buf };
}

/* ------------------------------------------------------------------ táblák (PostgREST) */

const enc = encodeURIComponent;
/** Szűrő-érték idézőjelek közt (vessző, pont, zárójel is lehet benne) — az `in.(…)` listához. */
export const inList = (values: string[]) => `in.(${values.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(",")})`;
export const eq = (v: string | number | boolean) => `eq.${enc(String(v))}`;

async function json<T>(what: string, method: string, table: string, query: string, prefer: string[], payload?: unknown): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
  if (prefer.length) headers.prefer = prefer.join(",");
  const r = await call(what, method, `/rest/v1/${table}${query ? `?${query}` : ""}`, headers, payload === undefined ? undefined : Buffer.from(JSON.stringify(payload)));
  const text = r.body.toString("utf8");
  return (text ? JSON.parse(text) : []) as T;
}

export const db = {
  /** SELECT — a query PostgREST-szintaxisú (pl. `id=eq.site&select=data,version`). */
  select: <T>(table: string, query: string) => json<T[]>(`${table} olvasása`, "GET", table, query, []),
  /** INSERT … ON CONFLICT DO NOTHING — a ténylegesen beszúrt sorok (üres, ha a kulcs már foglalt). */
  insertIgnore: <T>(table: string, conflict: string, rows: unknown) =>
    json<T[]>(`${table} írása`, "POST", table, `on_conflict=${enc(conflict)}`, ["resolution=ignore-duplicates", "return=representation"], rows),
  /** INSERT … ON CONFLICT DO UPDATE (feltétel nélküli felülírás). */
  upsert: (table: string, conflict: string, rows: unknown) =>
    json<unknown[]>(`${table} írása`, "POST", table, `on_conflict=${enc(conflict)}`, ["resolution=merge-duplicates", "return=minimal"], rows),
  /** UPDATE a szűrőre — a módosított sorok (üres, ha a feltétel, pl. a version, közben megváltozott). */
  update: <T>(table: string, filter: string, patch: unknown) => json<T[]>(`${table} módosítása`, "PATCH", table, filter, ["return=representation"], patch),
  /** DELETE a szűrőre — a törölt sorok (a `select` csak a kért oszlopokat adja vissza). */
  remove: <T>(table: string, filter: string, select = "*") => json<T[]>(`${table} törlése`, "DELETE", table, `${filter}&select=${select}`, ["return=representation"]),
};

/** Ütközésbiztos kulcs–érték tár (kv tábla): olvasás verzióval, beszúrás csak szabad kulcsra, módosítás csak változatlan verzióra. */
export const kv = {
  async get<T>(key: string): Promise<{ value: T; version: number } | null> {
    const rows = await db.select<{ value: T; version: number }>("kv", `key=${eq(key)}&select=value,version`);
    return rows[0] ?? null;
  },
  async insert(key: string, value: unknown): Promise<boolean> {
    return (await db.insertIgnore("kv", "key", { key, value })).length === 1;
  },
  async update(key: string, value: unknown, version: number): Promise<boolean> {
    return (await db.update("kv", `key=${eq(key)}&version=${eq(version)}`, { value, version: version + 1, updated_at: new Date().toISOString() })).length === 1;
  },
  /** Feltétel nélküli beállítás, a verzió léptetésével (a feltételes írók így észreveszik). */
  async set(key: string, value: unknown): Promise<void> {
    for (let i = 0; i < 8; i++) {
      const cur = await kv.get(key);
      if (cur ? await kv.update(key, value, cur.version) : await kv.insert(key, value)) return;
    }
    throw new Error(`A(z) ${key} beállítást többszöri próbálkozásra sem sikerült menteni.`);
  },
};

/* ------------------------------------------------------------------ fájltár (Storage) */

const objectPath = (key: string) => key.split("/").map(enc).join("/");
const isMissing = (e: unknown) => e instanceof SupabaseError && (e.status === 404 || e.code === "404" || /not.?found/i.test(e.message));
const isDuplicate = (e: unknown) => e instanceof SupabaseError && (e.status === 409 || e.code === "409" || /duplicate|already exists/i.test(e.message));

export const storage = {
  /** Feltöltés. `upsert: false` mellett a foglalt kulcs `false`-t ad (nem ír felül). */
  async put(bucket: string, key: string, data: Buffer, contentType: string, opts: { upsert?: boolean } = {}): Promise<boolean> {
    try {
      await call(`fájl feltöltése (${bucket}/${key})`, "POST", `/storage/v1/object/${bucket}/${objectPath(key)}`,
        { "content-type": contentType, "x-upsert": opts.upsert ? "true" : "false", "cache-control": "max-age=3600" }, data);
      return true;
    } catch (e) { if (!opts.upsert && isDuplicate(e)) return false; throw e; }
  },
  /** Letöltés egyben. `null`, ha nincs ilyen fájl. */
  async get(bucket: string, key: string): Promise<Buffer | null> {
    try { return (await call(`fájl olvasása (${bucket}/${key})`, "GET", `/storage/v1/object/${bucket}/${objectPath(key)}`)).body; }
    catch (e) { if (isMissing(e) || (e instanceof SupabaseError && e.status === 400)) return null; throw e; }
  },
  /** Letöltés streamelve, a méret a Content-Length-ből. `null`, ha nincs ilyen fájl. */
  async open(bucket: string, key: string): Promise<{ body: ReadableStream<Uint8Array>; size: number | null } | null> {
    if (!supabaseConfigured()) throw new SupabaseError(DATABASE_MISSING_MESSAGE, 0);
    const res = await request("GET", `/storage/v1/object/${bucket}/${objectPath(key)}`, {});
    if (res.status >= 400) {
      const buf = await readAll(res.stream);
      if (res.status === 400 || res.status === 404) return null;
      throw failure(`fájl olvasása (${bucket}/${key})`, res.status, buf);
    }
    const len = Number(res.headers["content-length"]);
    return { body: Readable.toWeb(res.stream) as unknown as ReadableStream<Uint8Array>, size: Number.isInteger(len) && len >= 0 ? len : null };
  },
  /** Törlés (több kulcs egyszerre). A nem létező kulcs nem hiba. */
  async remove(bucket: string, keys: string[]): Promise<number> {
    if (!keys.length) return 0;
    const r = await call(`fájl törlése (${bucket})`, "DELETE", `/storage/v1/object/${bucket}`, { "content-type": "application/json" }, Buffer.from(JSON.stringify({ prefixes: keys })));
    try { const arr = JSON.parse(r.body.toString("utf8")); return Array.isArray(arr) ? arr.length : 0; } catch { return 0; }
  },
  /** Egy „mappa” tartalma: fájlok (`folder: false`) és almappák (`folder: true`), név szerint. */
  async list(bucket: string, prefix = ""): Promise<{ name: string; folder: boolean }[]> {
    const out: { name: string; folder: boolean }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const r = await call(`fájllista (${bucket}/${prefix})`, "POST", `/storage/v1/object/list/${bucket}`, { "content-type": "application/json" },
        Buffer.from(JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } })));
      const items = JSON.parse(r.body.toString("utf8")) as { name: string; id: string | null }[];
      out.push(...items.map((i) => ({ name: i.name, folder: i.id === null })));
      if (items.length < 1000) return out;
    }
  },
};
