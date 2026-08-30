import { NextResponse, type NextRequest } from "next/server";

/** HTTP Basic Auth az /admin alá. Egy felhasználó, egy jelszó — a demóhoz ennyi kell. */
export function proxy(req: NextRequest) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) return new NextResponse("ADMIN_USER / ADMIN_PASSWORD nincs beállítva.", { status: 500 });

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
