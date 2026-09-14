import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Keresők és AI-keresők név szerint is engedélyezve. Egy robot, amelyik saját csoportot talál, a „*”-ot már nem
 * olvassa — ezért a tiltólista (admin, API) minden csoportban ugyanaz. A /files/ (beszámolók) és az /og/
 * (megosztási képek) szándékosan nyitva: a link-előnézet robotjai a robots.txt-t is nézik.
 */
const BOTS = ["Googlebot", "Bingbot", "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended"];
const DISALLOW = ["/admin", "/api/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: DISALLOW }, { userAgent: BOTS, allow: "/", disallow: DISALLOW }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
