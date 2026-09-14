import { errMsg, guardAdminWrite, jsonError, jsonOk, revalidateSite } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/revalidate — minden nyilvános lap gyorsítótárának érvénytelenítése: a következő kérés a tárból renderel újra.
 * Az admin mentései ezt maguktól megteszik. Kézzel akkor kell, ha a tár az adminon kívül változott: helyben a data/site.json
 * közvetlen szerkesztése, az `npm run db:reset` / `db:demo` után (a tesztek a scripts/revalidate.mjs-en át hívják), élesben
 * egy mentés visszaállítása után. Admin-jogosultság kell (belépési süti vagy Basic Auth), mint minden /api/admin/* útvonalnál.
 */
export async function POST(req: Request) {
  const denied = await guardAdminWrite(req);
  if (denied) return denied;
  try { revalidateSite(); }
  catch (e) { return jsonError(500, `A nyilvános lapok frissítése nem sikerült: ${errMsg(e)}`); }
  return jsonOk({ message: "A nyilvános lapok a következő kérésnél újraépülnek a tárból." });
}
