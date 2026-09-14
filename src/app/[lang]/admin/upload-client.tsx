/**
 * A böngészős feltöltők (ImageUpload, ReportUpload) közös része: XMLHttpRequest folyamatjelzéssel, a szerver
 * válaszának értelmezése (a JSON-hibát szó szerint, a nem-JSON 413/504-et érthető mondatként), és az állapotsáv.
 * Csak kliens-komponensek importálják.
 */

export type ApiOk = { ok: true; message: string } & Record<string, unknown>;
export type ApiFail = { ok: false; status: number; error: string };
export type ApiResult = ApiOk | ApiFail;

/** Várt, a felhasználónak szóló hiba — a szövege egy az egyben megjelenik. */
export class UploadError extends Error {}
export const messageOf = (e: unknown) =>
  e instanceof UploadError ? e.message : `Váratlan hiba a böngészőben: ${e instanceof Error ? e.message : String(e)}. Töltsd újra a lapot, és próbáld újra.`;

const HTTP_HINT: Record<number, string> = {
  401: "lejárt a belépés — töltsd újra a lapot",
  403: "a szerver elutasította a kérést",
  408: "a szerver nem kapta meg időben az adatot",
  413: "a kérés túl nagy volt a szervernek",
  429: "túl sok kérés egyszerre",
  502: "a szerver nem érhető el",
  503: "a szerver átmenetileg nem érhető el",
  504: "a szerver nem válaszolt időben",
};

export function parseResponse(status: number, text: string): ApiResult {
  let data: { ok?: boolean; error?: unknown } | null = null;
  try { data = JSON.parse(text); } catch { /* nem JSON: pl. a tárhely saját 413/504-es lapja */ }
  if (status >= 200 && status < 300 && data?.ok) return data as ApiOk;
  if (data && typeof data.error === "string") return { ok: false, status, error: data.error };
  const hint = HTTP_HINT[status] ?? (status === 0 ? "megszakadt a kapcsolat" : "váratlan szerverhiba");
  return { ok: false, status, error: `A feltöltés nem sikerült (HTTP ${status || "—"}: ${hint}). Próbáld újra; ha ismétlődik, szólj a fejlesztőnek.` };
}

/** Hálózati hiba, időtúllépés vagy szerveroldali (5xx) hiba — ezeknél van értelme újrapróbálni. */
export const retryable = (r: ApiFail) => r.status === 0 || r.status === 408 || r.status === 429 || r.status >= 500;

/** POST nyers törzzsel; `onProgress(elküldött, összes)` a feltöltés közben. */
export function sendXhr(url: string, body: Blob, contentType: string, onProgress: (loaded: number, total: number) => void): Promise<ApiResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("content-type", contentType);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded, e.total); };
    xhr.onload = () => resolve(parseResponse(xhr.status, xhr.responseText));
    xhr.onerror = () => resolve({ ok: false, status: 0, error: "Megszakadt a kapcsolat a szerverrel feltöltés közben. Ellenőrizd az internetkapcsolatot, és próbáld újra." });
    xhr.ontimeout = () => resolve({ ok: false, status: 0, error: "A feltöltés túl sokáig tartott, a böngésző megszakította. Próbáld újra." });
    xhr.send(body);
  });
}

export async function postJson(url: string, data: unknown): Promise<ApiResult> {
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    return parseResponse(r.status, await r.text());
  } catch {
    return { ok: false, status: 0, error: "Megszakadt a kapcsolat a szerverrel. Ellenőrizd az internetkapcsolatot, és próbáld újra." };
  }
}

/** Véletlen feltöltés-azonosító (a crypto.getRandomValues nem-HTTPS helyi címen is működik). */
export function newUploadId() {
  const rnd = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(16).padStart(2, "0")).join("");
  return Date.now().toString(36) + rnd;
}

export type UploadStatus =
  | { kind: "idle" }
  | { kind: "work"; label: string; pct: number | null }
  | { kind: "ok"; text: string; id: string }
  | { kind: "err"; text: string };

/** Folyamatjelző feltöltés közben; utána a Flash-sáv stílusú visszajelzés (hiba: role=alert). */
export function UploadStatusView({ status }: { status: UploadStatus }) {
  return (
    <div className="upl-live" aria-live="polite">
      {status.kind === "work" && (
        <div className="upl-progress" data-upload-busy>
          <div className="upl-progress-label"><span>{status.label}</span>{status.pct !== null && <b>{status.pct}%</b>}</div>
          <progress max={100} value={status.pct ?? undefined} data-upload-progress={status.pct ?? ""} aria-label={status.label} />
        </div>
      )}
      {(status.kind === "ok" || status.kind === "err") && (
        <div className={`flash upl-note ${status.kind === "err" ? "flash-err" : "flash-ok"}`} role={status.kind === "err" ? "alert" : "status"}
          data-flash={status.kind} data-upload-status={status.kind} data-upload-id={status.kind === "ok" ? status.id : undefined}>
          <span>{status.text}</span>
        </div>
      )}
    </div>
  );
}
