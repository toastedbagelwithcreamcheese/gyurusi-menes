"use client";

import { useState } from "react";
import { ImageUpload, type UploadedImage } from "./ImageUpload";
import { Thumb } from "./ImagePicker";

type PickerImage = { id: string; src: string; alt: string };

/**
 * Több kép kijelölése legfeljebb `max` darabig (a túraútvonal fotói). A sorrend a kijelölés sorrendje: ezt rejtett
 * mezők viszik (`name` többször), mert a jelölőnégyzetek a rács sorrendjében küldenék. Alatta lenyitható feltöltő
 * (a P2 ImageUpload-ja): az új kép a rács elejére kerül, és kijelölődik, ha még van hely.
 */
export function PhotoPicker({ name, images, value, max }: { name: string; images: PickerImage[]; value: string[]; max: number }) {
  const [selected, setSelected] = useState<string[]>(value.slice(0, max));
  const [added, setAdded] = useState<PickerImage[]>([]);
  const [note, setNote] = useState("");
  const known = new Set(images.map((im) => im.id));
  const list = [...added.filter((im) => !known.has(im.id)), ...images];
  const full = selected.length >= max;

  const toggle = (id: string) => {
    setNote("");
    setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : sel.length >= max ? sel : [...sel, id]));
  };
  const onUploaded = (img: UploadedImage) => {
    setAdded((a) => [{ id: img.id, src: img.src, alt: img.alt }, ...a]);
    if (selected.length >= max) setNote(`A kép feltöltődött, de már ${max} fotó ki van jelölve. Vegyél ki egyet, és jelöld ki az újat.`);
    setSelected((sel) => (sel.length >= max || sel.includes(img.id) ? sel : [...sel, img.id]));
  };

  return (
    <div className="picker-wrap photo-picker" data-photo-picker={name}>
      {selected.map((id) => <input key={id} type="hidden" name={name} value={id} />)}
      <p className="hint" data-photo-count={selected.length}>{selected.length} / {max} kijelölve{full ? " — több nem fér; egy kijelölt képre kattintva kiveheted." : ""}</p>
      <div className="picker" role="group" aria-label="Fotók kijelölése">
        {list.map((im) => {
          const n = selected.indexOf(im.id), on = n >= 0;
          return (
            <label key={im.id} title={im.alt} data-photo-option={im.id}>
              <input type="checkbox" checked={on} disabled={!on && full} onChange={() => toggle(im.id)} aria-label={im.alt || im.id} />
              <Thumb src={im.src} alt="" className="" />
              {on && <span className="photo-order" aria-hidden="true">{n + 1}</span>}
            </label>
          );
        })}
      </div>
      {note && <p className="hint" role="status">{note}</p>}
      <details className="picker-upload">
        <summary>Új kép feltöltése</summary>
        <ImageUpload onUploaded={onUploaded} />
      </details>
    </div>
  );
}
