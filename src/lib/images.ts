import { PHOTOS } from "@/components/Photo";
import type { SiteContent, Upload } from "./store";

export type ImageMeta = { src: string; width: number; height: number; alt: string; blur?: string; color?: string };

/** Egy képazonosító feloldása: vagy kurált fotó (slug), vagy admin-feltöltés (upload id). */
export function resolveImage(id: string | undefined, site: Pick<SiteContent, "uploads">): ImageMeta | null {
  if (!id) return null;
  if (PHOTOS[id]) return PHOTOS[id];
  const u = site.uploads.find((x) => x.id === id);
  return u ? { src: u.src, width: u.width, height: u.height, alt: u.alt, blur: u.blur, color: u.color } : null;
}

export function allImages(site: Pick<SiteContent, "uploads">): Array<{ id: string } & ImageMeta> {
  const curated = Object.entries(PHOTOS).map(([id, p]) => ({ id, ...p }));
  const uploads = site.uploads.map((u: Upload) => ({ id: u.id, src: u.src, width: u.width, height: u.height, alt: u.alt, blur: u.blur, color: u.color }));
  return [...uploads, ...curated];
}

/** A képválasztónak (kliens-komponens) csak ennyi kell — az elmosott előnézetek ne utazzanak minden választóba. */
export function pickerImages(site: Pick<SiteContent, "uploads">): Array<{ id: string; src: string; alt: string }> {
  return allImages(site).map(({ id, src, alt }) => ({ id, src, alt }));
}
