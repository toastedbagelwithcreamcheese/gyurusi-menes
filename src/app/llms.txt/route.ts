import { buildLlms } from "@/lib/llms";
import { readSite } from "@/lib/store";

/** /llms.txt — rövid, tényszerű összefoglaló AI-keresőknek (lásd src/lib/llms.ts); óránként újragenerálva. */
export const revalidate = 3600;

export async function GET() {
  return new Response(buildLlms(await readSite(), false), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
