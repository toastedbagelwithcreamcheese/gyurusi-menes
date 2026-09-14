"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

const RESET_MS = 6000;
/** Az első kattintás után ennyi ideig a megerősítő gomb nem reagál: egy dupla kattintás így sem töröl. */
const GUARD_MS = 300;

/**
 * Kétlépcsős törlés natív confirm() nélkül. A körülvevő `<form action={…}>` marad a helyén; ez a gomb az első
 * kattintásra csak megkérdezi („Biztosan törlöd?”), és az űrlapot az „Igen, törlöm” küldi el. 6 másodperc után,
 * vagy a „Mégse” gombra visszaáll. Küldés közben „Törlés…”. Tesztekhez: data-confirm = idle | armed | busy.
 */
export function ConfirmButton({ children, className = "btn btn-danger btn-sm", question = "Biztosan törlöd?", yes = "Igen, törlöm", no = "Mégse", compact = false }: {
  children: React.ReactNode; className?: string; question?: string; yes?: string; no?: string; compact?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const armedAt = useRef(0);
  const wasArmed = useRef(false);
  const startRef = useRef<HTMLButtonElement>(null);
  const noRef = useRef<HTMLButtonElement>(null);
  const { pending } = useFormStatus();

  useEffect(() => {
    if (armed) {
      wasArmed.current = true;
      noRef.current?.focus(); // a billentyűzetes fókusz a biztonságos gombra kerül, nem a törlésre
      const t = setTimeout(() => setArmed(false), RESET_MS);
      return () => clearTimeout(t);
    }
    /* Visszaálláskor az eltűnt gombokról a fókusz a törlés gombra kerül vissza (ne vesszen el a lap elejére). */
    if (wasArmed.current && document.activeElement === document.body) startRef.current?.focus();
  }, [armed]);

  if (pending) {
    return <span className="confirm" data-confirm="busy"><button type="button" className={className} disabled>Törlés…</button></span>;
  }
  if (!armed) {
    return (
      <span className="confirm" data-confirm="idle">
        <button type="button" ref={startRef} className={className} data-confirm-start onClick={() => { armedAt.current = Date.now(); setArmed(true); }}>{children}</button>
      </span>
    );
  }
  return (
    <span className={`confirm confirm-armed${compact ? " confirm-compact" : ""}`} data-confirm="armed" role="group" aria-label={question}>
      <span className="confirm-q">{question}</span>
      <button type="submit" className="btn btn-sm confirm-yes" data-confirm-yes
        onClick={(e) => { if (Date.now() - armedAt.current < GUARD_MS) e.preventDefault(); }}>{yes}</button>
      <button type="button" ref={noRef} className="btn btn-ghost btn-sm confirm-no" data-confirm-no onClick={() => setArmed(false)}>{no}</button>
    </span>
  );
}
