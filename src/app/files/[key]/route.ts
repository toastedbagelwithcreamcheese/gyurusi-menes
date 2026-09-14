import { openFile, KEY_RE } from "@/lib/files";

/**
 * /files/<kulcs> — feltöltött kép vagy PDF, streamelve (a tárból, illetve helyben a lemezről), pontos Content-Length-szel.
 * Netlify-on a streamelt függvényválasz legfeljebb 20 MB — ezért legfeljebb 18 MB-os PDF tölthető fel (src/lib/upload-limits.ts).
 * A kulcs egyedi, ezért a válasz egy évig gyorsítótárazható.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!KEY_RE.test(key)) return new Response("Not found", { status: 404 });
  const f = await openFile(key);
  if (!f) return new Response("Not found", { status: 404 });
  return new Response(f.body as BodyInit, {
    headers: {
      "content-type": f.type,
      "content-length": String(f.size),
      /* A kulcs egyedi: a böngésző egy évig tarthatja. A Netlify CDN (durable cache) csak egy óráig —
         különben egy törölt fájl egy évig kiszolgálható maradna a cache-ből. */
      "cache-control": "public, max-age=31536000, immutable",
      "netlify-cdn-cache-control": "public, max-age=3600",
      "x-content-type-options": "nosniff",
      "content-disposition": `inline; filename="${key}"`,
    },
  });
}
