import { readSite, formatDate } from "@/lib/store";
import { fileUrl } from "@/lib/files";
import { uploadReport, toggleReport, deleteReport } from "../actions";

const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default async function ReportsAdmin() {
  const site = await readSite();
  const reports = [...site.reports].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <div className="adm-head"><div><h1>Egyesületi beszámolók</h1><p>PDF-dokumentumok az Egyesület oldalra, évek szerint rendezve. Ez a támogatói és jogi kötelezettségekhez kell.</p></div></div>
      <form action={uploadReport} className="card form" encType="multipart/form-data">
        <h2>Új beszámoló feltöltése</h2>
        <div className="form-row">
          <div className="field"><label htmlFor="file">PDF fájl (max 10 MB)</label><input id="file" name="file" type="file" accept="application/pdf,.pdf" required className="input" /></div>
          <div className="field"><label htmlFor="title">Cím</label><input id="title" name="title" className="input" required placeholder="pl. Éves beszámoló 2025" /></div>
          <div className="field"><label htmlFor="date">Dátum (ebből lesz az év)</label><input id="date" name="date" type="date" className="input" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
        </div>
        <label className="check"><input type="checkbox" name="published" defaultChecked />Közzététel az oldalon</label>
        <div className="actions"><button className="btn btn-primary">Feltöltés</button></div>
      </form>
      <div className="card">
        <h2>Feltöltött beszámolók ({reports.length})</h2>
        {reports.length === 0 ? <div className="empty">Még nincs beszámoló.</div> : (
          <div className="list">{reports.map((r) => (
            <div key={r.id} className="row" data-report-row={r.id}>
              <div className="thumb pdf">PDF</div>
              <div><h3>{r.title}</h3><div className="meta">{r.year} · {formatDate(r.date)} · {fmtSize(r.size)}</div></div>
              <div className="ops">
                <span className={`pill ${r.published ? "pill-on" : "pill-off"}`}>{r.published ? "Közzétéve" : "Rejtett"}</span>
                <a href={fileUrl(r.file)} target="_blank" rel="noopener" className="btn btn-outline btn-sm">Megnyit ↗</a>
                <form action={toggleReport}><input type="hidden" name="id" value={r.id} /><button className="btn btn-ghost btn-sm">{r.published ? "Elrejt" : "Közzétesz"}</button></form>
                <form action={deleteReport}><input type="hidden" name="id" value={r.id} /><button className="btn btn-danger btn-sm">Töröl</button></form>
              </div>
            </div>))}</div>
        )}
      </div>
    </>
  );
}
