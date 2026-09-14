"use client";

import { useRef, useState } from "react";
import { ImageUpload, type UploadedImage } from "./ImageUpload";

type PickerImage = { id: string; src: string; alt: string };

/**
 * Képválasztó rádiógombokkal, alatta lenyitható „Új kép feltöltése”. A frissen feltöltött kép azonnal megjelenik
 * a rács elején, és ki is választódik — a szerkesztő többi, már beírt mezője közben megmarad (nincs lapváltás).
 */
export function ImagePicker({ name, images, value, allowEmpty = true }: {
  name: string; images: PickerImage[]; value?: string; allowEmpty?: boolean;
}) {
  const [selected, setSelected] = useState(value ?? "");
  const [added, setAdded] = useState<PickerImage[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const known = new Set(images.map((im) => im.id));
  const list = [...added.filter((im) => !known.has(im.id)), ...images];
  const onUploaded = (img: UploadedImage) => {
    setAdded((a) => [{ id: img.id, src: img.src, alt: img.alt }, ...a]);
    setSelected(img.id);
    gridRef.current?.scrollTo({ top: 0 });
  };
  return (
    <div className="picker-wrap" data-picker={name}>
      <div className="picker" role="radiogroup" aria-label="Kép kiválasztása" ref={gridRef}>
        {allowEmpty && (
          <label style={{ display: "grid", placeItems: "center", fontSize: "0.8rem", color: "var(--color-dust)" }}>
            <input type="radio" name={name} value="" checked={selected === ""} onChange={() => setSelected("")} />Nincs kép
          </label>
        )}
        {list.map((im) => (
          <label key={im.id} title={im.alt}>
            <input type="radio" name={name} value={im.id} checked={selected === im.id} onChange={() => setSelected(im.id)} />
            <Thumb src={im.src} alt={im.alt} className="" />
          </label>
        ))}
      </div>
      <details className="picker-upload">
        <summary>Új kép feltöltése</summary>
        <ImageUpload onUploaded={onUploaded} />
      </details>
    </div>
  );
}

/** Admin-előnézet: sima <img>, mert itt nem számít az LCP, a next/image csak lassítana. */
export function Thumb({ src, alt = "", className = "thumb" }: { src: string; alt?: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" />;
}
