import Image from "next/image";
import photos from "@/content/photos.json";

export type PhotoKey = keyof typeof photos;
export const PHOTOS = photos as Record<string, { src: string; width: number; height: number; alt: string; blur: string; color: string }>;

/** Egy kurált fotó a manifestből. A méret ismert → nincs CLS; blur-placeholder a manifestből. */
export function Photo({
  id, alt, sizes = "100vw", priority = false, className = "", fill = false, style,
}: {
  id: string; alt?: string; sizes?: string; priority?: boolean; className?: string; fill?: boolean; style?: React.CSSProperties;
}) {
  const p = PHOTOS[id];
  if (!p) return null;
  return (
    <Image
      src={p.src} alt={alt ?? p.alt}
      {...(fill ? { fill: true } : { width: p.width, height: p.height })}
      sizes={sizes} priority={priority} placeholder="blur" blurDataURL={p.blur}
      className={className} style={{ backgroundColor: p.color, ...style }}
      quality={62}
    />
  );
}
