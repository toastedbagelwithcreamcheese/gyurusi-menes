import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { getStore } from "@netlify/blobs";
import { blobsAvailable, dataDir } from "./store";

/**
 * Bináris fájlok (feltöltött képek, PDF-beszámolók) — ugyanaz a két driver, mint a tartalomnál:
 * helyben data/files/<kulcs>, Netlify-on a „files” Blobs-tár. Mindkettőt a /files/<kulcs>
 * útvonal szolgálja ki, így a tartalomban mindig ugyanaz a link áll.
 * A kiszolgálás streamelt (a Netlify-függvény pufferelt válasza 6 MB-nál megállna); a méretet Blobs-on
 * a feltöltéskor mentett metaadatból adjuk vissza, hogy a letöltésnek legyen Content-Length-je.
 * (A darabolt feltöltés ideiglenes darabjai ugyanebben a tárban, a chunks/ alatt élnek: src/lib/chunks.ts.)
 */
const dir = () => path.join(dataDir(), "files");
const TYPES: Record<string, string> = { webp: "image/webp", pdf: "application/pdf", jpg: "image/jpeg", png: "image/png" };
export const KEY_RE = /^[a-z0-9][a-z0-9-]{2,64}\.(webp|pdf|jpg|png)$/;

export function contentTypeOf(key: string) { return TYPES[key.split(".").pop() ?? ""] ?? "application/octet-stream"; }
export const fileUrl = (key: string) => `/files/${key}`;
const store = () => getStore({ name: "files", consistency: "strong" });

export async function putFile(key: string, data: Buffer): Promise<void> {
  if (!KEY_RE.test(key)) throw new Error("Érvénytelen fájlkulcs.");
  if (blobsAvailable()) {
    await store().set(key, data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer, { metadata: { size: data.byteLength } });
    return;
  }
  await fs.mkdir(dir(), { recursive: true });
  await fs.writeFile(path.join(dir(), key), data);
}

export type OpenedFile = { body: ReadableStream<Uint8Array> | Uint8Array; size: number; type: string };

/** A fájl megnyitása kiszolgáláshoz: stream + méret. `null`, ha nincs ilyen. */
export async function openFile(key: string): Promise<OpenedFile | null> {
  if (!KEY_RE.test(key)) return null;
  const type = contentTypeOf(key);
  if (blobsAvailable()) {
    const r = await store().getWithMetadata(key, { type: "stream" });
    if (!r) return null;
    const size = Number(r.metadata?.size);
    if (Number.isInteger(size) && size >= 0) return { body: r.data as ReadableStream<Uint8Array>, size, type };
    /* Méret-metaadat nélküli, korábbi feltöltés (kis kép): egyben olvassuk, hogy pontos Content-Length-je legyen. */
    await r.data.cancel().catch(() => {});
    const ab = await store().get(key, { type: "arrayBuffer" });
    return ab ? { body: new Uint8Array(ab), size: ab.byteLength, type } : null;
  }
  const file = path.join(dir(), key);
  let size: number;
  try { const st = await fs.stat(file); if (!st.isFile()) return null; size = st.size; } catch { return null; }
  return { body: Readable.toWeb(createReadStream(file)) as unknown as ReadableStream<Uint8Array>, size, type };
}

export async function deleteFile(key: string): Promise<void> {
  if (!KEY_RE.test(key)) return;
  if (blobsAvailable()) { await store().delete(key); return; }
  try { await fs.unlink(path.join(dir(), key)); } catch { /* már nincs */ }
}
