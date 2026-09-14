import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LANG, isLang, type Lang } from "@/content/types";
import { LANG_COOKIE } from "@/lib/paths";
import { isBot, negotiate } from "@/lib/negotiate";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * Két dolga van — és szándékosan NEM ír át útvonalat (azt a next.config rewrites végzi):
 *
 * 1. Az /admin védelme — a szabály egy helyen, a src/lib/admin-auth.ts-ben (az /api/admin/* útvonalak is azt hívják,
 *    mert ez a matcher az /api-t nem látja). Az admin mindig magyar (előtaggal → 308 a gyökérre).
 *
 * 2. Nyelvi egyeztetés az előtag NÉLKÜLI címeken: a váltó sütije dönt; ha nincs, az Accept-Language —
 *    és ha az nem magyar, 302 a saját nyelvére (robot és link-előnézet nem kap átirányítást).
 *    `/hu/...` → 308 a gyökérre (egy oldal, egy cím). RSC (kliens-oldali) kérésnél nincs egyeztetés:
 *    aki már magyar lapon van, az a logóra kattintva magyar főoldalt kap, nem átirányítást.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const m = pathname.match(/^\/(hu|en|de)(?=\/|$)/);
  const prefix = m ? (m[1] as Lang) : null;
  const rest = prefix ? pathname.slice(prefix.length + 1) || "/" : pathname;
  const isRsc = req.headers.get("rsc") === "1" || req.nextUrl.searchParams.has("_rsc");

  if (rest === "/admin" || rest.startsWith("/admin/")) {
    const denied = requireAdmin(req);
    if (denied) return denied;
    if (prefix) return NextResponse.redirect(new URL(rest + search, req.url), 308);
    return NextResponse.next({ headers: { "X-Robots-Tag": "noindex, nofollow" } });
  }

  if (prefix === DEFAULT_LANG) return NextResponse.redirect(new URL(rest + search, req.url), 308);
  if (prefix) return NextResponse.next();

  const vary = { Vary: "Accept-Language, Cookie" };
  if (isRsc) return NextResponse.next({ headers: vary });

  const cookie = req.cookies.get(LANG_COOKIE)?.value;
  let target: Lang = DEFAULT_LANG;
  if (isLang(cookie)) target = cookie;
  else if (!isBot(req.headers.get("user-agent"))) target = negotiate(req.headers.get("accept-language")) ?? DEFAULT_LANG;

  if (target !== DEFAULT_LANG) {
    return NextResponse.redirect(new URL(`/${target}${rest === "/" ? "" : rest}${search}`, req.url), { status: 302, headers: vary });
  }
  return NextResponse.next({ headers: vary });
}

export const config = {
  matcher: ["/((?!_next|api|files|images|uploads|fonts|favicon\\.ico|robots\\.txt|sitemap\\.xml|opengraph-image|icon|apple-icon|.*\\.(?:png|jpg|jpeg|webp|svg|ico|woff2?|txt|xml)$).*)"],
};
