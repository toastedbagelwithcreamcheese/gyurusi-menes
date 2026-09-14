import Image from "next/image";
import photos from "@/content/photos.json";
import type { Lang } from "@/content/types";

export type PhotoKey = keyof typeof photos;
export type PhotoMeta = { src: string; width: number; height: number; alt: string; alt_en: string; alt_de: string; blur: string; color: string };
export const PHOTOS = photos as Record<string, PhotoMeta>;

/** A kurált fotó leírása a lap nyelvén (photos.json: alt = magyar, alt_en, alt_de); hiányzó fordításnál a magyar. */
export const photoAlt = (p: PhotoMeta, lang: Lang): string => (lang === "en" ? p.alt_en : lang === "de" ? p.alt_de : p.alt) || p.alt;

/** Egy kurált fotó a manifestből. A méret ismert → nincs CLS; blur-placeholder a manifestből. */
export function Photo({
  id, lang = "hu", alt, sizes = "100vw", priority = false, className = "", fill = false, style,
}: {
  id: string; lang?: Lang; alt?: string; sizes?: string; priority?: boolean; className?: string; fill?: boolean; style?: React.CSSProperties;
}) {
  const p = PHOTOS[id];
  if (!p) return null;
  return (
    <Image
      src={p.src} alt={alt ?? photoAlt(p, lang)}
      {...(fill ? { fill: true } : { width: p.width, height: p.height })}
      sizes={sizes} priority={priority} placeholder="blur" blurDataURL={p.blur}
      className={className} style={{ backgroundColor: p.color, ...style }}
      quality={62}
    />
  );
}
