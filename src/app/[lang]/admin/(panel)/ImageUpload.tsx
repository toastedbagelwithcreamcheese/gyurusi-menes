"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IMAGE_CLIENT_EDGE, IMAGE_MAX_BYTES, IMAGE_TARGET_BYTES, formatMB, imageTooLargeMessage } from "@/lib/upload-limits";
import { missingTranslations, trLabel } from "@/lib/translations";
import { UploadError, UploadStatusView, messageOf, sendXhr, type UploadStatus } from "./upload-client";

export type UploadedImage = { id: string; src: string; alt: string; width: number; height: number };

/**
 * Képfeltöltés az adminban (Képek lap és minden képválasztó alatt). A kiválasztott képet a BÖNGÉSZŐ nyitja meg,
 * a hosszabb oldalát 2400 px-re kicsinyíti és WebP-be (ha a böngésző nem tud WebP-t: JPEG-be) kódolja ~1,5 MB alá —
 * így egy 8–10 MB-os telefonos vagy fényképezőgépes fotó is gyorsan és a tárhely kéréskorlátja alatt megy fel.
 * A feltöltés route handleren megy (POST /api/admin/upload-image), folyamatjelzővel; siker után router.refresh().
 * Nem <form>: a képválasztó egy másik űrlap (esemény, aloldal) belsejében áll, a gombjai type="button"-ok.
 */
