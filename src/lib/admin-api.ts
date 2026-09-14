import { revalidatePath } from "next/cache";
import { requireAdmin } from "./admin-auth";

/**
 * Közös segédek az admin író API-útvonalaihoz (/api/admin/upload-*). Ezek route handlerek, NEM szerver-akciók:
 * a szerver-akció törzse a Next-ben legfeljebb 1 MB, és a hibája általános hibalapot ad — itt minden válasz JSON,
 * a hiba magyar, konkrét mondat, amit a feltöltő a Flash-sáv stílusában mutat.
 */

export const jsonOk = (body: Record<string, unknown>) => Response.json({ ok: true, ...body }, { headers: { "cache-control": "no-store" } });
export const jsonError = (status: number, error: string) => Response.json({ ok: false, error }, { status, headers: { "cache-control": "no-store" } });
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Admin-jogosultság + azonos eredet. A szerver-akciókat a Next maga védi idegen oldalról érkező POST ellen, a route
 * handlereket nem: ha a böngésző Origin-t küld, annak a saját címünknek kell lennie.
 */
export function guardAdminWrite(req: Request): Response | null {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const origin = req.headers.get("origin");
  if (!origin) return null;
  let host = "";
  try { host = new URL(origin).host; } catch { /* hibás Origin → idegen */ }
  const own = [req.headers.get("x-forwarded-host"), req.headers.get("host"), new URL(req.url).host].filter(Boolean);
  return own.includes(host) ? null : jsonError(403, "A kérés nem az admin felületről érkezett. Nyisd meg az admint a saját címén, és próbáld újra.");
}

/**
 * A kérés törzse legfeljebb `max` bájtig. Ha több (a Content-Length vagy a ténylegesen beolvasott bájtok szerint),
 * nem olvassa végig: `{ ok: false, size }` — a size a bejelentett méret, ha volt.
 */
export async function readBody(req: Request, max: number): Promise<{ ok: true; data: Buffer } | { ok: false; size: number | null }> {
  const declared = Number(req.headers.get("content-length"));
  const size = Number.isFinite(declared) && declared > 0 ? declared : null;
  if (size !== null && size > max) return { ok: false, size };
  if (!req.body) return { ok: true, data: Buffer.alloc(0) };
  const reader = req.body.getReader();
  const parts: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.byteLength;
    if (n > max) { await reader.cancel().catch(() => {}); return { ok: false, size }; }
    parts.push(value);
  }
  return { ok: true, data: Buffer.concat(parts, n) };
}

/** Minden nyelvi lap újraépül (ugyanaz, mint az admin/actions.ts `refresh()`-e). */
export function revalidateSite() { revalidatePath("/", "layout"); revalidatePath("/[lang]", "layout"); }
