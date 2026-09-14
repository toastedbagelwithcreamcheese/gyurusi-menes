import { readSite, formatRange, formatDateTime, isPast, t, type Registration } from "@/lib/store";
import { listRegistrations } from "@/lib/records";
import { maybeRunMaintenance } from "@/lib/maintenance";
import { deleteRegistration } from "../actions";

const persons = (regs: Registration[]) => regs.reduce((a, r) => a + r.count, 0);

function RegTable({ regs }: { regs: Registration[] }) {
  return (
    <table className="reg-table">
      <thead><tr><th>Név</th><th>Telefon</th><th>E-mail</th><th>Fő</th><th>Megjegyzés</th><th>Mikor</th><th></th></tr></thead>
      <tbody>{regs.map((r) => (
        <tr key={r.id} data-registration-row={r.id}>
          <td><strong>{r.name}</strong></td>
          <td><a className="link" href={`tel:${r.phone.replace(/\s/g, "")}`}>{r.phone}</a></td>
          <td>{r.email ? <a className="link" href={`mailto:${r.email}`}>{r.email}</a> : <span className="note">—</span>}</td>
          <td className="n">{r.count}</td>
          <td>{r.note ?? <span className="note">—</span>}</td>
          <td className="note">{formatDateTime(r.receivedAt)}</td>
          <td><form action={deleteRegistration}><input type="hidden" name="id" value={r.id} /><button className="btn btn-danger">Töröl</button></form></td>
        </tr>))}</tbody>
    </table>
  );
}

/** Jelentkezések eseményenként: ki, hányan, elérhetőség — ahogy Emese kérte: ő telefonál mindenkinek. */
export default async function RegistrationsAdmin() {
  /* Az esemény vége után 30 nappal a jelentkezések törlődnek (adatkezelési ígéret) — a napi futáson túl itt is, óránként legfeljebb egyszer. */
  await maybeRunMaintenance();
  const [site, all] = await Promise.all([readSite(), listRegistrations()]);
  const eventIds = new Set(site.events.map((e) => e.id));
  const withRegs = site.events.filter((e) => all.some((r) => r.eventId === e.id)).sort((a, b) => b.date.localeCompare(a.date));
  const orphans = all.filter((r) => !eventIds.has(r.eventId));
  return (
    <>
      <div className="adm-head"><div><h1>Jelentkezések</h1><p>Igényfelmérés: itt látod, ki és hányan jelentkeztek. A részleteket telefonon egyeztesd velük — nincs automatikus foglalás. Az esemény után 30 nappal a jelentkezések automatikusan törlődnek.</p></div></div>
      {all.length === 0 ? <div className="empty">Még nincs jelentkezés. Egy eseménynél kapcsold be a „Jelentkezés nyitva” lehetőséget.</div> : <>
        {withRegs.map((e) => {
          const regs = all.filter((r) => r.eventId === e.id);
          return (
            <section key={e.id} className="reg-group" data-reg-group={e.id}>
              <header><h2>{t(e.title, "hu")} <span className="note">· {formatRange(e, "hu")}{isPast(e) ? " · lezajlott" : ""}</span></h2><span className="reg-total">{persons(regs)} fő<small>{regs.length} jelentkezés</small></span></header>
              <RegTable regs={regs} />
            </section>
          );
        })}
        {orphans.length > 0 && (
          <section className="reg-group" data-reg-group="torolt-esemeny">
            <header><h2>Törölt esemény jelentkezései <span className="note">· az esemény már nincs meg; 30 nap után automatikusan törlődnek</span></h2><span className="reg-total">{persons(orphans)} fő<small>{orphans.length} jelentkezés</small></span></header>
            <RegTable regs={orphans} />
          </section>
        )}
      </>}
    </>
  );
}
