/**
 * Az admin védelmének EGYETLEN helye: a proxy (/admin lapok) és minden /api/admin/* útvonal ezt hívja.
 * (A proxy matchere az /api-t nem látja, ezért az API-útvonalaknak maguknak kell ellenőrizniük.)
 * Egyelőre HTTP Basic Auth, és csak ha ADMIN_USER + ADMIN_PASSWORD be van állítva — nélkülük nyitott (demó).
 * A sütis belépés ezt a fájlt cseréli; a hívóknak nem kell változniuk.
 */

export const adminProtected = () => !!(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD);

function decodeBase64Utf8(b64: string): string | null {
  try { return new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))); } catch { return null; }
}
/** Hosszfüggetlen összehasonlítás — a válaszidő ne áruljon el a jelszóból semmit. */
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** `null`, ha a kérés mehet; különben a kész 401-es válasz. Használat: `const denied = requireAdmin(req); if (denied) return denied;` */
export function requireAdmin(req: Request): Response | null {
  const user = process.env.ADMIN_USER, pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) return null;
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = decodeBase64Utf8(header.slice(6).trim());
    const i = decoded ? decoded.indexOf(":") : -1; // a jelszóban lehet kettőspont, a felhasználónévben nem
    if (decoded && i >= 0 && safeEqual(decoded.slice(0, i), user) && safeEqual(decoded.slice(i + 1), pass)) return null;
  }
  return new Response("Bejelentkezes szukseges", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Gyurusi Menes admin"', "Cache-Control": "no-store" } });
}
