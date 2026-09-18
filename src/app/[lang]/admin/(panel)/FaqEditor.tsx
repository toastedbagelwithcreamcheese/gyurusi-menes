"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/store";
import { LField } from "./LField";

/**
 * GYIK / tudnivalók szerkesztője: kérdés–válasz párok háromnyelvűen, hozzáadás, törlés, sorrend.
 * A mezők neve a pozíciót követi (`faq.<i>.q.hu` …): a szerver-akció sorban olvassa, az üres sort kihagyja.
 * A sorok kulcsa állandó, így átrendezéskor a beírt (még nem mentett) szöveg a helyén marad.
 */
export function FaqEditor({ items, max }: { items: FaqItem[]; max: number }) {
  const [rows, setRows] = useState(() => items.map((it, i) => ({ key: `r${i}`, it })));
  const [seq, setSeq] = useState(items.length);
  const add = () => { setRows((r) => [...r, { key: `n${seq}`, it: { q: { hu: "", en: "", de: "" }, a: { hu: "", en: "", de: "" } } }]); setSeq((n) => n + 1); };
  const remove = (key: string) => setRows((r) => r.filter((x) => x.key !== key));
  const move = (i: number, d: -1 | 1) => setRows((r) => { const n = [...r]; const j = i + d; if (j < 0 || j >= n.length) return r; [n[i], n[j]] = [n[j], n[i]]; return n; });
  return (
    <div className="faq-editor" data-faq-editor>
      {rows.length === 0 && <p className="hint" data-faq-empty>Még nincs kérdés — amíg nincs, a blokk nem jelenik meg az oldalon.</p>}
      {rows.map((row, i) => (
        <div key={row.key} className="faq-edit-row" data-faq-row={i}>
          <div className="faq-edit-head">
            <strong>{i + 1}. kérdés</strong>
            <span className="faq-edit-ops">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${i + 1}. kérdés feljebb`}>↑</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`${i + 1}. kérdés lejjebb`}>↓</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(row.key)} data-faq-remove>Eltávolítás</button>
            </span>
          </div>
          <LField name={`faq.${i}.q`} label="Kérdés" value={row.it.q} />
          <LField name={`faq.${i}.a`} label="Válasz" value={row.it.a} textarea rows={3} hint="Üres sor = új bekezdés." />
        </div>
      ))}
      {rows.length < max
        ? <button type="button" className="btn btn-outline btn-sm" onClick={add} data-faq-add>+ Új kérdés</button>
        : <p className="hint">Legfeljebb {max} kérdés lehet.</p>}
      <p className="hint">Az eltávolítás és a sorrend a „Mentés” után lesz végleges.</p>
    </div>
  );
}
