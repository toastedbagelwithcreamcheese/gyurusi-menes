import { Thumb } from "../ImagePicker";
import Link from "next/link";
import { readSite } from "@/lib/store";
import { resolveImage } from "@/lib/images";
import { moveProgram } from "../actions";

export default async function ProgramsAdmin() {
  const site = await readSite();
  const items = [...site.programs].sort((a, b) => a.order - b.order);
  return (
    <>
      <div className="adm-head"><div><h1>Programok</h1><p>Amit nálatok csinálni lehet — ez a főoldal „Mit találsz nálunk?” blokkja. A sorrend számít.</p></div>
        <Link href="/admin/programok/uj" className="btn btn-primary">+ Új program</Link></div>
      <div className="list">{items.map((p, i) => { const im = resolveImage(p.image, site); return (
        <div key={p.id} className="row">
          {im ? <Thumb src={im.src} /> : <div className="thumb empty">nincs kép</div>}
          <div><h3>{p.title}</h3><div className="meta">{p.summary}</div></div>
          <div className="ops">
            <form action={moveProgram}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="dir" value="up" /><button className="btn btn-ghost btn-sm" disabled={i === 0} aria-label="Feljebb">↑</button></form>
            <form action={moveProgram}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="dir" value="down" /><button className="btn btn-ghost btn-sm" disabled={i === items.length - 1} aria-label="Lejjebb">↓</button></form>
            <span className={`pill ${p.published ? "pill-on" : "pill-off"}`}>{p.published ? "Látható" : "Rejtett"}</span>
            <Link href={`/admin/programok/${p.id}`} className="btn btn-outline btn-sm">Szerkeszt</Link>
          </div>
        </div>); })}</div>
    </>
  );
}
