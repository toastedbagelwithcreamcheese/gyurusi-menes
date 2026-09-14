import { NextResponse } from "next/server";
import { isLang } from "@/content/types";
import { loadGoogleReviews } from "@/lib/google-reviews";

/**
 * GET /api/reviews?lang=hu|en|de — a főoldali Google-értékelések, élőben (src/lib/google-reviews.ts).
 * Semmilyen szinten nem gyorsítótárazható: a válasz Google-tartalom, amit a szabály szerint nem tárolhatunk.
 * 404: nincs kulcs · 429: elfogyott a napi keret · 502: a Google nem adott használható választ — a blokk mindháromnál eltűnik.
 */
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex" };

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("lang");
  const r = await loadGoogleReviews(isLang(q) ? q : "hu");
  if (!r.ok) {
    if (r.status === 502) console.warn("[reviews]", r.reason);
    return NextResponse.json({ ok: false }, { status: r.status, headers: HEADERS });
  }
  return NextResponse.json({ ok: true, ...r.data }, { headers: HEADERS });
}
