import type { MetadataRoute } from "next";
import { LANGS } from "@/content/types";
import { langPath } from "@/lib/paths";
import { readSite, PAGE_KEYS } from "@/lib/store";
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const s = await readSite();
  const out: MetadataRoute.Sitemap = [];
  for (const l of LANGS) {
    out.push({ url: BASE + langPath(l), changeFrequency: "weekly", priority: l === "hu" ? 1 : 0.8 });
    for (const k of PAGE_KEYS) out.push({ url: BASE + langPath(l, `/${k}`), changeFrequency: "monthly", priority: 0.8 });
    out.push({ url: BASE + langPath(l, "/esemenyek"), changeFrequency: "weekly", priority: 0.7 });
    for (const e of s.events.filter((e) => e.published)) out.push({ url: BASE + langPath(l, `/esemenyek/${e.id}`), lastModified: e.date, changeFrequency: "yearly", priority: 0.6 });
  }
  return out;
}
