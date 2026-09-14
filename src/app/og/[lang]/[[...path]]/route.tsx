import { ImageResponse } from "next/og";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { isLang } from "@/content/types";
import { openFile } from "@/lib/files";
import { resolveImage } from "@/lib/images";
import { describe, OG_SIZE, SITE_NAME } from "@/lib/seo";
import { readSite } from "@/lib/store";

/**
 * Lapfüggő megosztási kép (1200×630): a lap fejlécképe, a lap címe az adott nyelven és a márka.
 * /og/<nyelv>[/<lap útvonala>] — pl. /og/hu, /og/de/turak, /og/en/esemenyek/<id>. A `?v=` ujjlenyomatot a
 * metaadat teszi hozzá (seo.ts), így tartalomváltozáskor új URL-t kap. JPEG-ként megy ki: PNG-ben egy fotó
 * 1 MB fölé nőne, a WhatsApp-előnézet pedig ~300 KB fölött nem jelenik meg.
 */

/* A Satori sem woff2-t, sem változtatható betűt nem olvas: a Fraunces rögzített példánya (scripts/og-font.py). */
const FONT = fs.readFile(path.join(process.cwd(), "src/fonts/fraunces-og.ttf"));
const HORSE = "M6 26c1-7 4-12 9-15l2-5 3 4c3 1 5 3 6 7l-4-1c-1 4-4 8-8 10H6z";
const BONE = "#f7f4ee", FOREST = "#2d4a37", STRAW = "#d9c48f";
const FULL = { position: "absolute", top: 0, left: 0, width: OG_SIZE.width, height: OG_SIZE.height } as const;

/** A fejléckép a kártya méretére vágva, JPEG data-URL-ként — a Satori WebP-t nem dekódol. */
async function backdrop(src: string): Promise<string | null> {
  try {
    let raw: Uint8Array | null = null;
    if (src.startsWith("/files/")) {
      /* A P2 óta a fájltár streamet ad (openFile); a feltöltött kép legfeljebb 4 MB, egyben beolvasható. */
      const f = await openFile(src.slice("/files/".length));
      if (f) raw = f.body instanceof Uint8Array ? f.body : new Uint8Array(await new Response(f.body).arrayBuffer());
    }
    else if (src.startsWith("/images/") && !src.includes("..")) raw = await fs.readFile(path.join(process.cwd(), "public", src));
    if (!raw) return null;
    const jpg = await sharp(raw).resize(OG_SIZE.width, OG_SIZE.height, { fit: "cover", position: "centre" }).jpeg({ quality: 84 }).toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch (e) {
    console.warn("[og] a háttérkép nem olvasható:", src, e instanceof Error ? e.message : e);
    return null;
  }
}

const titleSize = (s: string) => (s.length <= 22 ? 96 : s.length <= 38 ? 80 : s.length <= 60 ? 64 : 54);

export async function GET(_req: Request, { params }: { params: Promise<{ lang: string; path?: string[] }> }) {
  const { lang, path: segs = [] } = await params;
  if (!isLang(lang)) return new Response("Not found", { status: 404 });
  const site = await readSite();
  const x = describe(site, lang, `/${segs.join("/")}`);
  if (!x) return new Response("Not found", { status: 404 });
  const im = resolveImage(x.og.imageId, site);
  const [font, bg] = await Promise.all([FONT, im ? backdrop(im.src) : Promise.resolve(null)]);

  const card = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", backgroundColor: FOREST, color: BONE, fontFamily: "Fraunces" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a Satori csak sima <img>-et ismer */}
        {bg && <img src={bg} alt="" width={OG_SIZE.width} height={OG_SIZE.height} style={{ ...FULL, objectFit: "cover" }} />}
        <div style={{ ...FULL, display: "flex", backgroundImage: "linear-gradient(180deg, rgba(20,18,15,0.6) 0%, rgba(20,18,15,0) 28%, rgba(20,18,15,0.3) 52%, rgba(20,18,15,0.92) 100%)" }} />
        <div style={{ position: "absolute", top: 52, left: 64, display: "flex", alignItems: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: FOREST, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="40" height="40" viewBox="0 0 32 32"><path d={HORSE} fill={BONE} /></svg>
          </div>
          <div style={{ marginLeft: 18, fontSize: 38, letterSpacing: -0.5 }}>{SITE_NAME}</div>
        </div>
        <div style={{ position: "absolute", left: 64, right: 64, bottom: 60, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 28, opacity: 0.92 }}>
            <div style={{ width: 44, height: 3, backgroundColor: STRAW, marginRight: 16 }} />
            {x.og.eyebrow}
          </div>
          <div style={{ marginTop: 18, fontSize: titleSize(x.og.title), lineHeight: 1.04, letterSpacing: -1.5 }}>{x.og.title}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: [{ name: "Fraunces", data: font, weight: 500, style: "normal" }] },
  );
  const jpeg = await sharp(Buffer.from(await card.arrayBuffer())).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "content-type": "image/jpeg",
      "content-length": String(jpeg.length),
      /* Az URL a tartalom ujjlenyomatát hordozza, ezért a CDN nyugodtan tarthatja egy napig. */
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
