import { errMsg, guardAdminWrite, jsonError, jsonOk, readBody, revalidateSite } from "@/lib/admin-api";
import { UPLOAD_ID_RE, assembleChunks, deleteChunks, isPdf, readManifest } from "@/lib/chunks";
import { deleteFile, fileUrl, putFile } from "@/lib/files";
import { uid, writeSite } from "@/lib/store";
import { CHUNK_BYTES, PDF_MAX_BYTES, formatMB, pdfTooLargeMessage } from "@/lib/upload-limits";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/upload-complete — JSON: { uploadId, total, size, name, title, date, published }.
 * A darabok összefűzése, ellenőrzés (minden darab megvan, a méret egyezik, legfeljebb 18 MB, %PDF- a fájl elején),
 * mentés a fájltárba, beszámoló-rekord, a darabok törlése. Tartalmi hibánál a darabok is törlődnek (újra kell tölteni);
 * tárhiba esetén megmaradnak, és a karbantartás 24 óra után viszi el őket.
 */
export async function POST(req: Request) {
  const denied = guardAdminWrite(req);
  if (denied) return denied;
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return jsonError(415, "Hibás kérés (JSON kell). Töltsd újra a lapot, és próbáld újra.");
  const raw = await readBody(req, 16 * 1024);
  if (!raw.ok) return jsonError(413, "Hibás kérés (túl nagy). Töltsd újra a lapot, és próbáld újra.");
  let input: Record<string, unknown>;
  try { input = JSON.parse(raw.data.toString("utf8")) as Record<string, unknown>; } catch { return jsonError(400, "Hibás kérés (nem olvasható). Töltsd újra a lapot, és próbáld újra."); }

  const uploadId = String(input.uploadId ?? "");
  const total = Number(input.total), size = Number(input.size);
  const title = String(input.title ?? "").trim().slice(0, 200);
  const date = String(input.date ?? "") || new Date().toISOString().slice(0, 10);
  const published = input.published === true;
  if (!UPLOAD_ID_RE.test(uploadId) || !Number.isInteger(total) || total < 1 || !Number.isInteger(size) || size < 1) return jsonError(400, "Hibás feltöltési kérés. Töltsd újra a lapot, és próbáld újra.");
  if (!title) return jsonError(400, "Adj címet a beszámolónak (pl. „Éves beszámoló 2025”).");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonError(400, "A dátum formátuma hibás (év-hónap-nap).");

  const manifest = await readManifest(uploadId);
  if (!manifest) return jsonError(404, "A feltöltött darabok nem találhatók (lehet, hogy a feltöltés 24 óránál régebben kezdődött, és a karbantartás törölte). Töltsd fel újra a fájlt.");
  const reject = async (status: number, message: string) => { await deleteChunks(uploadId).catch(() => {}); return jsonError(status, message); };
  if (manifest.total !== total || manifest.size !== size) return reject(400, "A feltöltés adatai nem egyeznek a beérkezett darabokkal. Töltsd fel újra a fájlt.");
  if (size > PDF_MAX_BYTES) return reject(413, pdfTooLargeMessage(size));

  const joined = await assembleChunks(uploadId, total);
  if ("missing" in joined) return reject(400, `A feltöltés hiányos: a(z) ${joined.missing + 1}. darab nem érkezett meg (${total} darabból). Töltsd fel újra a fájlt.`);
  const data = joined.data;
  if (data.length !== size) return reject(400, `A feltöltés hiányos: ${formatMB(data.length)} érkezett a várt ${formatMB(size)} helyett. Töltsd fel újra a fájlt.`);
  if (total > 1 && data.length <= CHUNK_BYTES * (total - 1)) return reject(400, "A darabok mérete hibás. Töltsd fel újra a fájlt.");
  if (!isPdf(data)) return reject(415, `Csak PDF tölthető fel — a(z) ${manifest.name || "fájl"} tartalma nem PDF-dokumentum.`);

  const id = "r-" + uid();
  const key = `${id}.pdf`;
  try {
    await putFile(key, data);
    await writeSite((site) => { site.reports.unshift({ id, title, year: Number(date.slice(0, 4)), date, file: key, size: data.length, published }); });
  } catch (e) {
    await deleteFile(key).catch(() => {});
    return jsonError(500, `A beszámoló mentése nem sikerült: ${errMsg(e)}. Próbáld újra.`);
  }
  await deleteChunks(uploadId).catch((e) => console.warn("[upload-complete] a darabok törlése nem sikerült (a karbantartás később törli):", errMsg(e)));
  revalidateSite();
  return jsonOk({ message: `„${title}” feltöltve (${formatMB(data.length)}).`, report: { id, title, file: fileUrl(key), size: data.length } });
}
