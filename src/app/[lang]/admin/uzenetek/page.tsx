import { readSite, formatDateTime } from "@/lib/store";
import { markRead, deleteMessage } from "../actions";

export default async function MessagesAdmin() {
  const site = await readSite();
  const msgs = [...site.messages].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  return (
    <>
      <div className="adm-head"><div><h1>Üzenetek</h1><p>A kapcsolati űrlapon beérkezett megkeresések. E-mailben is megkapod az info@gyurusimenes.hu címre, ha a küldés be van állítva.</p></div></div>
      {msgs.length === 0 ? <div className="empty">Még nem érkezett üzenet.</div> : (
        <div className="list">{msgs.map((m) => (
          <article key={m.id} className={`msg ${m.read ? "" : "unread"}`}>
            <header>
              <div><strong>{m.name}</strong> · <a className="link" href={`mailto:${m.email}`}>{m.email}</a>{m.phone && <> · {m.phone}</>}{m.page && <> · <span className="pill pill-off">{m.page}</span></>}</div>
              <div className="note">{formatDateTime(m.receivedAt)}</div>
            </header>
            <pre>{m.message}</pre>
            <div className="actions">
              <a className="btn btn-outline btn-sm" href={`mailto:${m.email}?subject=Re: érdeklődés – Gyűrűsi Ménes`}>Válasz e-mailben</a>
              <form action={markRead}><input type="hidden" name="id" value={m.id} /><button className="btn btn-ghost btn-sm">{m.read ? "Olvasatlannak jelöl" : "Olvasottnak jelöl"}</button></form>
              <form action={deleteMessage}><input type="hidden" name="id" value={m.id} /><button className="btn btn-danger btn-sm">Töröl</button></form>
            </div>
          </article>))}</div>
      )}
    </>
  );
}
