import type { NextConfig } from "next";

/** Ami a gyökéren NEM magyar tartalom: nyelvi előtagok, API, fájlok, statikus eszközök, metaadat-útvonalak (megosztási kép, llms.txt). */
const NOT_HU = "(?!hu(?:/|$)|en(?:/|$)|de(?:/|$)|api(?:/|$)|files(?:/|$)|og(?:/|$)|_next|images/|uploads/|fonts/|robots\\.txt|sitemap\\.xml|llms(?:-full)?\\.txt|opengraph-image|favicon\\.ico|icon|apple-icon)";

/** A régi WordPress-oldal (gyurusimenes.hu, 2023–2024) címei → az új lapok, 301-gyel, záró perjellel és anélkül. */
const LEGACY: Array<[string, string]> = [
  ["/kapcsolat", "/#kapcsolat"], ["/gyerektaborok", "/taborok"], ["/egyeni-oktatas", "/oktatas"], ["/menes", "/"], ["/bertartas", "/"],
];

const nextConfig: NextConfig = {
  /* Csak a kapuszkriptek állítják (scripts/checks/p6-seo.mjs: próba-build egy éles NEXT_PUBLIC_SITE_URL-lel, a fő .next érintése nélkül). */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: { qualities: [55, 62, 70, 78], formats: ["image/avif", "image/webp"] },
  /* Böngésző-gyorsítótár (P7, Ellenőrzés): a Next az ISR-lapokra `s-maxage=3600, stale-while-revalidate=<expireTime − 3600>`-at küld.
     A böngésző az s-maxage-et figyelmen kívül hagyja, a stale-while-revalidate-et NEM: egy korábban látott nyilvános lapot és az RSC-
     előtöltéseket a saját gyorsítótárából, elavultan adta (admin-mentés után is), a háttérben újrakért kérések pedig a Chromiumban
     függőben maradtak (6 beragadt kapcsolat → a kliens-oldali navigáció és a tesztek networkidle-je megállt). expireTime = revalidate
     → nincs stale-while-revalidate a válaszban. Netlify-on a plugin a böngészőnek amúgy is `public, max-age=0, must-revalidate`-et
     ad, a CDN-nek pedig csak akkor 1 éves SWR-t, ha a Next küld ilyet — ott ezért marad az alapérték (NETLIFY=true a buildben). */
  expireTime: process.env.NETLIFY === "true" ? undefined : 3600,
  /* Szándékosan NINCS experimental.isrFlushToDisk: false (P7): az a képoptimalizáló lemez-gyorsítótárát is kikapcsolja — minden kép
     minden kérésre újrakódolódna (helyben ~50 ms képenként). A tesztszerverek induláskor érvénytelenítik a nyilvános lapokat
     (scripts/with-server.mjs, a kapuk saját szerverindítói), így egy korábbi futás lemezre írt lapja nem zavar. */
  experimental: {
    /* Kevesebb, nagyobb JS-chunk az első betöltéshez (P7): a Turbopack alapból ~10 apró chunkot kért le minden lapon — mobilhálózaton
       (és HTTP/1.1-en) minden kérés külön várakozás. A kis chunkok összeolvadnak; a React és a Next futtatókörnyezete külön marad
       (maxMergeChunkSize alapérték), így a lapok közti navigáció továbbra is újrahasználja őket. */
    turbopackChunking: { minChunkSize: 200_000, requestCost: 600_000 },
  },
  /* A Next saját perjel-átirányítása (308) a config-átirányítások ELŐTT futna: a „/kapcsolat/” így 308 + 301 láncot,
     az „/oktatas/” 308-at kapna 301 helyett. Kikapcsolva; ugyanezt a lista végén mi tesszük meg, a régi címek után. */
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      /* A régi Huculösvény-aldomain (huculosveny.gyurusimenes.hu, ma még a WordPress-oldal, docs/RESEARCH.md) → az új aloldal, 301.
         Élesítéskor az aldomaint domain-aliasként a Netlify-oldalhoz kell adni (README, „Élesítés”); addig ez a szabály nem kap kérést.
         Minden útvonal (a régi PDF-címek is) a /huculosveny lapra visz: a régi fájlok nem költöznek át. */
      { source: "/:path*", has: [{ type: "host" as const, value: "huculosveny\\.gyurusimenes\\.hu" }], destination: "https://gyurusimenes.hu/huculosveny", statusCode: 301 },
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
    /* A képfeltöltés route handlere is sharp-ot tölt be (a Linux-binárisok: scripts/sharp-linux.mjs). */
    "/api/admin/upload-image": ["./node_modules/@img/sharp-linux-x64/**", "./node_modules/@img/sharp-libvips-linux-x64/**"],
    /* A megosztási kép fs-ből olvassa a betűt és a fotókat, és sharp-pal dolgozik — a függvénycsomagba kell. */
    "/og/**": ["./src/fonts/fraunces-og.ttf", "./public/images/photos/**", "./node_modules/@img/sharp-linux-x64/**", "./node_modules/@img/sharp-libvips-linux-x64/**"],
  },
};

export default nextConfig;
