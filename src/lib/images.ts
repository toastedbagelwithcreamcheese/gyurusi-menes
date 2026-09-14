import { PHOTOS, photoAlt } from "@/components/Photo";
import type { Lang } from "@/content/types";
import type { L, SiteContent, Upload } from "./store";

export type ImageMeta = { src: string; width: number; height: number; alt: string; blur?: string; color?: string };

/**
 * Egy képazonosító feloldása: vagy kurált fotó (slug), vagy admin-feltöltés (upload id). A képleírás a lap nyelvén:
 * a kurált fotóké a photos.json alt / alt_en / alt_de mezőiből, a feltöltött képeké az upload `alt` (hu/en/de) mezőiből —
 * ha a fordítás hiányzik, a magyar (mint minden háromnyelvű mezőnél; az admin Képek lapja jelzi a hiányt).
 * A `lang` alapértéke a magyar — az admin lapjai így hívják.
 */
export function resolveImage(id: string | undefined, site: Pick<SiteContent, "uploads">, lang: Lang = "hu"): ImageMeta | null {
  if (!id) return null;
  const p = PHOTOS[id];
  if (p) return { src: p.src, width: p.width, height: p.height, alt: photoAlt(p, lang), blur: p.blur, color: p.color };
  const u = site.uploads.find((x) => x.id === id);
  return u ? uploadMeta(u, lang) : null;
}

/** A feltöltés leírása egy nyelven. Nem a store `t()`-je: az a node:fs-t is behúzná minden modulba, amely ezt importálja. */
export const uploadAlt = (alt: L | string | undefined, lang: Lang): string =>
  typeof alt === "string" ? alt : (alt?.[lang]?.trim() || alt?.hu?.trim() || "");

const uploadMeta = (u: Upload, lang: Lang): ImageMeta => ({ src: u.src, width: u.width, height: u.height, alt: uploadAlt(u.alt, lang), blur: u.blur, color: u.color });

export function allImages(site: Pick<SiteContent, "uploads">, lang: Lang = "hu"): Array<{ id: string } & ImageMeta> {
  const curated = Object.entries(PHOTOS).map(([id, p]) => ({ id, src: p.src, width: p.width, height: p.height, alt: photoAlt(p, lang), blur: p.blur, color: p.color }));
  const uploads = site.uploads.map((u) => ({ id: u.id, ...uploadMeta(u, lang) }));
  return [...uploads, ...curated];
}

/** A képválasztónak (kliens-komponens) csak ennyi kell — az elmosott előnézetek ne utazzanak minden választóba. */
export function pickerImages(site: Pick<SiteContent, "uploads">): Array<{ id: string; src: string; alt: string }> {
  return allImages(site).map(({ id, src, alt }) => ({ id, src, alt }));
}
