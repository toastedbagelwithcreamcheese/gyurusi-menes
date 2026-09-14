import Link from "next/link";
import { readSite, upcoming, formatRange, t } from "@/lib/store";
import { listMessages, listRegistrations } from "@/lib/records";

export default async function AdminHome() {
  const [site, messages, registrations] = await Promise.all([readSite(), listMessages(), listRegistrations()]);
  const next = upcoming(site.events);
  const unread = messages.filter((m) => !m.read).length;
  const openIds = new Set(next.map((e) => e.id));
  const regs = registrations.filter((r) => openIds.has(r.eventId));
  const persons = regs.reduce((a, r) => a + r.count, 0);
  return (
    <>
      <div className="adm-head"><div><h1>Áttekintés</h1><p>Amit a látogatók most látnak, és ami rád vár.</p></div>
        <Link href="/admin/esemenyek/uj" className="btn btn-primary">+ Új esemény</Link></div>
      <div className="stats">
        <Link href="/admin/esemenyek" className="stat"><b>{next.length}</b><span>közelgő esemény</span></Link>
        <Link href="/admin/jelentkezesek" className="stat"><b>{persons}</b><span>jelentkezett fő ({regs.length} jelentkezés)</span></Link>
        <Link href="/admin/beszamolok" className="stat"><b>{site.reports.filter((r) => r.published).length}</b><span>közzétett beszámoló</span></Link>
        <Link href="/admin/uzenetek" className="stat"><b>{unread}</b><span>olvasatlan üzenet</span></Link>
      </div>
      <div className="card">
        <h2>Következő események</h2>
        {next.length === 0 ? <div className="empty">Nincs közelgő esemény. <Link href="/admin/esemenyek/uj" className="link">Hozz létre egyet.</Link></div> : (
          <div className="list">{next.slice(0, 5).map((e) => (
            <Link key={e.id} href={`/admin/esemenyek/${e.id}`} className="row" style={{ textDecoration: "none", color: "inherit", gridTemplateColumns: "1fr auto" }}>
              <div><h3>{t(e.title, "hu")} {e.featured && <span className="pill pill-feat">Kiemelt</span>}</h3><div className="meta">{formatRange(e, "hu")}{e.location ? ` · ${e.location}` : ""}{e.registration ? " · jelentkezés nyitva" : ""}</div></div>
              <span className="note">Szerkesztés →</span>
            </Link>))}</div>
        )}
      </div>
      <div className="card">
        <h2>Gyors műveletek</h2>
        <div className="actions">
          <Link href="/admin/tartalom" className="btn btn-outline btn-sm">Nyitókép, tulajdonos, kapcsolat</Link>
          <Link href="/admin/oldalak" className="btn btn-outline btn-sm">Aloldalak szövegei</Link>
          <Link href="/admin/beszamolok" className="btn btn-outline btn-sm">Beszámoló feltöltése</Link>
          <Link href="/admin/kepek" className="btn btn-outline btn-sm">Kép feltöltése</Link>
          {/* API-letöltés, nem lap: sima <a>, hogy a böngésző fájlként mentse. */}
          <a href="/api/admin/backup" className="btn btn-outline btn-sm" download data-backup-download>Mentés letöltése</a>
          <Link href="/" className="btn btn-ghost btn-sm" target="_blank">Oldal megnyitása ↗</Link>
        </div>
        <p className="hint">A mentés egy fájlban tartalmaz mindent: szövegeket, eseményeket, jelentkezéseket és üzeneteket. Automatikus mentés is készül naponta; az utolsó 30 megmarad.</p>
      </div>
    </>
  );
}
