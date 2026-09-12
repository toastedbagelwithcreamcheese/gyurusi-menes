import type { L } from "@/lib/store";

/** Háromnyelvű mező: HU / EN / DE egymás alatt, egy címkével. A magyar kötelező, a másik kettő is kitöltendő (a `t()` a magyarra esik vissza). */
export function LField({ name, label, value, textarea = false, rows, required = false, hint }: { name: string; label: string; value?: L; textarea?: boolean; rows?: number; required?: boolean; hint?: string }) {
  const langs: Array<["hu" | "en" | "de", string]> = [["hu", "magyar"], ["en", "angol"], ["de", "német"]];
  return (
    <fieldset className="lfield">
      <legend>{label}</legend>
      {langs.map(([l, n]) => {
        const id = `${name}.${l}`;
        const common = { id, name: id, className: "input", defaultValue: value?.[l] ?? "", required: required && l === "hu", lang: l };
        return (
          <div className="lfield-row" key={l}>
            <label htmlFor={id} className="lfield-lang"><span>{l.toUpperCase()}</span><small>{n}</small></label>
            {textarea ? <textarea {...common} style={{ minHeight: rows ? `${rows * 1.6}rem` : undefined }} /> : <input {...common} />}
          </div>
        );
      })}
      {hint && <p className="hint">{hint}</p>}
    </fieldset>
  );
}
