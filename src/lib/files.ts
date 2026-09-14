import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { dataDir } from "./store";
import { DATABASE_MISSING_MESSAGE, databaseMissingOnNetlify, storage, supabaseActive } from "./supabase";

/**
 * Bináris fájlok (feltöltött képek, PDF-beszámolók) — ugyanaz a két driver, mint a tartalomnál:
 * helyben data/files/<kulcs>, Supabase-en a privát „files” tároló (Storage). Mindkettőt a /files/<kulcs>
 * útvonal szolgálja ki, így a tartalomban mindig ugyanaz a link áll.
 * A kiszolgálás streamelt (a Netlify-függvény pufferelt válasza 6 MB-nál megállna); a méret a tároló Content-Length-jéből jön.
 * (A darabolt feltöltés ideiglenes darabjai az „upload-chunks” tárolóban élnek: src/lib/chunks.ts.)
 */
const dir = () => path.join(dataDir(), "files");
const BUCKET = "files";
const TYPES: Record<string, string> = { webp: "image/webp", pdf: "application/pdf", jpg: "image/jpeg", png: "image/png" };
export const KEY_RE = /^[a-z0-9][a-z0-9-]{2,64}\.(webp|pdf|jpg|png)$/;

export function contentTypeOf(key: string) { return TYPES[key.split(".").pop() ?? ""] ?? "application/octet-stream"; }
export const fileUrl = (key: string) => `/files/${key}`;

export async function putFile(key: string, data: Buffer): Promise<void> {
  if (!KEY_RE.test(key)) throw new Error("Érvénytelen fájlkulcs.");
  if (supabaseActive()) {
    if (!(await storage.put(BUCKET, key, data, contentTypeOf(key)))) throw new Error(`A fájlkulcs már foglalt (${key}).`);
    return;
  }
  if (databaseMissingOnNetlify()) throw new Error(DATABASE_MISSING_MESSAGE);
  await fs.mkdir(dir(), { recursive: true });
  await fs.writeFile(path.join(dir(), key), data);
}

export type OpenedFile = { body: ReadableStream<Uint8Array> | Uint8Array; size: number; type: string };

/** A fájl megnyitása kiszolgáláshoz: stream + méret. `null`, ha nincs ilyen. */
export async function openFile(key: string): Promise<OpenedFile | null> {
  if (!KEY_RE.test(key)) return null;
  const type = contentTypeOf(key);
  if (supabaseActive()) {
    const f = await storage.open(BUCKET, key);
    if (!f) return null;
    if (f.size !== null) return { body: f.body, size: f.size, type };
    /* Content-Length nélküli válasz: egyben olvassuk, hogy pontos méretet adhassunk. */
    const ab = await new Response(f.body).arrayBuffer();
    return { body: new Uint8Array(ab), size: ab.byteLength, type };
  }
  if (databaseMissingOnNetlify()) return null;
  const file = path.join(dir(), key);
  let size: number;
  try { const st = await fs.stat(file); if (!st.isFile()) return null; size = st.size; } catch { return null; }
  return { body: Readable.toWeb(createReadStream(file)) as unknown as ReadableStream<Uint8Array>, size, type };
}

export async function deleteFile(key: string): Promise<void> {
  if (!KEY_RE.test(key)) return;
  if (supabaseActive()) { await storage.remove(BUCKET, [key]); return; }
  if (databaseMissingOnNetlify()) throw new Error(DATABASE_MISSING_MESSAGE);
  try { await fs.unlink(path.join(dir(), key)); } catch { /* már nincs */ }
}
