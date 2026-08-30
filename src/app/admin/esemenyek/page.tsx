import { Thumb } from "../ImagePicker";
import Link from "next/link";
import { readSite, formatDate } from "@/lib/store";
import { resolveImage } from "@/lib/images";
import { toggleEvent } from "../actions";

export default async function EventsAdmin() {
  const site = await readSite();
  const events = [...site.events].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <div className="adm-head"><div><h1>Események</h1><p>Programnapok, versenyek, bemutatók. Csak a közzétettek látszanak.</p></div>
        <Link href="/admin/esemenyek/uj" className="btn btn-primary">+ Új esemény</Link></div>
      {events.length === 0 ? <div className="empty">Még nincs esemény.</div> : (
        <div className="list">{events.map((e) => { const im = resolveImage(e.image, site); return (
          <div key={e.id} className="row">
            {im ? <Thumb src={im.src} /> : <div className="thumb empty">nincs kép</div>}
            <div><h3>{e.title}</h3><div className="meta">{formatDate(e.date)}{e.endDate ? ` – ${formatDate(e.endDate)}` : ""}{e.location ? ` · ${e.location}` : ""}</div></div>
            <div className="ops">
              <span className={`pill ${e.published ? "pill-on" : "pill-off"}`}>{e.published ? "Közzétéve" : "Rejtett"}</span>
              <form action={toggleEvent}><input type="hidden" name="id" value={e.id} /><button className="btn btn-ghost btn-sm">{e.published ? "Elrejt" : "Közzétesz"}</button></form>
              <Link href={`/admin/esemenyek/${e.id}`} className="btn btn-outline btn-sm">Szerkeszt</Link>
            </div>
          </div>); })}</div>
      )}
    </>
  );
}
