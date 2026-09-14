"use client";

import { useState } from "react";
import type { Dictionary, Lang } from "@/content/types";
import { langPath } from "@/lib/paths";

type State = { s: "idle" | "sending" | "ok" | "err"; msg?: string; field?: string };

/**
 * Jelentkezés egy eseményre — csak igényfelmérés: név, telefon, létszám (e-mail nem kötelező).
 * A jelentkezés az adminban jelenik meg; a részleteket telefonon egyeztetik — ahogy a megbízó kérte.
 */
export function RegistrationForm({ d, privacy, eventId, lang }: { d: Dictionary["reg"]; privacy: Dictionary["form"]["privacy"]; eventId: string; lang: Lang }) {
  const [st, setSt] = useState<State>({ s: "idle" });
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget; const fd = new FormData(form);
    const v = Object.fromEntries(fd) as Record<string, string>;
    const count = Number.parseInt(v.count ?? "", 10);
    if ((v.name ?? "").trim().length < 2) return setSt({ s: "err", msg: d.errName, field: "name" });
    if ((v.phone ?? "").replace(/\D/g, "").length < 6) return setSt({ s: "err", msg: d.errPhone, field: "phone" });
    if (!Number.isInteger(count) || count < 1 || count > 99) return setSt({ s: "err", msg: d.errCount, field: "count" });
    if ((v.email ?? "").trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email.trim())) return setSt({ s: "err", msg: d.errEmail, field: "email" });
    setSt({ s: "sending" });
    try {
      const res = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...v, eventId, lang }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) return setSt({ s: "err", msg: data.error ?? d.err, field: data.field });
      setSt({ s: "ok" }); form.reset();
    } catch { setSt({ s: "err", msg: d.err }); }
  }
  if (st.s === "ok") return <div className="card-note" role="status"><p className="h3" style={{ margin: 0 }}>{d.okTitle}</p><p className="note" style={{ marginTop: 8 }}>{d.okBody}</p></div>;
  return (
    <form onSubmit={onSubmit} className="reg-form" noValidate data-testid="registration-form">
      <div className="reg-grid">
        <div className="field"><label htmlFor="r-name">{d.name}</label><input id="r-name" name="name" aria-invalid={st.field === "name" || undefined} className="input" required autoComplete="name" /></div>
        <div className="field"><label htmlFor="r-phone">{d.phone}</label><input id="r-phone" name="phone" aria-invalid={st.field === "phone" || undefined} type="tel" className="input" required autoComplete="tel" /></div>
        <div className="field"><label htmlFor="r-count">{d.count}</label><div className="reg-count"><input id="r-count" name="count" aria-invalid={st.field === "count" || undefined} type="number" min={1} max={99} defaultValue={1} className="input" required /><span className="note">{d.countHint}</span></div></div>
        <div className="field"><label htmlFor="r-email">{d.email} <span className="note">{d.emailOptional}</span></label><input id="r-email" name="email" aria-invalid={st.field === "email" || undefined} type="email" className="input" autoComplete="email" /></div>
      </div>
      <div className="field"><label htmlFor="r-note">{d.note}</label><textarea id="r-note" name="note" className="input" placeholder={d.notePh} style={{ minHeight: "5rem" }} /></div>
      <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {st.s === "err" && <p role="alert" className="form-err">{st.msg}</p>}
      <div><button className="btn btn-primary" disabled={st.s === "sending"}>{st.s === "sending" ? d.sending : d.send}</button></div>
      <p className="form-privacy" data-form-privacy>{privacy.pre}<a href={langPath(lang, "/adatkezeles")} className="link">{privacy.link}</a>{privacy.post}</p>
    </form>
  );
}
