"use client";

import { useEffect, useRef, useState } from "react";
import type { L } from "@/lib/store";
import { missingTranslations, trLabel } from "@/lib/translations";

type Lang3 = "hu" | "en" | "de";

/**
 * Háromnyelvű mező: elöl a magyar, alatta a lenyitható „Fordítások (angol, német)” rész. A lenyitó címkéje élőben
 * mutatja, mi hiányzik („Hiányzik: EN, DE” / „Kész”). Üresen hagyott fordításnál a látogató a magyar szöveget látja
 * (a `t()` a magyarra esik vissza). A mezők nevei változatlanok (`<név>.hu|en|de`), a szerver-akciók ugyanúgy olvassák.
 */
export function LField({ name, label, value, textarea = false, rows, required = false, hint }: { name: string; label: string; value?: L; textarea?: boolean; rows?: number; required?: boolean; hint?: string }) {
  const [vals, setVals] = useState<L>({ hu: value?.hu ?? "", en: value?.en ?? "", de: value?.de ?? "" });
  const huRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  /* Az űrlap mentés utáni visszaállítása (React 19) nem küld input-eseményt: a címke a mezők tényleges értékét olvassa vissza. */
  useEffect(() => {
    const form = huRef.current?.form;
    if (!form) return;
    const onReset = () => setTimeout(() => {
      const get = (l: Lang3) => (form.elements.namedItem(`${name}.${l}`) as HTMLInputElement | null)?.value ?? "";
      setVals({ hu: get("hu"), en: get("en"), de: get("de") });
    }, 0);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [name]);

  const missing = missingTranslations(vals);
  const empty = !vals.hu.trim() && !vals.en.trim() && !vals.de.trim();
  const state = empty ? "empty" : missing.length ? "missing" : "done";
  const status = empty ? "Nincs szöveg" : missing.length ? `Hiányzik: ${trLabel(missing)}` : "Kész";

  const row = (l: Lang3, langName: string) => {
    const id = `${name}.${l}`;
    const common = {
      id, name: id, className: "input", defaultValue: value?.[l] ?? "", required: required && l === "hu", lang: l,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const v = e.target.value; setVals((cur) => ({ ...cur, [l]: v })); },
    };
    return (
      <div className="lfield-row" key={l}>
        <label htmlFor={id} className="lfield-lang"><span>{l.toUpperCase()}</span><small>{langName}</small></label>
        {textarea
          ? <textarea {...common} ref={l === "hu" ? huRef : undefined} style={{ minHeight: rows ? `${rows * 1.6}rem` : undefined }} />
          : <input {...common} ref={l === "hu" ? huRef : undefined} />}
      </div>
    );
  };

  return (
    <fieldset className="lfield" data-lfield={name}>
      <legend>{label}</legend>
      {row("hu", "magyar")}
      <details className="lfield-tr" data-translations={name}>
        <summary>
          <span>Fordítások (angol, német)</span>
          <span className={`tr-status tr-${state}`} data-tr-status={state}>{status}</span>
        </summary>
        {row("en", "angol")}
        {row("de", "német")}
        <p className="hint">Ha üresen marad, az angol, illetve a német oldalon a magyar szöveg jelenik meg.</p>
      </details>
      {hint && <p className="hint">{hint}</p>}
    </fieldset>
  );
}
