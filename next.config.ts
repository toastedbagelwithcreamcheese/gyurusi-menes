import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { qualities: [55, 62, 70, 78], formats: ["image/avif", "image/webp"] },
  /* A beépített tartalom (data/site.json) a szerverfüggvényekbe is bekerül: ez a Blobs magja és a tartalék. */
  outputFileTracingIncludes: { "/**": ["./data/site.json"] },
};

export default nextConfig;
