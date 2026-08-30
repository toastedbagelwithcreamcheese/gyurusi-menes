import Link from "next/link";
import { notFound } from "next/navigation";
import { readSite } from "@/lib/store";
import { allImages } from "@/lib/images";
import { ImagePicker } from "../../ImagePicker";
import { saveNews, deleteNews } from "../../actions";

export default async function NewsEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await readSite();
  const n = id === "uj" ? null : site.news.find((e) => e.id === id);
  if (id !== "uj" && !n) notFound();
  return (
    <>
      <div className="adm-head"><div><h1>{n ? "Hír szerkesztése" : "Új hír"}</h1></div></div>
      <form action={saveNews} className="card form">
        <input type="hidden" name="id" value={n?.id ?? ""} />
        <div className="form-row">
          <div className="field" style={{ gridColumn: "span 2" }}><label htmlFor="title">Cím</label><input id="title" name="title" className="input" required defaultValue={n?.title} /></div>
          <div className="field"><label htmlFor="date">Dátum</label><input id="date" name="date" type="date" className="input" required defaultValue={n?.date ?? new Date().toISOString().slice(0, 10)} /></div>
        </div>
        <div className="field"><label htmlFor="body">Szöveg</label><textarea id="body" name="body" className="input" required defaultValue={n?.body} style={{ minHeight: "10rem" }} /><p className="hint">Üres sor = új bekezdés.</p></div>
        <div className="field"><label>Kép</label><ImagePicker name="image" images={allImages(site)} value={n?.image} /></div>
        <label className="check"><input type="checkbox" name="published" defaultChecked={n?.published ?? true} />Közzététel az oldalon</label>
        <div className="actions"><button className="btn btn-primary">Mentés</button><Link href="/admin/hirek" className="btn btn-ghost">Mégse</Link></div>
      </form>
      {n && <form action={deleteNews} className="actions" style={{ marginTop: 16 }}><input type="hidden" name="id" value={n.id} /><button className="btn btn-danger btn-sm">Hír törlése</button></form>}
    </>
  );
}
