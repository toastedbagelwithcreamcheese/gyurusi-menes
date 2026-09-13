"use client";

import Link from "next/link";

/** Váratlan admin-hiba (a várt hibákat a Flash sáv mondja el). Élesben a Next elrejti az üzenetet — ezért az azonosítót mutatjuk. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h2>Váratlan hiba történt</h2>
      <p>A művelet nem fejeződött be. Próbáld újra; ha ismétlődik, írd meg a fejlesztőnek az alábbi azonosítót és azt, mit csináltál éppen.</p>
      <p className="hint">Azonosító: <code>{error.digest ?? "—"}</code>{error.message && process.env.NODE_ENV !== "production" ? ` · ${error.message}` : ""}</p>
      <div className="actions"><button className="btn btn-outline btn-sm" onClick={reset}>Újra</button><Link className="btn btn-ghost btn-sm" href="/admin">Áttekintés</Link></div>
    </div>
  );
}
