"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CHUNK_BYTES, PDF_MAGIC, PDF_MAX_BYTES, formatMB, limitMB, pdfTooLargeMessage } from "@/lib/upload-limits";
import { UploadError, UploadStatusView, messageOf, newUploadId, postJson, retryable, sendXhr, type UploadStatus } from "./upload-client";

/**
 * Beszámoló (PDF) feltöltése darabokban: a böngésző előbb ellenőrzi a fájlt (PDF-e, belefér-e a korlátba — pontos
 * üzenet MB-ban, kérés nélkül), majd 3,5 MB-os darabokban küldi (POST /api/admin/upload-chunk), darabonként egy
 * újrapróbálással, végül a szerver összefűzi és elmenti (POST /api/admin/upload-complete). Közben folyamatjelző.
 */
export function ReportUpload({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<UploadStatus>({ kind: "idle" });
  const busy = status.kind === "work";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file");
    const title = String(fd.get("title") ?? "").trim();
    const date = String(fd.get("date") ?? "") || defaultDate;
    const published = fd.get("published") === "on";
    try {
      if (!(file instanceof File) || file.size === 0) throw new UploadError("Nem választottál fájlt. Kattints a „Fájl kiválasztása” gombra, és válaszd ki a PDF-et.");
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) throw new UploadError(`Csak PDF tölthető fel — ez ${file.type || "más típusú"} fájl (${file.name}).`);
      if (file.size > PDF_MAX_BYTES) throw new UploadError(pdfTooLargeMessage(file.size));
      if ((await file.slice(0, 5).text()) !== PDF_MAGIC) throw new UploadError(`Csak PDF tölthető fel — a(z) ${file.name} tartalma nem PDF-dokumentum (lehet, hogy csak a neve végződik .pdf-re).`);
      if (!title) throw new UploadError("Adj címet a beszámolónak (pl. „Éves beszámoló 2025”).");

      const uploadId = newUploadId();
      const total = Math.ceil(file.size / CHUNK_BYTES);
      let sent = 0;
      for (let i = 0; i < total; i++) {
        const part = file.slice(i * CHUNK_BYTES, Math.min(file.size, (i + 1) * CHUNK_BYTES));
        const url = `/api/admin/upload-chunk?${new URLSearchParams({ uploadId, index: String(i), total: String(total), size: String(file.size), name: file.name })}`;
        const show = (loaded: number, note = "") => setStatus({
          kind: "work", pct: Math.min(99, Math.floor(((sent + loaded) / file.size) * 100)),
          label: `${note}Feltöltés: ${formatMB(Math.min(file.size, sent + loaded))} / ${formatMB(file.size)}${total > 1 ? ` · ${i + 1}/${total}. darab` : ""}`,
        });
        show(0);
        let res = await sendXhr(url, part, "application/octet-stream", (loaded) => show(loaded));
        if (!res.ok && retryable(res)) {
          show(0, `A(z) ${i + 1}. darab nem ment át, újrapróbálom… `);
          res = await sendXhr(url, part, "application/octet-stream", (loaded) => show(loaded, "Újrapróbálás — "));
        }
        if (!res.ok) throw new UploadError(res.error);
        sent += part.size;
      }
      setStatus({ kind: "work", label: `A darabok összefűzése és mentése (${formatMB(file.size)})…`, pct: 100 });
      const fin = await postJson("/api/admin/upload-complete", { uploadId, total, size: file.size, name: file.name, title, date, published });
      if (!fin.ok) throw new UploadError(fin.error);
      setStatus({ kind: "ok", text: fin.message, id: String((fin.report as { id?: string } | undefined)?.id ?? "") });
      form.reset();
      router.refresh();
    } catch (err) {
      setStatus({ kind: "err", text: messageOf(err) });
    }
  }

  return (
    <form className="card form" onSubmit={onSubmit} noValidate data-report-upload>
      <h2>Új beszámoló feltöltése</h2>
      <div className="form-row">
        <div className="field"><label htmlFor="file">PDF fájl (legfeljebb {limitMB(PDF_MAX_BYTES)})</label><input id="file" name="file" type="file" accept="application/pdf,.pdf" required className="input" disabled={busy} /></div>
        <div className="field"><label htmlFor="title">Cím</label><input id="title" name="title" className="input" required placeholder="pl. Éves beszámoló 2025" disabled={busy} /></div>
        <div className="field"><label htmlFor="date">Dátum (ebből lesz az év)</label><input id="date" name="date" type="date" className="input" defaultValue={defaultDate} disabled={busy} /></div>
      </div>
      <label className="check"><input type="checkbox" name="published" defaultChecked disabled={busy} />Közzététel az oldalon</label>
      <div className="actions">
        <button className="btn btn-primary" disabled={busy}>{busy ? "Feltöltés folyamatban…" : "Feltöltés"}</button>
        <span className="hint">Nagyobb fájl darabokban megy fel — közben látod, hol tart.</span>
      </div>
      <UploadStatusView status={status} />
    </form>
  );
}
