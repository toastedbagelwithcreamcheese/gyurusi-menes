"use client";

import { useState } from "react";
import type { Dictionary, Lang } from "@/content/types";

type State = { s: "idle" | "sending" | "ok" | "err"; msg?: string };

/**
 * Jelentkezés egy eseményre — csak igényfelmérés: név, telefon, létszám (e-mail nem kötelező).
 * A jelentkezés az adminban jelenik meg; a részleteket telefonon egyeztetik — ahogy a megbízó kérte.
 */
export function RegistrationForm({ d, eventId, lang }: { d: Dictionary["reg"]; eventId: string; lang: Lang }) {
  const [st, setSt] = useState<State>({ s: "idle" });
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget; const fd = new FormData(form);
    setSt({ s: "sending" });
    try {
      const res = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(fd), eventId, lang }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? d.err);
      setSt({ s: "ok" }); form.reset();
    } catch (err) { setSt({ s: "err", msg: err instanceof Error ? err.message : d.err }); }
  }
  if (st.s === "ok") return <div className="card-note" role="status"><p className="h3" style={{ margin: 0 }}>{d.okTitle}</p><p className="note" style={{ marginTop: 8 }}>{d.okBody}</p></div>;
  return (
    <form onSubmit={onSubmit} className="reg-form" noValidate data-testid="registration-form">
      <div className="reg-grid">
        <div className="field"><label htmlFor="r-name">{d.name}</label><input id="r-name" name="name" className="input" required autoComplete="name" /></div>
        <div className="field"><label htmlFor="r-phone">{d.phone}</label><input id="r-phone" name="phone" type="tel" className="input" required autoComplete="tel" /></div>
        <div className="field"><label htmlFor="r-count">{d.count}</label><div className="reg-count"><input id="r-count" name="count" type="number" min={1} max={99} defaultValue={1} className="input" required /><span className="note">{d.countHint}</span></div></div>
        <div className="field"><label htmlFor="r-email">{d.email} <span className="note">{d.emailOptional}</span></label><input id="r-email" name="email" type="email" className="input" autoComplete="email" /></div>
      </div>
      <div className="field"><label htmlFor="r-note">{d.note}</label><textarea id="r-note" name="note" className="input" placeholder={d.notePh} style={{ minHeight: "5rem" }} /></div>
      <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {st.s === "err" && <p role="alert" style={{ color: "#a12d2d", margin: 0 }}>{st.msg}</p>}
      <div><button className="btn btn-primary" disabled={st.s === "sending"}>{st.s === "sending" ? d.sending : d.send}</button></div>
    </form>
  );
}
