/**
 * Feltöltési korlátok és a hozzájuk tartozó üzenetek — a böngésző (ImageUpload, ReportUpload) és a szerver
 * (/api/admin/upload-*) is innen veszi, hogy az előzetes ellenőrzés és a szerver válasza ugyanazt a számot mondja.
 * Nincs benne Node-import: kliens-komponens is betölti.
 *
 * Miért ezek a számok (Netlify-függvény, docs.netlify.com/build/functions/api, 2026-09):
 *   · a kérés törzse legfeljebb 6 MB, a bináris törzs base64-kódolva utazik (+33%) → egy kérésben ~4,5 MB nyers adat fér el;
 *   · a streamelt válasz legfeljebb 20 MB és 60 s — a /files/<kulcs> ezen át adja ki a PDF-et, ezért a PDF-korlát ez alatt marad.
 * A „MB” mindenhol 1024 × 1024 bájt (a fájlkezelők is így mutatják).
 */
export const MB = 1024 * 1024;

/** A szerver ennél nagyobb képet nem fogad (base64-gyel 5,3 MB — a 6 MB-os kéréskorlát alatt). */
export const IMAGE_MAX_BYTES = 4 * MB;
/** A böngésző ekkorára próbálja tömöríteni a képet feltöltés előtt. */
export const IMAGE_TARGET_BYTES = 1.5 * MB;
/** A böngésző a hosszabb oldalt eddig kicsinyíti. */
export const IMAGE_CLIENT_EDGE = 2400;
/** A szerver ekkorára menti (WebP). */
export const IMAGE_STORED_EDGE = 2000;

/** Egy PDF-darab: base64-gyel 4,67 MB, a kéréskorlát alatt. */
export const CHUNK_BYTES = 3.5 * MB;
/** A 20 MB-os streamelt válaszkorlát alatt, tartalékkal (a fejlécek és az MB/MiB kétértelműség miatt). */
export const PDF_MAX_BYTES = 18 * MB;
export const PDF_MAX_CHUNKS = Math.ceil(PDF_MAX_BYTES / CHUNK_BYTES);
export const PDF_MAGIC = "%PDF-";

const oneDecimal = new Intl.NumberFormat("hu-HU", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const upToOne = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 1 });
/** „25,0 MB” — egy tizedesjeggyel, magyar tizedesvesszővel. */
export const formatMB = (bytes: number) => `${oneDecimal.format(bytes / MB)} MB`;
/** „18 MB”, „3,5 MB” — a korlátokhoz. */
export const limitMB = (bytes: number) => `${upToOne.format(bytes / MB)} MB`;

export const pdfTooLargeMessage = (size: number) =>
  `A PDF túl nagy: ${formatMB(size)} — legfeljebb ${limitMB(PDF_MAX_BYTES)} lehet, mert a tárhely ennél nagyobb fájlt nem tud egyben kiszolgálni. Mentsd el kisebb méretben (például alacsonyabb képminőséggel), vagy oszd két részre, és töltsd fel külön.`;

export const imageTooLargeMessage = (size: number | null) =>
  `A kép túl nagy${size ? `: ${formatMB(size)}` : ""} — a szerver legfeljebb ${limitMB(IMAGE_MAX_BYTES)} méretű képet fogad. Válaszd ki újra a képet ezen a lapon: a feltöltő feltöltés előtt automatikusan kicsinyíti.`;
