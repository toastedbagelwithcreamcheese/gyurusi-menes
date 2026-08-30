import { Thumb } from "../ImagePicker";
import Link from "next/link";
import { readSite, formatDate } from "@/lib/store";
import { resolveImage } from "@/lib/images";

export default async function NewsAdmin() {
  const site = await readSite();
  const items = [...site.news].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <div className="adm-head"><div><h1>Hírek</h1><p>Rövid aktualitások: új csikó, nyitvatartás, beszámoló.</p></div>
        <Link href="/admin/hirek/uj" className="btn btn-primary">+ Új hír</Link></div>
      {items.length === 0 ? <div className="empty">Még nincs hír.</div> : (
        <div className="list">{items.map((n) => { const im = resolveImage(n.image, site); return (
          <div key={n.id} className="row">
            {im ? <Thumb src={im.src} /> : <div className="thumb empty">nincs kép</div>}
            <div><h3>{n.title}</h3><div className="meta">{formatDate(n.date)}</div></div>
            <div className="ops"><span className={`pill ${n.published ? "pill-on" : "pill-off"}`}>{n.published ? "Közzétéve" : "Rejtett"}</span>
              <Link href={`/admin/hirek/${n.id}`} className="btn btn-outline btn-sm">Szerkeszt</Link></div>
          </div>); })}</div>
      )}
    </>
  );
}
