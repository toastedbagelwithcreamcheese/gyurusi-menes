import Link from "next/link";
import { notFound } from "next/navigation";
import { readSite } from "@/lib/store";
import { allImages } from "@/lib/images";
import { ImagePicker } from "../../ImagePicker";
import { saveProgram, deleteProgram } from "../../actions";

export default async function ProgramEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await readSite();
  const p = id === "uj" ? null : site.programs.find((e) => e.id === id);
  if (id !== "uj" && !p) notFound();
  return (
    <>
      <div className="adm-head"><div><h1>{p ? "Program szerkesztése" : "Új program"}</h1></div></div>
      <form action={saveProgram} className="card form">
        <input type="hidden" name="id" value={p?.id ?? ""} />
        <div className="form-row">
          <div className="field" style={{ gridColumn: "span 2" }}><label htmlFor="title">Név</label><input id="title" name="title" className="input" required defaultValue={p?.title} /></div>
          <div className="field"><label htmlFor="audience">Kinek szól</label><input id="audience" name="audience" className="input" defaultValue={p?.audience} placeholder="pl. kezdőknek, családoknak" /></div>
        </div>
        <div className="field"><label htmlFor="summary">Egymondatos leírás</label><input id="summary" name="summary" className="input" required defaultValue={p?.summary} maxLength={160} /></div>
        <div className="field"><label htmlFor="body">Részletek (opcionális)</label><textarea id="body" name="body" className="input" defaultValue={p?.body} /></div>
        <div className="field"><label>Kép (kötelező)</label><ImagePicker name="image" images={allImages(site)} value={p?.image} allowEmpty={false} /></div>
        <label className="check"><input type="checkbox" name="published" defaultChecked={p?.published ?? true} />Látható az oldalon</label>
        <div className="actions"><button className="btn btn-primary">Mentés</button><Link href="/admin/programok" className="btn btn-ghost">Mégse</Link></div>
      </form>
      {p && <form action={deleteProgram} className="actions" style={{ marginTop: 16 }}><input type="hidden" name="id" value={p.id} /><button className="btn btn-danger btn-sm">Program törlése</button></form>}
    </>
  );
}
