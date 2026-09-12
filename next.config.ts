import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { qualities: [55, 62, 70, 78], formats: ["image/avif", "image/webp"] },
  /* A beépített tartalom (data/site.json) a szerverfüggvényekbe is bekerül: ez a Blobs magja és a tartalék. */
  outputFileTracingIncludes: {
    "/**": ["./data/site.json"],
    /* A sharp Linux-binárisai a Netlify-függvényekhez (a build macOS-en fut, a függvény Linuxon) — lásd scripts/sharp-linux.mjs. */
    "/[lang]/admin/**": ["./node_modules/@img/sharp-linux-x64/**", "./node_modules/@img/sharp-libvips-linux-x64/**"],
  },
};

export default nextConfig;
