import { runMaintenance } from "../../src/lib/maintenance";

/**
 * Napi karbantartás — Netlify ütemezett függvény (naponta 00:00 UTC-kor):
 * lejárt jelentkezések és üzenetek törlése, napi mentés a „backups” tárba, a 30-nál régebbi mentések törlése.
 * A logika a src/lib/maintenance.ts-ben van; ugyanezt futtatja kézzel a POST /api/admin/maintenance.
 */
export default async function dailyMaintenance(): Promise<Response> {
  const report = await runMaintenance();
  console.log("[daily-maintenance]", JSON.stringify(report));
  return Response.json(report);
}

export const config = { schedule: "@daily" };
