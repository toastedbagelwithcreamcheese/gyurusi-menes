import type { MetadataRoute } from "next";
import { LANGS } from "@/content/types";
import { alternatesFor, langPath } from "@/lib/paths";
import { absUrl, publicPaths } from "@/lib/seo";
import { readSite } from "@/lib/store";

/** Kérésenként a tárból (P7): előre renderelve a build a magot sütné bele, és egy deploy után akár egy óráig a régi eseménylistát adná. */
export const dynamic = "force-dynamic";

/** Minden nyilvános lap mindhárom nyelven, a nyelvi alternatívákkal (hreflang + x-default). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = await readSite();
  /* A tartalomtárban nincs lapszintű módosítási idő: a lastmod a generálás napja (óránkénti újragenerálással). */
  const lastModified = new Date().toISOString().slice(0, 10);
  const weight = (p: string) => (p === "/" ? 1 : p.startsWith("/esemenyek/") ? 0.6 : p === "/adatkezeles" || p === "/impresszum" ? 0.3 : 0.8);
  return publicPaths(site).flatMap((p) => {
    const languages = Object.fromEntries(Object.entries(alternatesFor(p)).map(([l, href]) => [l, absUrl(href)]));
    return LANGS.map((l) => ({
      url: absUrl(langPath(l, p)), lastModified, alternates: { languages },
      changeFrequency: p === "/" || p === "/esemenyek" ? ("weekly" as const) : ("monthly" as const), priority: weight(p),
    }));
  });
}
