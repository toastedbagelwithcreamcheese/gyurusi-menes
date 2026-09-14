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
  /* A lastmod a VALÓDI módosítás ideje (a Google a pontatlant figyelmen kívül hagyja): eseménylapnál az esemény utolsó mentése,
     minden más lapnál a tartalomdokumentum utolsó mentése (store.ts writeSite → updatedAt). Ha nincs ilyen (a mag sosem volt
     mentve), a lastmod elmarad — a generálás napja nem módosítási idő. */
  const eventUpdated = new Map(site.events.map((e) => [`/esemenyek/${e.id}`, e.updatedAt]));
  const lastModOf = (p: string) => (p.startsWith("/esemenyek/") ? eventUpdated.get(p) ?? site.updatedAt : site.updatedAt);
  const weight = (p: string) => (p === "/" ? 1 : p.startsWith("/esemenyek/") ? 0.6 : p === "/adatkezeles" || p === "/impresszum" ? 0.3 : 0.8);
  return publicPaths(site).flatMap((p) => {
    const languages = Object.fromEntries(Object.entries(alternatesFor(p)).map(([l, href]) => [l, absUrl(href)]));
    const mod = lastModOf(p);
    const lastModified = mod && !Number.isNaN(Date.parse(mod)) ? mod.slice(0, 10) : undefined;
    return LANGS.map((l) => ({
      url: absUrl(langPath(l, p)), ...(lastModified ? { lastModified } : {}), alternates: { languages },
      changeFrequency: p === "/" || p === "/esemenyek" ? ("weekly" as const) : ("monthly" as const), priority: weight(p),
    }));
  });
}