export function ImageUpload({ onUploaded }: { onUploaded?: (img: UploadedImage) => void }) {
  const uid = useId();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const altRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>({ kind: "idle" });
  /* A leírás háromnyelvű: a magyar kötelező, az angol és a német a „Fordítások” alatt (a hiányt a címke mutatja, mint az LField-ben). */
  const [alt, setAlt] = useState({ hu: "", en: "", de: "" });
  const busy = status.kind === "work";
  const miss = missingTranslations(alt);

  async function start() {
    if (busy) return;
    const file = fileRef.current?.files?.[0];
    if (!file) { setStatus({ kind: "err", text: "Nem választottál képet. Kattints a „Fájl kiválasztása” gombra, és válassz egy fotót." }); return; }
    const texts = { hu: alt.hu.trim(), en: alt.en.trim(), de: alt.de.trim() };
    if (!texts.hu) { setStatus({ kind: "err", text: "Írj egy rövid magyar leírást a képhez (mi látható rajta) — ezt olvassa fel a képernyőolvasó, és ezt látják a keresők." }); altRef.current?.focus(); return; }
    try {
      setStatus({ kind: "work", label: `A kép előkészítése (${file.name}, ${formatMB(file.size)})…`, pct: null });
      const blob = await prepareImage(file);
      const label = `Feltöltés: ${formatMB(blob.size)}`;
      setStatus({ kind: "work", label, pct: 0 });
      const res = await sendXhr(`/api/admin/upload-image?${new URLSearchParams({ alt: texts.hu, alt_en: texts.en, alt_de: texts.de, name: file.name })}`, blob, blob.type, (loaded, total) =>
        setStatus({ kind: "work", label, pct: Math.min(99, Math.floor((loaded / total) * 100)) }));
      if (!res.ok) throw new UploadError(res.error);
      const image = res.image as UploadedImage;
      setStatus({ kind: "ok", text: res.message, id: image.id });
      if (fileRef.current) fileRef.current.value = "";
      setAlt({ hu: "", en: "", de: "" });
      onUploaded?.(image);
      router.refresh();
    } catch (e) {
      setStatus({ kind: "err", text: messageOf(e) });
    }
  }

  return (
    <div className="upl" data-image-upload>
      <div className="form-row">
        <div className="field">
          <label htmlFor={`${uid}-file`}>Kép (JPG, PNG vagy WebP — a nagy fotót automatikusan kicsinyítjük)</label>
          <input id={`${uid}-file`} ref={fileRef} type="file" accept="image/*,.heic,.heif" className="input" disabled={busy} data-upload-file />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-alt`}>Rövid leírás magyarul (kötelező: mi látható a képen)</label>
          <input id={`${uid}-alt`} ref={altRef} className="input" placeholder="pl. Túraútvonal a Zalai-dombságban" disabled={busy} data-upload-alt lang="hu"
            value={alt.hu} onChange={(e) => { const v = e.target.value; setAlt((a) => ({ ...a, hu: v })); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void start(); } }} />
        </div>
      </div>
      <details className="lfield-tr" data-upload-translations>
        <summary>
          <span>Fordítások (angol, német)</span>
          <span className={`tr-status tr-${!alt.hu.trim() && !alt.en.trim() && !alt.de.trim() ? "empty" : miss.length ? "missing" : "done"}`} data-tr-status>
            {miss.length ? `Hiányzik: ${trLabel(miss)}` : alt.hu.trim() ? "Kész" : "Nincs szöveg"}
          </span>
        </summary>
        {(["en", "de"] as const).map((l) => (
          <div className="lfield-row" key={l}>
            <label htmlFor={`${uid}-alt-${l}`} className="lfield-lang"><span>{l.toUpperCase()}</span><small>{l === "en" ? "angol" : "német"}</small></label>
            <input id={`${uid}-alt-${l}`} className="input" lang={l} disabled={busy} {...{ [`data-upload-alt-${l}`]: "" }}
              value={alt[l]} onChange={(e) => { const v = e.target.value; setAlt((a) => ({ ...a, [l]: v })); }} />
          </div>
        ))}
        <p className="hint">Ha üresen marad, az angol, illetve a német oldalon a magyar leírás jelenik meg. Utólag a Képek lapon is pótolható.</p>
      </details>
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={() => void start()} disabled={busy} data-upload-submit>{busy ? "Feltöltés folyamatban…" : "Feltöltés"}</button>
      </div>
      <UploadStatusView status={status} />
    </div>
  );
}

/* ---------- A kép előkészítése a böngészőben ---------- */

const isHeic = (f: File) => /image\/hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name);

const heicMessage = (name: string) => `Ezt a képet (${name}) a böngésző nem tudja megnyitni, mert HEIC formátumú — ilyet az iPhone készít. Így töltheted fel:
• iPhone-ról: nyisd meg ezt az admin lapot a telefonon, és a Fotókból válaszd ki a képet (megosztáskor a telefon JPEG-et ad), vagy a Beállítások → Kamera → Formátumok alatt válaszd a „Legkompatibilisebb” formátumot, és az új fotók már JPEG-ben készülnek.
• Macen: nyisd meg a képet a Fotókban vagy az Előnézetben, exportáld JPEG formátumba (Fájl → Exportálás), és azt a fájlt töltsd fel.`;

const undecodableMessage = (name: string) =>
  `Ezt a fájlt (${name}) a böngésző nem tudja képként megnyitni — lehet, hogy sérült, vagy olyan formátumú, amit nem ismer. Exportáld JPEG formátumba (pl. a Fotók vagy az Előnézet appban: Fájl → Exportálás), és azt töltsd fel.`;

type Decoded = { width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; close: () => void };

/** Dekódolás: createImageBitmap (az EXIF-elforgatást is alkalmazza), tartalékként <img>. */
async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { width: bmp.width, height: bmp.height, draw: (ctx, w, h) => ctx.drawImage(bmp, 0, 0, w, h), close: () => bmp.close() };
    } catch { /* tartalék: <img> */ }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
    if (!img.naturalWidth || !img.naturalHeight) throw new Error("üres kép");
  } catch (e) { URL.revokeObjectURL(url); throw e; }
  return { width: img.naturalWidth, height: img.naturalHeight, draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h), close: () => URL.revokeObjectURL(url) };
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, quality));

/** Méret és minőség lépcsőzetesen, amíg a fájl a cél (1,5 MB) alá nem kerül. */
const ATTEMPTS: Array<[edge: number, quality: number]> = [[IMAGE_CLIENT_EDGE, 0.85], [IMAGE_CLIENT_EDGE, 0.75], [2000, 0.75], [1600, 0.72], [1280, 0.68]];

async function prepareImage(file: File): Promise<Blob> {
  const imageLike = file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|avif|heic|heif|bmp|tiff?)$/i.test(file.name);
  if (!imageLike) throw new UploadError(`Ez nem képfájl (${file.type || "ismeretlen típus"}: ${file.name}). JPG, PNG vagy WebP képet tölts fel.`);
  let src: Decoded;
  try { src = await decode(file); }
  catch { throw new UploadError(isHeic(file) ? heicMessage(file.name) : undecodableMessage(file.name)); }
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new UploadError("A böngésző nem tudja átméretezni a képet (nincs vászon-támogatás). Próbáld egy friss Chrome, Safari vagy Firefox böngészőben.");
    const probe = document.createElement("canvas"); probe.width = probe.height = 1;
    const type = probe.toDataURL("image/webp").startsWith("data:image/webp") ? "image/webp" : "image/jpeg";
    let best: Blob | null = null;
    for (const [edge, quality] of ATTEMPTS) {
      const scale = Math.min(1, edge / Math.max(src.width, src.height));
      canvas.width = Math.max(1, Math.round(src.width * scale));
      canvas.height = Math.max(1, Math.round(src.height * scale));
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      if (type === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); } // a JPEG-nek nincs átlátszósága
      src.draw(ctx, canvas.width, canvas.height);
      const blob = await toBlob(canvas, type, quality);
      if (!blob) continue;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= IMAGE_TARGET_BYTES) break;
    }
    if (!best) throw new UploadError(undecodableMessage(file.name));
    if (best.size > IMAGE_MAX_BYTES) throw new UploadError(imageTooLargeMessage(best.size));
    return best;
  } finally {
    src.close();
  }
}
