"use client";

import { useState } from "react";

type State = { s: "idle" | "sending" | "ok" | "err"; msg?: string };

export function ContactForm() {
  const [st, setSt] = useState<State>({ s: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSt({ s: "sending" });
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(fd)) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Nem sikerült elküldeni.");
      setSt({ s: "ok" });
      e.currentTarget.reset();
    } catch (err) {
      setSt({ s: "err", msg: err instanceof Error ? err.message : "Nem sikerült elküldeni." });
    }
  }

  if (st.s === "ok") {
    return (
      <div className="card-note" role="status">
        <p className="h3" style={{ margin: 0 }}>Megkaptuk az üzeneted.</p>
        <p className="note" style={{ marginTop: 8 }}>Hamarosan válaszolunk. Ha sürgős, hívj minket telefonon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="field"><label htmlFor="c-name">Név</label><input id="c-name" name="name" className="input" required autoComplete="name" /></div>
        <div className="field"><label htmlFor="c-email">E-mail</label><input id="c-email" name="email" type="email" className="input" required autoComplete="email" /></div>
      </div>
      <div className="field"><label htmlFor="c-phone">Telefon <span className="note">(nem kötelező)</span></label><input id="c-phone" name="phone" type="tel" className="input" autoComplete="tel" /></div>
      <div className="field"><label htmlFor="c-msg">Üzenet</label><textarea id="c-msg" name="message" className="input" required placeholder="Mikor jönnétek, hányan, mi érdekel?" /></div>
      <div className="hidden" aria-hidden="true"><label>Weboldal<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {st.s === "err" && <p role="alert" style={{ color: "#a12d2d", margin: 0 }}>{st.msg}</p>}
      <div><button className="btn btn-primary" disabled={st.s === "sending"}>{st.s === "sending" ? "Küldés…" : "Üzenet küldése"}</button></div>
    </form>
  );
}
