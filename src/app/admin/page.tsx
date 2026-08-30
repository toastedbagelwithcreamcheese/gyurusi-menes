import Link from "next/link";
import { readSite, upcoming, formatDate } from "@/lib/store";

export default async function AdminHome() {
  const site = await readSite();
  const next = upcoming(site.events);
  const unread = site.messages.filter((m) => !m.read).length;
  return (
    <>
      <div className="adm-head"><div><h1>Áttekintés</h1><p>Amit a látogatók most látnak, és ami rád vár.</p></div>
        <Link href="/admin/esemenyek/uj" className="btn btn-primary">+ Új esemény</Link></div>
      <div className="stats">
        <Link href="/admin/esemenyek" className="stat"><b>{next.length}</b><span>közelgő esemény</span></Link>
        <Link href="/admin/hirek" className="stat"><b>{site.news.filter((n) => n.published).length}</b><span>megjelent hír</span></Link>
        <Link href="/admin/kepek" className="stat"><b>{site.gallery.length}</b><span>kép a galériában</span></Link>
        <Link href="/admin/uzenetek" className="stat"><b>{unread}</b><span>olvasatlan üzenet</span></Link>
      </div>
      <div className="card">
        <h2>Következő események</h2>
        {next.length === 0 ? <div className="empty">Nincs közelgő esemény. <Link href="/admin/esemenyek/uj" className="link">Hozz létre egyet.</Link></div> : (
          <div className="list">{next.slice(0, 5).map((e) => (
            <Link key={e.id} href={`/admin/esemenyek/${e.id}`} className="row" style={{ textDecoration: "none", color: "inherit", gridTemplateColumns: "1fr auto" }}>
              <div><h3>{e.title}</h3><div className="meta">{formatDate(e.date)}{e.endDate ? ` – ${formatDate(e.endDate)}` : ""}{e.location ? ` · ${e.location}` : ""}</div></div>
              <span className="note">Szerkesztés →</span>
            </Link>))}</div>
        )}
      </div>
      <div className="card">
        <h2>Gyors műveletek</h2>
        <div className="actions">
          <Link href="/admin/hirek/uj" className="btn btn-outline btn-sm">Új hír</Link>
          <Link href="/admin/kepek" className="btn btn-outline btn-sm">Kép feltöltése</Link>
          <Link href="/admin/tartalom" className="btn btn-outline btn-sm">Kapcsolatadatok</Link>
          <Link href="/" className="btn btn-ghost btn-sm" target="_blank">Oldal megnyitása ↗</Link>
        </div>
      </div>
    </>
  );
}
