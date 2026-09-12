import { readSite, formatRange, formatDateTime, isPast, t } from "@/lib/store";
import { deleteRegistration } from "../actions";

/** Jelentkezések eseményenként: ki, hányan, elérhetőség — ahogy Emese kérte: ő telefonál mindenkinek. */
export default async function RegistrationsAdmin() {
  const site = await readSite();
  const withRegs = site.events.filter((e) => site.registrations.some((r) => r.eventId === e.id)).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <div className="adm-head"><div><h1>Jelentkezések</h1><p>Igényfelmérés: itt látod, ki és hányan jelentkeztek. A részleteket telefonon egyeztesd velük — nincs automatikus foglalás.</p></div></div>
      {withRegs.length === 0 ? <div className="empty">Még nincs jelentkezés. Egy eseménynél kapcsold be a „Jelentkezés nyitva” lehetőséget.</div> : withRegs.map((e) => {
        const regs = site.registrations.filter((r) => r.eventId === e.id).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
        const total = regs.reduce((a, r) => a + r.count, 0);
        return (
          <section key={e.id} className="reg-group" data-reg-group={e.id}>
            <header><h2>{t(e.title, "hu")} <span className="note">· {formatRange(e, "hu")}{isPast(e) ? " · lezajlott" : ""}</span></h2><span className="reg-total">{total} fő<small>{regs.length} jelentkezés</small></span></header>
            <table className="reg-table">
              <thead><tr><th>Név</th><th>Telefon</th><th>E-mail</th><th>Fő</th><th>Megjegyzés</th><th>Mikor</th><th></th></tr></thead>
              <tbody>{regs.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.name}</strong></td>
                  <td><a className="link" href={`tel:${r.phone.replace(/\s/g, "")}`}>{r.phone}</a></td>
                  <td>{r.email ? <a className="link" href={`mailto:${r.email}`}>{r.email}</a> : <span className="note">—</span>}</td>
                  <td className="n">{r.count}</td>
                  <td>{r.note ?? <span className="note">—</span>}</td>
                  <td className="note">{formatDateTime(r.receivedAt)}</td>
                  <td><form action={deleteRegistration}><input type="hidden" name="id" value={r.id} /><button className="btn btn-danger">Töröl</button></form></td>
                </tr>))}</tbody>
            </table>
          </section>
        );
      })}
    </>
  );
}
