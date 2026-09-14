import fs from "node:fs/promises";
import path from "node:path";
import { getStore } from "@netlify/blobs";
import { blobsAvailable, dataDir, writeFileAtomic } from "./store";

/**
 * Darabolt feltöltés (PDF-beszámolók): a böngésző 3,5 MB-os darabokban küldi a fájlt (/api/admin/upload-chunk),
 * a végén a szerver összefűzi (/api/admin/upload-complete). A darabok helye:
 *   · Netlify Blobs „files” tár: chunks/<uploadId>/<index> és chunks/<uploadId>/manifest;
 *   · helyben: data/files/chunks/<uploadId>/<index> és …/manifest.
 * A leíró (manifest) az első beérkező darab ELŐTT íródik: a karbantartás ebből tudja, mikor kezdődött a feltöltés,
 * és a 24 óránál régebbi, félbemaradt feltöltéseket törli (runMaintenance). A /files/<kulcs> ezeket nem szolgálja ki (KEY_RE).
 * Relatív importok, next/* nélkül: a napi Netlify-függvény (karbantartás) a Next nélkül is betölti.
 */

export const UPLOAD_ID_RE = /^[a-z0-9]{16,48}$/;
export const CHUNK_RETENTION_MS = 24 * 3600_000;
export type ChunkManifest = { startedAt: string; name: string; total: number; size: number };

const store = () => getStore({ name: "files", consistency: "strong" });
const localDir = (id?: string) => path.join(dataDir(), "files", "chunks", ...(id ? [id] : []));
const blobKey = (id: string, part: number | "manifest") => `chunks/${id}/${part}`;
const toArrayBuffer = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

export const isPdf = (b: Uint8Array) => b.byteLength >= 5 && Buffer.from(b.subarray(0, 5)).toString("latin1") === "%PDF-";

/** Egy darab mentése. Az újraküldött darab felülírja a korábbit (a kliens egyszer újrapróbál). */
export async function putChunk(id: string, index: number, data: Buffer, info: Omit<ChunkManifest, "startedAt">, now = new Date()): Promise<void> {
  const manifest: ChunkManifest = { startedAt: now.toISOString(), ...info };
  if (blobsAvailable()) {
    await store().setJSON(blobKey(id, "manifest"), manifest, { onlyIfNew: true }); // a már meglévő kezdési időt nem írja felül
    await store().set(blobKey(id, index), toArrayBuffer(data));
    return;
  }
  await writeFileAtomic(path.join(localDir(id), "manifest"), JSON.stringify(manifest), { exclusive: true });
  await fs.writeFile(path.join(localDir(id), String(index)), data);
}

export async function readManifest(id: string): Promise<ChunkManifest | null> {
  if (blobsAvailable()) return ((await store().get(blobKey(id, "manifest"), { type: "json" })) as ChunkManifest | null) ?? null;
  try { return JSON.parse(await fs.readFile(path.join(localDir(id), "manifest"), "utf8")) as ChunkManifest; }
  catch { return null; }
}

/** A darabok sorrendben, egy pufferbe fűzve; ha egy hiányzik, annak sorszáma (0-tól). */
export async function assembleChunks(id: string, total: number): Promise<{ data: Buffer } | { missing: number }> {
  const parts: Buffer[] = [];
  for (let i = 0; i < total; i++) {
    let part: Buffer | null = null;
    if (blobsAvailable()) { const ab = await store().get(blobKey(id, i), { type: "arrayBuffer" }); part = ab ? Buffer.from(ab) : null; }
    else { try { part = await fs.readFile(path.join(localDir(id), String(i))); } catch { part = null; } }
    if (!part) return { missing: i };
    parts.push(part);
  }
  return { data: Buffer.concat(parts) };
}

/** A feltöltés összes darabja és leírója. Visszaadja, hány bejegyzés (Blobs) / könyvtár (helyben) törlődött — 0, ha már nem volt mit. */
export async function deleteChunks(id: string): Promise<number> {
  if (blobsAvailable()) {
    const { blobs } = await store().list({ prefix: `chunks/${id}/` });
    for (const b of blobs) await store().delete(b.key);
    return blobs.length;
  }
  const existed = await fs.stat(localDir(id)).then(() => 1, () => 0);
  await fs.rm(localDir(id), { recursive: true, force: true });
  return existed;
}

/** A 24 óránál régebben kezdett (vagy leíró nélküli) félbemaradt feltöltések törlése. Visszaadja a törölt feltöltések számát. */
export async function pruneStaleChunks(now = new Date()): Promise<number> {
  let ids: string[];
  if (blobsAvailable()) ids = (await store().list({ prefix: "chunks/", directories: true })).directories.map((d) => d.replace(/\/$/, "").split("/").pop() ?? "");
  else {
    try { ids = await fs.readdir(localDir()); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return 0; throw e; }
  }
  let deleted = 0;
  for (const id of ids.filter((x) => UPLOAD_ID_RE.test(x))) {
    const started = Date.parse((await readManifest(id))?.startedAt ?? "");
    if (Number.isFinite(started) && now.getTime() - started < CHUNK_RETENTION_MS) continue;
    /* Csak a ténylegesen törölt feltöltés számít (egy üres, már törölt „könyvtár” is felbukkanhat a listában). */
    if ((await deleteChunks(id)) > 0) deleted++;
  }
  return deleted;
}
