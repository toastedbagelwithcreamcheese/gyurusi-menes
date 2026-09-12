/* Egyszerű képválasztó rádiógombokkal — nincs JS, nincs modal. */
export function ImagePicker({ name, images, value, allowEmpty = true }: {
  name: string; images: Array<{ id: string; src: string; alt: string }>; value?: string; allowEmpty?: boolean;
}) {
  return (
    <div className="picker" role="radiogroup" aria-label="Kép kiválasztása">
      {allowEmpty && (
        <label style={{ display: "grid", placeItems: "center", fontSize: "0.8rem", color: "var(--color-dust)" }}>
          <input type="radio" name={name} value="" defaultChecked={!value} />Nincs kép
        </label>
      )}
      {images.map((im) => (
        <label key={im.id} title={im.alt}>
          <input type="radio" name={name} value={im.id} defaultChecked={value === im.id} />
          <Thumb src={im.src} alt={im.alt} className="" />
        </label>
      ))}
    </div>
  );
}

/** Admin-előnézet: sima <img>, mert itt nem számít az LCP, a next/image csak lassítana. */
export function Thumb({ src, alt = "", className = "thumb" }: { src: string; alt?: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" />;
}
