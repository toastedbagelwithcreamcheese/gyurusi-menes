import { requireAdmin } from "@/lib/admin-auth";
import { buildBackup } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

/** „Mentés letöltése” az admin kezdőlapján: a tartalomdokumentum + minden jelentkezés és üzenet egy JSON-fájlban. */
export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const backup = await buildBackup();
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="gyurusi-menes-mentes-${backup.createdAt.slice(0, 10)}.json"`,
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
