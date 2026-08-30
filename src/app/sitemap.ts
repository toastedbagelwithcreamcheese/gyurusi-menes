import type { MetadataRoute } from "next";
import { readSite } from "@/lib/store";
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const s = await readSite();
  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    ...s.programs.filter((p) => p.published).map((p) => ({ url: `${BASE}/programok/${p.id}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...s.events.filter((e) => e.published).map((e) => ({ url: `${BASE}/esemenyek/${e.id}`, lastModified: e.date, changeFrequency: "yearly" as const, priority: 0.6 })),
    ...s.news.filter((n) => n.published).map((n) => ({ url: `${BASE}/hirek/${n.id}`, lastModified: n.date, changeFrequency: "yearly" as const, priority: 0.5 })),
  ];
}
