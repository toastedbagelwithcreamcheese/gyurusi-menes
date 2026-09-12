"use client";

import { useState } from "react";
import type { Dictionary } from "@/content/types";

type State = { s: "idle" | "sending" | "ok" | "err"; msg?: string };

export function ContactForm({ d }: { d: Dictionary["form"] }) {
  const [st, setSt] = useState<State>({ s: "idle" });
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget; const fd = new FormData(form);
    setSt({ s: "sending" });
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(fd)) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? d.err);
      setSt({ s: "ok" }); form.reset();
    } catch (err) { setSt({ s: "err", msg: err instanceof Error ? err.message : d.err }); }
  }
  if (st.s === "ok") return <div className="card-note" role="status"><p className="h3" style={{ margin: 0 }}>{d.okTitle}</p><p className="note" style={{ marginTop: 8 }}>{d.okBody}</p></div>;
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="field"><label htmlFor="c-name">{d.name}</label><input id="c-name" name="name" className="input" required autoComplete="name" /></div>
        <div className="field"><label htmlFor="c-email">{d.email}</label><input id="c-email" name="email" type="email" className="input" required autoComplete="email" /></div>
      </div>
      <div className="field"><label htmlFor="c-phone">{d.phone} <span className="note">{d.phoneOptional}</span></label><input id="c-phone" name="phone" type="tel" className="input" autoComplete="tel" /></div>
      <div className="field"><label htmlFor="c-msg">{d.message}</label><textarea id="c-msg" name="message" className="input" required placeholder={d.messagePh} /></div>
      <div className="hidden" aria-hidden="true"><label>{d.website}<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {st.s === "err" && <p role="alert" style={{ color: "#a12d2d", margin: 0 }}>{st.msg}</p>}
      <div><button className="btn btn-primary" disabled={st.s === "sending"}>{st.s === "sending" ? d.sending : d.send}</button></div>
    </form>
  );
}
