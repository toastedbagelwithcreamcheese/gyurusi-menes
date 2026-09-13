import type { NextConfig } from "next";

/** Ami a gyökéren NEM magyar tartalom: nyelvi előtagok, API, fájlok, statikus eszközök, metaadat-útvonalak. */
const NOT_HU = "(?!hu(?:/|$)|en(?:/|$)|de(?:/|$)|api(?:/|$)|files(?:/|$)|_next|images/|uploads/|fonts/|robots\\.txt|sitemap\\.xml|opengraph-image|favicon\\.ico|icon|apple-icon)";

const nextConfig: NextConfig = {
  images: { qualities: [55, 62, 70, 78], formats: ["image/avif", "image/webp"] },
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
  },
};

export default nextConfig;
