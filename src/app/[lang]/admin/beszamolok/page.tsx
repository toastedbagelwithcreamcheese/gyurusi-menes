import { readSite, formatDate } from "@/lib/store";
import { fileUrl } from "@/lib/files";
import { toggleReport, deleteReport } from "../actions";
import { ReportUpload } from "../ReportUpload";

const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default async function ReportsAdmin() {
  const site = await readSite();
  const reports = [...site.reports].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <div className="adm-head"><div><h1>Egyesületi beszámolók</h1><p>PDF-dokumentumok az Egyesület oldalra, évek szerint rendezve. Ez a támogatói és jogi kötelezettségekhez kell.</p></div></div>
      {/* Darabolt feltöltés route handleren (nem szerver-akció): a méretet a böngésző előre ellenőrzi, közben folyamatjelző. */}
      <ReportUpload defaultDate={new Date().toISOString().slice(0, 10)} />
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
