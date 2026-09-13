"use client";

import { useState } from "react";
import type { Dictionary, Lang } from "@/content/types";

type State = { s: "idle" | "sending" | "ok" | "err"; msg?: string; field?: string };

/** Kapcsolati űrlap; `page` mondja meg, melyik aloldalról jött az üzenet (az adminban és az e-mailben látszik). */
export function ContactForm({ d, page, pageLabel, lang = "hu" }: { d: Dictionary["form"]; page?: string; pageLabel?: string; lang?: Lang }) {
  const [st, setSt] = useState<State>({ s: "idle" });
  const id = page ? `c-${page}` : "c";
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget; const fd = new FormData(form);
    const v = Object.fromEntries(fd) as Record<string, string>;
    /* Előbb helyben, mezőre mutató üzenettel — a szerver ugyanezt ellenőrzi újra. */
    if ((v.name ?? "").trim().length < 2) return setSt({ s: "err", msg: d.errName, field: "name" });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((v.email ?? "").trim())) return setSt({ s: "err", msg: d.errEmail, field: "email" });
    if ((v.message ?? "").trim().length < 10) return setSt({ s: "err", msg: d.errMessage, field: "message" });
    setSt({ s: "sending" });
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...v, page: pageLabel ?? page ?? "", lang }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) return setSt({ s: "err", msg: data.error ?? d.errServer, field: data.field });
      setSt({ s: "ok" }); form.reset();
    } catch { setSt({ s: "err", msg: d.errServer }); }
  }
  if (st.s === "ok") return <div className="card-note" role="status"><p className="h3" style={{ margin: 0 }}>{d.okTitle}</p><p className="note" style={{ marginTop: 8 }}>{d.okBody}</p></div>;
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate data-contact-form={page ?? "home"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="field"><label htmlFor={`${id}-name`}>{d.name}</label><input id={`${id}-name`} name="name" className="input" required autoComplete="name" aria-invalid={st.field === "name" || undefined} /></div>
        <div className="field"><label htmlFor={`${id}-email`}>{d.email}</label><input id={`${id}-email`} name="email" type="email" className="input" required autoComplete="email" aria-invalid={st.field === "email" || undefined} /></div>
      </div>
      <div className="field"><label htmlFor={`${id}-phone`}>{d.phone} <span className="note">{d.phoneOptional}</span></label><input id={`${id}-phone`} name="phone" type="tel" className="input" autoComplete="tel" /></div>
      <div className="field"><label htmlFor={`${id}-msg`}>{d.message}</label><textarea id={`${id}-msg`} name="message" className="input" required placeholder={d.messagePh} aria-invalid={st.field === "message" || undefined} /></div>
      <div className="hidden" aria-hidden="true"><label>{d.website}<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {st.s === "err" && <p role="alert" className="form-err">{st.msg}</p>}
      <div><button className="btn btn-primary" disabled={st.s === "sending"}>{st.s === "sending" ? d.sending : d.send}</button></div>
    </form>
  );
}
