import Link from "next/link";
import { notFound } from "next/navigation";
import { readSite } from "@/lib/store";
import { allImages } from "@/lib/images";
import { ImagePicker } from "../../ImagePicker";
import { saveEvent, deleteEvent } from "../../actions";

export default async function EventEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await readSite();
  const ev = id === "uj" ? null : site.events.find((e) => e.id === id);
  if (id !== "uj" && !ev) notFound();
  return (
    <>
      <div className="adm-head"><div><h1>{ev ? "Esemény szerkesztése" : "Új esemény"}</h1><p>Cím, dátum, rövid leírás és egy kép — ennyi kell egy eseményhez.</p></div></div>
      <form action={saveEvent} className="card form">
        <input type="hidden" name="id" value={ev?.id ?? ""} />
        <div className="field"><label htmlFor="title">Cím</label><input id="title" name="title" className="input" required defaultValue={ev?.title} placeholder="pl. Hucul Ösvény verseny" /></div>
        <div className="form-row">
          <div className="field"><label htmlFor="date">Dátum</label><input id="date" name="date" type="date" className="input" required defaultValue={ev?.date} /></div>
          <div className="field"><label htmlFor="endDate">Záró nap (ha többnapos)</label><input id="endDate" name="endDate" type="date" className="input" defaultValue={ev?.endDate} /></div>
          <div className="field"><label htmlFor="time">Időpont</label><input id="time" name="time" className="input" defaultValue={ev?.time} placeholder="pl. 10:00-tól" /></div>
        </div>
        <div className="field"><label htmlFor="location">Helyszín</label><input id="location" name="location" className="input" defaultValue={ev?.location} placeholder="Gyűrűsi Ménes, Gyűrűs" /></div>
        <div className="field"><label htmlFor="summary">Rövid leírás (ez jelenik meg a főoldalon)</label><textarea id="summary" name="summary" className="input" required defaultValue={ev?.summary} maxLength={280} /></div>
        <div className="field"><label htmlFor="body">Részletek (opcionális)</label><textarea id="body" name="body" className="input" defaultValue={ev?.body} style={{ minHeight: "12rem" }} /><p className="hint">Üres sor = új bekezdés.</p></div>
        <div className="field"><label>Kép</label><ImagePicker name="image" images={allImages(site)} value={ev?.image} /></div>
        <label className="check"><input type="checkbox" name="published" defaultChecked={ev?.published ?? true} />Közzététel az oldalon</label>
        <div className="actions"><button className="btn btn-primary">Mentés</button><Link href="/admin/esemenyek" className="btn btn-ghost">Mégse</Link></div>
      </form>
      {ev && <form action={deleteEvent} className="actions" style={{ marginTop: 16 }}><input type="hidden" name="id" value={ev.id} /><button className="btn btn-danger btn-sm">Esemény törlése</button></form>}
    </>
  );
}
