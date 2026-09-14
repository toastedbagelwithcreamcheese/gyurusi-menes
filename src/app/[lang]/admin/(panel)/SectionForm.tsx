"use client";

import { Suspense, useState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";

/**
 * Egy külön mentett rész a „Főoldal és kapcsolat” lapon: saját űrlap, saját szerver-akció, saját mentés gomb.
 * A gomb mellett látszik, ha a részben nem mentett módosítás van, és a mentés után a visszajelzés is (a Flash-sáv
 * a lap tetején ugyanezt mondja — a hosszú lapon viszont a gomb mellé is kell, ahol a szerkesztő éppen áll).
 */
export function SectionForm({ id, title, hint, action, saveLabel, children }: {
  id: string; title: string; hint?: string; action: (fd: FormData) => Promise<void>; saveLabel: string; children: React.ReactNode;
}) {
  const [dirty, setDirty] = useState(false);
  return (
    <section id={id} className="card adm-section" data-section={id} aria-labelledby={`${id}-cim`}>
      <form action={action} className="form" onInput={() => setDirty(true)} onChange={() => setDirty(true)} onSubmit={() => setDirty(false)}>
        <h2 id={`${id}-cim`}>{title}</h2>
        {hint && <p className="hint" style={{ marginTop: -8 }}>{hint}</p>}
        {children}
        <div className="actions">
          <SaveButton id={id} label={saveLabel} />
          {dirty && <span className="note" data-section-dirty>Nem mentett módosítás ebben a részben</span>}
          <Suspense fallback={null}><SectionStatus id={id} /></Suspense>
        </div>
      </form>
    </section>
  );
}

function SaveButton({ id, label }: { id: string; label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn btn-primary" disabled={pending} data-section-save={id}>{pending ? "Mentés…" : label}</button>;
}

function SectionStatus({ id }: { id: string }) {
  const sp = useSearchParams();
  const ok = sp.get("ok"), hiba = sp.get("hiba");
  if (sp.get("szakasz") !== id || (!ok && !hiba)) return null;
  return <span className={`section-status ${hiba ? "section-status-err" : "section-status-ok"}`} data-section-status={hiba ? "err" : "ok"}>{hiba ? `Nem sikerült: ${hiba}` : `✓ ${ok}`}</span>;
}
