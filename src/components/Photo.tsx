import Image from "next/image";
import photos from "@/content/photos.json";
import type { Lang } from "@/content/types";
import { placeholderStyle } from "@/lib/placeholder";

export type PhotoKey = keyof typeof photos;
export type PhotoMeta = { src: string; width: number; height: number; alt: string; alt_en: string; alt_de: string; blur: string; color: string };
export const PHOTOS = photos as Record<string, PhotoMeta>;

/** A kurált fotó leírása a lap nyelvén (photos.json: alt = magyar, alt_en, alt_de); hiányzó fordításnál a magyar. */
export const photoAlt = (p: PhotoMeta, lang: Lang): string => (lang === "en" ? p.alt_en : lang === "de" ? p.alt_de : p.alt) || p.alt;

/** A mobil menü fotója: a fejléc (kliens-komponens) csak ezt a két mezőt kapja propként, nem a teljes manifestet. */
export function menuPhoto(): { src: string; color: string } | undefined {
  const p = PHOTOS["csiko-portre"];
  return p ? { src: p.src, color: p.color } : undefined;
}

/**
 * Egy kurált fotó a manifestből. A méret ismert → nincs CLS; helyőrző: domináns szín + apró előnézet (src/lib/placeholder.ts).
 * `priority`: a lap LCP-képe — előtöltés a fejben, magas letöltési prioritással, szinkron dekódolással (az első festésben jelenjen meg).
 */
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
      sizes={sizes} {...(priority ? { preload: true, fetchPriority: "high" as const, decoding: "sync" as const } : {})}
      className={className} style={{ ...placeholderStyle(p), ...style }}
      quality={62}
    />
  );
}
