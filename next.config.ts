import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { qualities: [55, 62, 70, 78], formats: ["image/avif", "image/webp"] },
  /* config options here */
};

export default nextConfig;
