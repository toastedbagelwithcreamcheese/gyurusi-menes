/**
 * Fotók előkészítése: forrás JPEG → átméretezett WebP + manifest (méret, blur-placeholder).
 *   node scripts/prep-images.mjs [--force]
 * A kimenet determinisztikus: public/images/photos/<slug>.webp, src/content/photos.json.
 * A responsive méreteket futásidőben a next/image állítja elő ebből az egy „mester" WebP-ből.
 */
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCE_ROOT, PHOTOS } from "./images.config.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public/images/photos");
const MANIFEST = path.join(ROOT, "src/content/photos.json");
const force = process.argv.includes("--force");

await fs.mkdir(OUT, { recursive: true });
const manifest = {};
let total = 0;

for (const p of PHOTOS) {
  const src = path.join(SOURCE_ROOT, p.src);
  const out = path.join(OUT, `${p.slug}.webp`);
  let exists = false;
  try { await fs.access(out); exists = true; } catch {}

  if (!exists || force) {
    let q = 78;
    let buf;
    for (;;) {
      buf = await sharp(src).rotate().resize({ width: p.maxEdge, height: p.maxEdge, fit: "inside", withoutEnlargement: true }).webp({ quality: q, effort: 5 }).toBuffer();
      if (buf.length <= 420 * 1024 || q <= 60) break;
      q -= 6;
    }
    await fs.writeFile(out, buf);
  }
  const meta = await sharp(out).metadata();
  const tiny = await sharp(out).resize(16).blur(1).webp({ quality: 40 }).toBuffer();
  const { dominant } = await sharp(out).stats();
  const bytes = (await fs.stat(out)).size;
  total += bytes;
  manifest[p.slug] = {
    src: `/images/photos/${p.slug}.webp`,
    width: meta.width, height: meta.height, alt: p.alt, alt_en: p.alt_en, alt_de: p.alt_de, bytes,
    blur: `data:image/webp;base64,${tiny.toString("base64")}`,
    color: `rgb(${dominant.r},${dominant.g},${dominant.b})`,
  };
  console.log(`${exists && !force ? "  " : "✓ "}${p.slug}.webp  ${meta.width}×${meta.height}  ${(bytes/1024).toFixed(0)} KB`);
}
await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
console.log(`\n${PHOTOS.length} kép, összesen ${(total/1024/1024).toFixed(1)} MB → src/content/photos.json`);
