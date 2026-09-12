import { getFile, KEY_RE } from "@/lib/files";

/** /files/<kulcs> — feltöltött kép vagy PDF. A kulcs egyedi, ezért a válasz egy évig gyorsítótárazható. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!KEY_RE.test(key)) return new Response("Not found", { status: 404 });
  const f = await getFile(key);
  if (!f) return new Response("Not found", { status: 404 });
  const pdf = f.type === "application/pdf";
  return new Response(f.body as unknown as BodyInit, {
    headers: {
      "content-type": f.type,
      "content-length": String(f.body.byteLength),
      /* A kulcs egyedi: a böngésző egy évig tarthatja. A Netlify CDN (durable cache) csak egy óráig —
         különben egy törölt fájl egy évig kiszolgálható maradna a cache-ből. */
      "cache-control": "public, max-age=31536000, immutable",
      "netlify-cdn-cache-control": "public, max-age=3600",
      ...(pdf ? { "content-disposition": `inline; filename="${key}"` } : {}),
    },
  });
}
