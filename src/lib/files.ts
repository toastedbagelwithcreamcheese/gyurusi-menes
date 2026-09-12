import fs from "node:fs/promises";
import path from "node:path";
import { getStore } from "@netlify/blobs";
import { blobsAvailable } from "./store";

/**
 * Bináris fájlok (feltöltött képek, PDF-beszámolók) — ugyanaz a két driver, mint a tartalomnál:
 * helyben data/files/<kulcs>, Netlify-on a „files” Blobs-tár. Mindkettőt a /files/<kulcs>
 * útvonal szolgálja ki, így a tartalomban mindig ugyanaz a link áll.
 */
const DIR = path.join(process.cwd(), "data/files");
const TYPES: Record<string, string> = { webp: "image/webp", pdf: "application/pdf", jpg: "image/jpeg", png: "image/png" };
export const KEY_RE = /^[a-z0-9][a-z0-9-]{2,64}\.(webp|pdf|jpg|png)$/;

export function contentTypeOf(key: string) { return TYPES[key.split(".").pop() ?? ""] ?? "application/octet-stream"; }
export const fileUrl = (key: string) => `/files/${key}`;
const store = () => getStore({ name: "files", consistency: "strong" });

export async function putFile(key: string, data: Buffer): Promise<void> {
  if (!KEY_RE.test(key)) throw new Error("Érvénytelen fájlkulcs.");
  if (blobsAvailable()) { await store().set(key, data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer); return; }
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, key), data);
}

export async function getFile(key: string): Promise<{ body: Uint8Array; type: string } | null> {
  if (!KEY_RE.test(key)) return null;
  const type = contentTypeOf(key);
  if (blobsAvailable()) {
    const ab = await store().get(key, { type: "arrayBuffer" });
    return ab ? { body: new Uint8Array(ab), type } : null;
  }
  try { return { body: new Uint8Array(await fs.readFile(path.join(DIR, key))), type }; } catch { return null; }
}

export async function deleteFile(key: string): Promise<void> {
  if (!KEY_RE.test(key)) return;
  if (blobsAvailable()) { await store().delete(key); return; }
  try { await fs.unlink(path.join(DIR, key)); } catch { /* már nincs */ }
}
