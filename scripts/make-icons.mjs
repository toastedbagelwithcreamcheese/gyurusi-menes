/**
 * Saját ikonok a márkajelből — a fejléc lófeje (Header.tsx, Footer.tsx) erdőzöld alapon, csontfehéren:
 *   src/app/icon.svg        — böngészőfül (vektor, kör alakú jel)
 *   src/app/favicon.ico     — 16/32/48 px, PNG-t tartalmazó ICO (a Next.js sablon ikonja helyett)
 *   src/app/apple-icon.png  — 180×180, telefon kezdőképernyő (teli négyzet; az iOS maga kerekíti)
 * Futtatás: node scripts/make-icons.mjs — a kimenet a gitben van, csak a jel változásakor kell újra.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "src/app");
const FOREST = "#2d4a37", BONE = "#f7f4ee";
/* A lófej 32×32-es rajzlapon (befoglaló doboz: 6…26 mindkét irányban, a közepe 16,16). */
const HORSE = "M6 26c1-7 4-12 9-15l2-5 3 4c3 1 5 3 6 7l-4-1c-1 4-4 8-8 10H6z";
/* A rajz tömege bal-alsó súlyú: kicsit jobbra-fel toljuk, hogy a körben optikailag középen üljön. */
const scaled = (k) => `translate(16.8 15.4) scale(${k}) translate(-16 -16)`;

/** Kör alakú jel: a ló a kör átmérőjének ~65%-a — 16 px-en is felismerhető maradjon. */
const round = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="${FOREST}"/><path d="${HORSE}" fill="${BONE}" transform="${scaled(1.04)}"/></svg>`;
/** Teli négyzet a kezdőképernyőre: az iOS saját maszkja kerekít, átlátszó sarok ott fekete lenne. */
const square = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32"><rect width="32" height="32" fill="${FOREST}"/><path d="${HORSE}" fill="${BONE}" transform="${scaled(0.95)}"/></svg>`;

const png = (svg) => sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();

/** ICO-konténer PNG-képekkel (Vista óta minden böngésző olvassa): 6 bájt fejléc + 16 bájt/kép + adatok. */
function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, data }, i) => {
    const o = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, o); head.writeUInt8(size >= 256 ? 0 : size, o + 1);
    head.writeUInt8(0, o + 2); head.writeUInt8(0, o + 3);
    head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6);
    head.writeUInt32LE(data.length, o + 8); head.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...images.map((x) => x.data)]);
}

await fs.writeFile(path.join(APP, "icon.svg"), round(32).replace(/ width="32" height="32"/, "") + "\n");
const sizes = [16, 32, 48];
await fs.writeFile(path.join(APP, "favicon.ico"), ico(await Promise.all(sizes.map(async (size) => ({ size, data: await png(round(size)) })))));
await fs.writeFile(path.join(APP, "apple-icon.png"), await png(square(180)));
for (const f of ["icon.svg", "favicon.ico", "apple-icon.png"]) console.log(f, (await fs.stat(path.join(APP, f))).size, "bájt");
