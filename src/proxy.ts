import { NextResponse, type NextRequest } from "next/server";

/**
 * HTTP Basic Auth az /admin alá — CSAK ha ADMIN_USER és ADMIN_PASSWORD be van állítva.
 * A demón szándékosan nincs: bárki megnézheti az admint. Élesben a két env-változó bekapcsolja.
 */
export function proxy(req: NextRequest) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) return NextResponse.next();

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const [u, p] = Buffer.from(header.slice(6), "base64").toString().split(":");
    if (u === user && p === pass) return NextResponse.next();
  }
  return new NextResponse("Bejelentkezés szükséges", {
    status: 401, headers: { "WWW-Authenticate": 'Basic realm="Gyurusi Menes admin", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
