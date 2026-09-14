import { createHash, randomBytes } from "node:crypto";
import { processGlobal, retryPause } from "./store";
import { db, eq, kv, supabaseActive } from "./supabase";

/**
 * Tartós sebességkorlát a nyilvános űrlapokhoz (és a belépés-korláthoz).
 * Élesben a Supabase `rate_limits` táblájában él: a Netlify-függvénypéldányok memóriája nem közös és bármikor újraindul,
 * így a memóriabeli korlát ott hatástalan volna. Helyben (egy folyamat, adatbázis nélkül) a memória elég.
 * A kulcsban soha nincs IP-cím: <hatókör>-<sha256(só + IP) első 24 hex jele>. A só a RATELIMIT_SALT,
 * ha nincs, egy egyszer sorsolt, a `kv` táblában őrzött érték — így beállítás nélkül is titkos marad.
 */

export type HitResult = { ok: boolean; retryAfterMs: number };
type Entry = { hits: number[]; exp: number };
type LimitRow = { hits: number[]; exp: string; version: number };

const SALT_KEY = "ratelimit/salt";
const KEY_RE = /^[a-z0-9][a-z0-9-]{0,80}$/;

/** A látogató IP-je: Netlify-on a CDN saját fejléce (a látogató nem írhatja felül), helyben az x-forwarded-for. */
export function clientIp(req: Request): string {
  return req.headers.get("x-nf-client-connection-ip")?.trim() || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

async function salt(): Promise<string> {
  if (process.env.RATELIMIT_SALT) return process.env.RATELIMIT_SALT;
  if (!supabaseActive()) return processGlobal("ratelimit.salt", () => randomBytes(16).toString("hex"));
  const memo = processGlobal<{ p?: Promise<string> }>("ratelimit.saltDb", () => ({}));
  memo.p ??= (async () => {
    const existing = await kv.get<{ salt?: string }>(SALT_KEY);
    if (existing?.value?.salt) return existing.value.salt;
    const fresh = randomBytes(16).toString("hex");
    /* Több példány egyszerre sorsolhat: csak az első írása marad meg, a többi azt olvassa vissza. */
    if (await kv.insert(SALT_KEY, { salt: fresh })) return fresh;
    const stored = (await kv.get<{ salt?: string }>(SALT_KEY))?.value?.salt;
    if (!stored) throw new Error("a só nem olvasható vissza");
    return stored;
  })().catch((e) => { memo.p = undefined; throw e; });
  return memo.p;
}

/** A korlát kulcsa egy kéréshez: hatókör + az IP sózott hash-e. */
export async function ipKey(req: Request, scope: string): Promise<string> {
  return `${scope}-${createHash("sha256").update((await salt()) + clientIp(req)).digest("hex").slice(0, 24)}`;
}

function evaluate(prev: Entry | null | undefined, now: number, windowMs: number, max: number): { result: HitResult; entry?: Entry } {
  const hits = (Array.isArray(prev?.hits) ? prev.hits : []).filter((t) => typeof t === "number" && now - t < windowMs);
  if (hits.length >= max) return { result: { ok: false, retryAfterMs: Math.max(0, windowMs - (now - Math.min(...hits))) } };
  hits.push(now);
  return { result: { ok: true, retryAfterMs: 0 }, entry: { hits, exp: Math.max(prev?.exp ?? 0, now + windowMs) } };
}

const readRow = async (key: string) => (await db.select<LimitRow>("rate_limits", `key=${eq(key)}&select=hits,exp,version`))[0];
const toEntry = (row: LimitRow | undefined): Entry | null => (row ? { hits: row.hits, exp: Date.parse(row.exp) } : null);

/**
 * Egy „találat” a kulcson: legfeljebb `max` darab az utolsó `windowMs` alatt. Supabase-en feltételes (version) írással,
 * így két egyidejű kérés sem csúszik át. Ha a tár nem elérhető, átenged — a korlát miatt nem veszhet el beküldés.
 */
export async function hit(key: string, windowMs: number, max = 1): Promise<HitResult> {
  if (!KEY_RE.test(key)) throw new Error(`Érvénytelen korlát-kulcs: ${key}`);
  const now = Date.now();
  if (!supabaseActive()) {
    const mem = processGlobal("ratelimit.mem", () => new Map<string, Entry>());
    for (const [k, e] of mem) if (e.exp < now) mem.delete(k);
    const { result, entry } = evaluate(mem.get(key), now, windowMs, max);
    if (entry) mem.set(key, entry);
    return result;
  }
  try {
    for (let i = 0; i < 6; i++) {
      const cur = await readRow(key);
      const { result, entry } = evaluate(toEntry(cur), now, windowMs, max);
      if (!entry) return result;
      const fields = { hits: entry.hits, exp: new Date(entry.exp).toISOString() };
      const saved = cur
        ? await db.update("rate_limits", `key=${eq(key)}&version=${eq(cur.version)}`, { ...fields, version: cur.version + 1 })
        : await db.insertIgnore("rate_limits", "key", { key, ...fields });
      if (saved.length === 1) return result;
      await retryPause(i);
    }
    return { ok: false, retryAfterMs: 1000 }; // ugyanarról a címről egyszerre érkező kérések sora — ez már sorozat
  } catch (err) {
    console.warn("[ratelimit] a tár nem elérhető, a kérés átengedve:", err instanceof Error ? err.message : err);
    return { ok: true, retryAfterMs: 0 };
  }
}

/**
 * Mint a `hit`, de NEM számol új találatot — a belépés-korlát így előre megnézheti, le van-e tiltva a cím, és hány
 * sikertelen próba van az ablakban (`count`). Ha a tár nem elérhető, átenged.
 */
export async function peek(key: string, windowMs: number, max = 1): Promise<HitResult & { count: number }> {
  if (!KEY_RE.test(key)) throw new Error(`Érvénytelen korlát-kulcs: ${key}`);
  const now = Date.now();
  const read = (prev: Entry | null | undefined) => {
    const hits = (Array.isArray(prev?.hits) ? prev.hits : []).filter((t) => typeof t === "number" && now - t < windowMs);
    const blocked = hits.length >= max;
    return { ok: !blocked, retryAfterMs: blocked ? Math.max(0, windowMs - (now - Math.min(...hits))) : 0, count: hits.length };
  };
  if (!supabaseActive()) return read(processGlobal("ratelimit.mem", () => new Map<string, Entry>()).get(key));
  try { return read(toEntry(await readRow(key))); }
  catch (err) {
    console.warn("[ratelimit] a tár nem elérhető, a kérés átengedve:", err instanceof Error ? err.message : err);
    return { ok: true, retryAfterMs: 0, count: 0 };
  }
}

/** Egy kulcs találatainak törlése (pl. sikeres belépés után a sikertelen próbák számlálója). */
export async function resetHits(key: string): Promise<void> {
  if (!KEY_RE.test(key)) throw new Error(`Érvénytelen korlát-kulcs: ${key}`);
  if (!supabaseActive()) { processGlobal("ratelimit.mem", () => new Map<string, Entry>()).delete(key); return; }
  try { await db.remove("rate_limits", `key=${eq(key)}`, "key"); } catch (err) { console.warn("[ratelimit] a számláló nem törölhető:", err instanceof Error ? err.message : err); }
}

/** Az űrlapok formája: `max` beküldés IP-nként `windowMs` alatt, hatókörönként (contact, register…) külön. */
export async function limitByIp(req: Request, scope: string, windowMs: number, max = 1): Promise<HitResult> {
  try { return await hit(await ipKey(req, scope), windowMs, max); }
  catch (err) { console.warn("[ratelimit] a kulcs nem képezhető, a kérés átengedve:", err instanceof Error ? err.message : err); return { ok: true, retryAfterMs: 0 }; }
}

/** Lejárt bejegyzések törlése (a napi karbantartás hívja) — az IP-hash se maradjon meg a szükségesnél tovább. */
export async function pruneRateLimits(now = Date.now()): Promise<number> {
  if (!supabaseActive()) return 0;
  return (await db.remove("rate_limits", `exp=lt.${encodeURIComponent(new Date(now).toISOString())}`, "key")).length;
}
