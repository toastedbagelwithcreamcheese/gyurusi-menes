import { buildLlms } from "@/lib/llms";
import { readSite } from "@/lib/store";

/** /llms.txt — rövid, tényszerű összefoglaló AI-keresőknek (lásd src/lib/llms.ts); kérésenként a tárból (előre renderelve a build a magot sütné bele). */
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(buildLlms(await readSite(), false), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
