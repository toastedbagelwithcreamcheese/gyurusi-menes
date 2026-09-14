import { errMsg, guardAdminWrite, jsonError, jsonOk, readBody, revalidateSite } from "@/lib/admin-api";
import { deleteFile, fileUrl, putFile } from "@/lib/files";
import { uid, writeSite } from "@/lib/store";
import { IMAGE_MAX_BYTES, IMAGE_STORED_EDGE, imageTooLargeMessage } from "@/lib/upload-limits";

export const dynamic = "force-dynamic";

const TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);
const FORMATS = new Set(["webp", "jpeg", "png"]);

/**
 * POST /api/admin/upload-image?alt=…&name=… — nyers képtörzs, amelyet a böngésző már kicsinyített és WebP/JPEG-be
 * kódolt (ImageUpload.tsx). A szerver mégis mindent újra ellenőriz: típus, legfeljebb 4 MB, valódi képformátum
 * (a fejléc nem elég); utána 2000 px-es WebP + elmosott előnézet + domináns szín, fájltár, upload-rekord.
 * Válasz: JSON — hibánál magyar, konkrét mondat (a méretet MB-ban mondja).
 */
export async function POST(req: Request) {
  const denied = guardAdminWrite(req);
  if (denied) return denied;
  const q = new URL(req.url).searchParams;
  const name = (q.get("name") ?? "").slice(0, 200);
  const alt = (q.get("alt") ?? "").trim().slice(0, 300);
  const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!TYPES.has(type)) return jsonError(415, `Ez nem feltölthető kép (${type || "ismeretlen típus"}). JPG, PNG vagy WebP képet tölts fel.`);

  const body = await readBody(req, IMAGE_MAX_BYTES);
  if (!body.ok) return jsonError(413, imageTooLargeMessage(body.size));
  if (body.data.length === 0) return jsonError(400, "Nem érkezett kép — válaszd ki újra a fájlt.");

  const id = "u-" + uid();
  const key = `${id}.webp`;
  let out: { webp: Buffer; width: number; height: number; blur: string; color: string };
  try {
    /* A sharp csak itt, feltöltéskor töltődik be — az admin lapjai ne függjenek a natív modultól. */
    const sharp = (await import("sharp")).default;
    const format = (await sharp(body.data).metadata()).format ?? "";
    if (!FORMATS.has(format)) return jsonError(415, `A fájl tartalma nem JPG, PNG vagy WebP kép (${format || "ismeretlen formátum"}). Exportáld JPEG-be, és töltsd fel újra.`);
    const webp = await sharp(body.data).rotate().resize({ width: IMAGE_STORED_EDGE, height: IMAGE_STORED_EDGE, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    const meta = await sharp(webp).metadata();
    const tiny = await sharp(webp).resize(16).blur(1).webp({ quality: 40 }).toBuffer();
    const { dominant } = await sharp(webp).stats();
    out = { webp, width: meta.width ?? 0, height: meta.height ?? 0, blur: `data:image/webp;base64,${tiny.toString("base64")}`, color: `rgb(${dominant.r},${dominant.g},${dominant.b})` };
  } catch (e) {
    return jsonError(422, `A képet nem sikerült feldolgozni (${name || "a fájl"}): ${errMsg(e)}. Exportáld JPEG-be, és töltsd fel újra.`);
  }

  const label = alt || name || "kép";
  try {
    await putFile(key, out.webp);
    await writeSite((site) => {
      site.uploads.unshift({ id, src: fileUrl(key), width: out.width, height: out.height, alt: label, blur: out.blur, color: out.color, uploadedAt: new Date().toISOString() });
    });
  } catch (e) {
    await deleteFile(key).catch(() => {});
    return jsonError(500, `A kép mentése nem sikerült: ${errMsg(e)}. Próbáld újra.`);
  }
  revalidateSite();
  return jsonOk({ message: `Kép feltöltve (${label}).`, image: { id, src: fileUrl(key), alt: label, width: out.width, height: out.height, bytes: out.webp.length } });
}
