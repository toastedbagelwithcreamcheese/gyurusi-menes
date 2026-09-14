import type { NextConfig } from "next";

/** Ami a gyökéren NEM magyar tartalom: nyelvi előtagok, API, fájlok, statikus eszközök, metaadat-útvonalak (megosztási kép, llms.txt). */
const NOT_HU = "(?!hu(?:/|$)|en(?:/|$)|de(?:/|$)|api(?:/|$)|files(?:/|$)|og(?:/|$)|_next|images/|uploads/|fonts/|robots\\.txt|sitemap\\.xml|llms(?:-full)?\\.txt|opengraph-image|favicon\\.ico|icon|apple-icon)";

/** A régi WordPress-oldal (gyurusimenes.hu, 2023–2024) címei → az új lapok, 301-gyel, záró perjellel és anélkül. */
const LEGACY: Array<[string, string]> = [
  ["/kapcsolat", "/#kapcsolat"], ["/gyerektaborok", "/taborok"], ["/egyeni-oktatas", "/oktatas"], ["/menes", "/"], ["/bertartas", "/"],
];

const nextConfig: NextConfig = {
  images: { qualities: [55, 62, 70, 78], formats: ["image/avif", "image/webp"] },
  /* A Next saját perjel-átirányítása (308) a config-átirányítások ELŐTT futna: a „/kapcsolat/” így 308 + 301 láncot,
     az „/oktatas/” 308-at kapna 301 helyett. Kikapcsolva; ugyanezt a lista végén mi tesszük meg, a régi címek után. */
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      ...LEGACY.flatMap(([from, to]) => [from, `${from}/`].map((source) => ({ source, destination: to, statusCode: 301 }))),
      /* A mai lapok közül ezek a régi oldalon perjellel éltek. */
      { source: "/oktatas/", destination: "/oktatas", statusCode: 301 },
      { source: "/egyesulet/", destination: "/egyesulet", statusCode: 301 },
      /* Minden más záró perjel: ugyanaz, amit a Next alapból tenne (308, a metódus megmarad). */
      { source: "/:path((?:[^/]+/)*[^/]+)/", destination: "/:path", permanent: true },
    ];
  },
  /* A magyar a gyökéren él, a lapok az app/[lang]/ alatt. A leképezést (`/turak` → `/hu/turak`) config-szintű
     rewrite végzi, NEM a proxy: a proxy-átírást a Next 16 kliens-oldali (RSC) navigációnál 307-tel váltja ki,
     ami a `/hu` → `/` visszairányítással hurokba futott — a logóra kattintás 10–15 mp-ig „gondolkodott". */
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/hu" },
        { source: `/:path(${NOT_HU}.*)`, destination: "/hu/:path" },
      ],
    };
  },
  outputFileTracingIncludes: {
    "/**": ["./data/seed.json"],
    "/[lang]/admin/**": ["./node_modules/@img/sharp-linux-x64/**", "./node_modules/@img/sharp-libvips-linux-x64/**"],
    /* A megosztási kép fs-ből olvassa a betűt és a fotókat, és sharp-pal dolgozik — a függvénycsomagba kell. */
    "/og/**": ["./src/fonts/fraunces-og.ttf", "./public/images/photos/**", "./node_modules/@img/sharp-linux-x64/**", "./node_modules/@img/sharp-libvips-linux-x64/**"],
  },
};

export default nextConfig;
