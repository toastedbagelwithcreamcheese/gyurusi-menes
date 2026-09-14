import { errMsg, guardAdminWrite, jsonError, jsonOk, readBody } from "@/lib/admin-api";
import { UPLOAD_ID_RE, isPdf, putChunk } from "@/lib/chunks";
import { CHUNK_BYTES, PDF_MAX_CHUNKS, PDF_MAX_BYTES, limitMB, pdfTooLargeMessage } from "@/lib/upload-limits";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/upload-chunk?uploadId=…&index=…&total=…&size=…&name=… — egy PDF-darab nyers törzzsel (legfeljebb 3,5 MB).
 * A darab mérete pontosan a várt (a sorrend és a teljesség így a végén ellenőrizhető); az első darabnak PDF-fel kell kezdődnie.
 * A darab a tárba kerül (chunks/<uploadId>/<index>); az összefűzés: /api/admin/upload-complete.
 */
export async function POST(req: Request) {
  const denied = guardAdminWrite(req);
  if (denied) return denied;
  const q = new URL(req.url).searchParams;
  const uploadId = q.get("uploadId") ?? "";
  const index = Number(q.get("index")), total = Number(q.get("total")), size = Number(q.get("size"));
  const name = (q.get("name") ?? "").slice(0, 200);
  if (!UPLOAD_ID_RE.test(uploadId) || !Number.isInteger(size) || size < 1 || !Number.isInteger(total) || total < 1 || !Number.isInteger(index) || index < 0 || index >= total)
    return jsonError(400, "Hibás feltöltési kérés (azonosító, sorszám vagy méret). Töltsd újra a lapot, és próbáld újra.");
  if (size > PDF_MAX_BYTES) return jsonError(413, pdfTooLargeMessage(size));
  if (total !== Math.ceil(size / CHUNK_BYTES) || total > PDF_MAX_CHUNKS) return jsonError(400, "A darabok száma nem egyezik a fájl méretével. Töltsd újra a lapot, és próbáld újra.");

  const expected = index < total - 1 ? CHUNK_BYTES : size - CHUNK_BYTES * (total - 1);
  const body = await readBody(req, CHUNK_BYTES);
  if (!body.ok) return jsonError(413, `A(z) ${index + 1}. darab túl nagy — egy darab legfeljebb ${limitMB(CHUNK_BYTES)} lehet. Töltsd újra a lapot, és próbáld újra.`);
  if (body.data.length !== expected) return jsonError(400, `A(z) ${index + 1}. darab hiányosan érkezett meg (${body.data.length} bájt a várt ${expected} helyett). Próbáld újra.`);
  if (index === 0 && !isPdf(body.data)) return jsonError(415, `Csak PDF tölthető fel — a(z) ${name || "fájl"} tartalma nem PDF-dokumentum.`);

  try { await putChunk(uploadId, index, body.data, { name, total, size }); }
  catch (e) { return jsonError(500, `A(z) ${index + 1}. darab mentése nem sikerült: ${errMsg(e)}`); }
  return jsonOk({ message: `${index + 1}/${total}. darab megérkezett.`, index, bytes: body.data.length });
}
