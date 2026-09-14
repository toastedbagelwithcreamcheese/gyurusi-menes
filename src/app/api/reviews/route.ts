import { NextResponse } from "next/server";
import { isLang } from "@/content/types";
import { loadGoogleReviews, reviewsEnabled } from "@/lib/google-reviews";
import { limitByIp } from "@/lib/ratelimit";

/**
 * GET /api/reviews?lang=hu|en|de — a főoldali Google-értékelések, élőben (src/lib/google-reviews.ts).
 * Semmilyen szinten nem gyorsítótárazható: a válasz Google-tartalom, amit a szabály szerint nem tárolhatunk.
 * 404: nincs kulcs · 429: elfogyott a napi keret VAGY ez az IP már elérte a saját keretét · 502: a Google nem adott használható
 * választ — a blokk mindháromnál eltűnik.
 * IP-nkénti keret (tartós, IP-hash, src/lib/ratelimit.ts): legfeljebb REVIEWS_PER_IP élő betöltés 24 óra alatt. A napi közös keretet
 * (GOOGLE_REVIEWS_DAILY_CAP) így egyetlen címről ismételt kérésekkel nem lehet reggel elhasználni; egy látogató napi pár főoldal-
 * nézetét nem érinti (a böngésző nézetenként egyszer kér, a blokk közelébe görgetve).
 */
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex" };
const REVIEWS_PER_IP = 5;
const IP_WINDOW_MS = 24 * 60 * 60_000;

export async function GET(req: Request) {
  /* Kulcs nélkül nincs mit korlátozni (és a korlát-tárba sem írunk). A keret a Google-hívás ELŐTT dönt. */
  if (reviewsEnabled()) {
    const lim = await limitByIp(req, "reviews", IP_WINDOW_MS, REVIEWS_PER_IP);
    if (!lim.ok) return NextResponse.json({ ok: false }, { status: 429, headers: { ...HEADERS, "Retry-After": String(Math.ceil(lim.retryAfterMs / 1000)) } });
  }
  const q = new URL(req.url).searchParams.get("lang");
  const r = await loadGoogleReviews(isLang(q) ? q : "hu");
  if (!r.ok) {
    if (r.status === 502) console.warn("[reviews]", r.reason);
    return NextResponse.json({ ok: false }, { status: r.status, headers: HEADERS });
  }
  return NextResponse.json({ ok: true, ...r.data }, { headers: HEADERS });
}
