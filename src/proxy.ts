import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LANG, isLang, type Lang } from "@/content/types";
import { LANG_COOKIE } from "@/lib/paths";
import { isBot, negotiate } from "@/lib/negotiate";

/**
 * Két dolga van:
 *
 * 1. Az /admin védelme HTTP Basic Auth-tal — CSAK ha ADMIN_USER és ADMIN_PASSWORD be van
 *    állítva. Nélkülük az admin szabadon nyílik (demó); élesben a két env-változó bekapcsolja.
 *    Az admin mindig magyar: belső átírás /hu/admin-ra, nyelvi egyeztetés nélkül.
 *
 * 2. Nyelvi útválasztás. Minden oldal az app/[lang]/ alatt él; a magyar a gyökéren látszik,
 *    a többi nyelv előtaggal: /en/... megy tovább; /hu/... → 308 a gyökérre (egy oldal, egy cím);
 *    előtag nélkül: a váltó sütije dönt, ha nincs, az Accept-Language — és ha az nem magyar,
 *    302 a saját nyelvére (robot és link-előnézet nem kap átirányítást). Minden más esetben
 *    belső ÁTÍRÁS /hu/...-ra: a cím marad.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const m = pathname.match(/^\/(hu|en|de)(?=\/|$)/);
  const prefix = m ? (m[1] as Lang) : null;
  const rest = prefix ? pathname.slice(prefix.length + 1) || "/" : pathname;

  if (rest === "/admin" || rest.startsWith("/admin/")) {
    const denied = adminGate(req);
    if (denied) return denied;
    if (prefix) return NextResponse.redirect(new URL(rest + search, req.url), 308);
    const url = req.nextUrl.clone();
    url.pathname = `/${DEFAULT_LANG}${pathname}`;
    return NextResponse.rewrite(url, { headers: { "X-Robots-Tag": "noindex, nofollow" } });
  }

  if (prefix === DEFAULT_LANG) return NextResponse.redirect(new URL(rest + search, req.url), 308);
  if (prefix) return NextResponse.next();

  const cookie = req.cookies.get(LANG_COOKIE)?.value;
  let target: Lang = DEFAULT_LANG;
  if (isLang(cookie)) target = cookie;
  else if (!isBot(req.headers.get("user-agent"))) target = negotiate(req.headers.get("accept-language")) ?? DEFAULT_LANG;

  const vary = { Vary: "Accept-Language, Cookie" };
  if (target !== DEFAULT_LANG) {
    return NextResponse.redirect(new URL(`/${target}${rest === "/" ? "" : rest}${search}`, req.url), { status: 302, headers: vary });
  }
  const url = req.nextUrl.clone();
  url.pathname = `/${DEFAULT_LANG}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url, { headers: vary });
}

function adminGate(req: NextRequest): NextResponse | null {
  const user = process.env.ADMIN_USER, pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) return null;
  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const [u, p] = Buffer.from(header.slice(6), "base64").toString().split(":");
    if (u === user && p === pass) return null;
  }
  return new NextResponse("Bejelentkezes szukseges", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Gyurusi Menes admin"' } });
}

export const config = {
  matcher: ["/((?!_next|api|files|images|uploads|fonts|favicon\\.ico|robots\\.txt|sitemap\\.xml|opengraph-image|icon|apple-icon|.*\\.(?:png|jpg|jpeg|webp|svg|ico|woff2?|txt|xml)$).*)"],
};
