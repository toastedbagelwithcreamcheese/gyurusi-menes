import { ImageResponse } from "next/og";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const alt = "Gyűrűsi Ménes – hucul lovak a zalai dombok között";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  /* Satori nem dekódol WebP-t: a mester-fotót sharp-pal JPEG-gé alakítjuk a méretre vágva. */
  const buf = await sharp(await fs.readFile(path.join(process.cwd(), "public/images/photos/dron-naplemente-v.webp")))
    .resize(1200, 630, { fit: "cover", position: "centre" }).jpeg({ quality: 80 }).toBuffer();
  const src = `data:image/jpeg;base64,${buf.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: "Georgia, serif" }}>
        
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,18,15,0) 30%, rgba(20,18,15,0.82) 100%)" }} />
        <div style={{ position: "absolute", left: 64, right: 64, bottom: 56, display: "flex", flexDirection: "column", color: "#f3efe6" }}>
          <div style={{ fontSize: 22, letterSpacing: 4, textTransform: "uppercase", opacity: 0.85, fontFamily: "sans-serif" }}>Gyűrűsi Ménes · Zala</div>
          <div style={{ fontSize: 64, lineHeight: 1.05, marginTop: 12 }}>Hucul lovak a zalai dombok között</div>
        </div>
      </div>
    ),
    size,
  );
}
