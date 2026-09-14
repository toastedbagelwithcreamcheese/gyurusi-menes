import fs from "node:fs/promises";
import path from "node:path";
import { dataDir, writeFileAtomic } from "./store";
import { DATABASE_MISSING_MESSAGE, databaseMissingOnNetlify, storage, supabaseActive } from "./supabase";

/**
 * Darabolt feltöltés (PDF-beszámolók): a böngésző 3,5 MB-os darabokban küldi a fájlt (/api/admin/upload-chunk),
 * a végén a szerver összefűzi (/api/admin/upload-complete). A darabok helye:
 *   · Supabase Storage, privát „upload-chunks” tároló: <uploadId>/<index> és <uploadId>/manifest.json;
 *   · helyben: data/files/chunks/<uploadId>/<index> és …/manifest.
 * A leíró (manifest) az első beérkező darab ELŐTT íródik: a karbantartás ebből tudja, mikor kezdődött a feltöltés,
 * és a 24 óránál régebbi, félbemaradt feltöltéseket törli (runMaintenance). A /files/<kulcs> ezeket nem szolgálja ki (KEY_RE).
 * Relatív importok, next/* nélkül: a napi Netlify-függvény (karbantartás) a Next nélkül is betölti.
 */

export const UPLOAD_ID_RE = /^[a-z0-9]{16,48}$/;
export const CHUNK_RETENTION_MS = 24 * 3600_000;
export type ChunkManifest = { startedAt: string; name: string; total: number; size: number };

const BUCKET = "upload-chunks";
const MANIFEST = "manifest.json";
const localDir = (id?: string) => path.join(dataDir(), "files", "chunks", ...(id ? [id] : []));

export const isPdf = (b: Uint8Array) => b.byteLength >= 5 && Buffer.from(b.subarray(0, 5)).toString("latin1") === "%PDF-";

/** Egy darab mentése. Az újraküldött darab felülírja a korábbit (a kliens egyszer újrapróbál). */
export async function putChunk(id: string, index: number, data: Buffer, info: Omit<ChunkManifest, "startedAt">, now = new Date()): Promise<void> {
  const manifest: ChunkManifest = { startedAt: now.toISOString(), ...info };
  if (supabaseActive()) {
    /* Csak szabad kulcsra: a már meglévő kezdési időt nem írja felül. */
    await storage.put(BUCKET, `${id}/${MANIFEST}`, Buffer.from(JSON.stringify(manifest)), "application/json");
    await storage.put(BUCKET, `${id}/${index}`, data, "application/octet-stream", { upsert: true });
    return;
  }
  if (databaseMissingOnNetlify()) throw new Error(DATABASE_MISSING_MESSAGE);
  await writeFileAtomic(path.join(localDir(id), "manifest"), JSON.stringify(manifest), { exclusive: true });
  await fs.writeFile(path.join(localDir(id), String(index)), data);
}

export async function readManifest(id: string): Promise<ChunkManifest | null> {
  if (supabaseActive()) {
    const buf = await storage.get(BUCKET, `${id}/${MANIFEST}`);
    try { return buf ? (JSON.parse(buf.toString("utf8")) as ChunkManifest) : null; } catch { return null; }
  }
  try { return JSON.parse(await fs.readFile(path.join(localDir(id), "manifest"), "utf8")) as ChunkManifest; }
  catch { return null; }
}

/** A darabok sorrendben, egy pufferbe fűzve; ha egy hiányzik, annak sorszáma (0-tól). */
export async function assembleChunks(id: string, total: number): Promise<{ data: Buffer } | { missing: number }> {
  const parts: Buffer[] = [];
  for (let i = 0; i < total; i++) {
    let part: Buffer | null = null;
    if (supabaseActive()) part = await storage.get(BUCKET, `${id}/${i}`);
    else { try { part = await fs.readFile(path.join(localDir(id), String(i))); } catch { part = null; } }
    if (!part) return { missing: i };
    parts.push(part);
  }
  return { data: Buffer.concat(parts) };
}

/** A feltöltés összes darabja és leírója. Visszaadja, hány fájl (Supabase) / könyvtár (helyben) törlődött — 0, ha már nem volt mit. */
export async function deleteChunks(id: string): Promise<number> {
  if (supabaseActive()) {
    const keys = (await storage.list(BUCKET, id)).filter((i) => !i.folder).map((i) => `${id}/${i.name}`);
    await storage.remove(BUCKET, keys);
    return keys.length;
  }
  const existed = await fs.stat(localDir(id)).then(() => 1, () => 0);
  await fs.rm(localDir(id), { recursive: true, force: true });
  return existed;
}

/** A 24 óránál régebben kezdett (vagy leíró nélküli) félbemaradt feltöltések törlése. Visszaadja a törölt feltöltések számát. */
export async function pruneStaleChunks(now = new Date()): Promise<number> {
  let ids: string[];
  if (supabaseActive()) ids = (await storage.list(BUCKET, "")).filter((i) => i.folder).map((i) => i.name);
  else {
    try { ids = await fs.readdir(localDir()); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return 0; throw e; }
  }
  let deleted = 0;
  for (const id of ids.filter((x) => UPLOAD_ID_RE.test(x))) {
    const started = Date.parse((await readManifest(id))?.startedAt ?? "");
    if (Number.isFinite(started) && now.getTime() - started < CHUNK_RETENTION_MS) continue;
    /* Csak a ténylegesen törölt feltöltés számít (egy üres, már törölt „mappa” is felbukkanhat a listában). */
    if ((await deleteChunks(id)) > 0) deleted++;
  }
  return deleted;
}
