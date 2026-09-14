import { requireAdmin } from "@/lib/admin-auth";
import { runMaintenance } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

/** Kézi karbantartás (és a kapuk tesztjei): lejárt jelentkezések és üzenetek törlése, napi mentés, régi mentések ritkítása. */
export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const report = await runMaintenance();
    return Response.json({ ok: true, report }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("[maintenance] kézi futás hiba:", e);
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
