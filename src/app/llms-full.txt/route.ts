import { buildLlms } from "@/lib/llms";
import { readSite } from "@/lib/store";

/** /llms-full.txt — az /llms.txt kibővítve a lapok teljes szövegével, mindhárom nyelven; kérésenként a tárból (lásd az /llms.txt-t). */
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(buildLlms(await readSite(), true), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
