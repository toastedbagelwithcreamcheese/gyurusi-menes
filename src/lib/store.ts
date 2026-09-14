import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getStore } from "@netlify/blobs";
import seedJson from "../../data/seed.json";
import type { Lang } from "@/content/types";

/**
 * Tartalomtár két driverrel, egy felülettel:
 *   · helyben (next dev, saját gép): data/site.json — olvasható, írható, git-ben követhető;
 *   · Netlify-on: Netlify Blobs „site” tár — a függvények fájlrendszere csak olvasható,
 *     a Blobs viszont a Netlify ingyenes csomag része, nem kell külön adatbázis.
 * Első futáskor a Blobs a beépített site.json-ból kapja a magját. Ha a Blobs valamiért
 * nem elérhető (pl. build-lépés), a beépített tartalom jön — az oldal sosem marad üresen.
 * A jelentkezések és üzenetek rekordonként külön kulcson élnek (records.ts); karbantartás és mentés: maintenance.ts.
 * Relatív importok és csak típus-import az aliasokból: a Netlify-függvény (netlify/functions/) a Next nélkül is betölti.
 */

/** Nyelvesített szöveg. Mindhárom nyelv kötelező; a `t()` a magyarra esik vissza, ha üres. */
export type L = { hu: string; en: string; de: string };
export const t = (l: L | undefined | null, lang: Lang): string => (l ? l[lang] || l.hu : "");
export const emptyL = (): L => ({ hu: "", en: "", de: "" });

export const PAGE_KEYS = ["huculosveny", "turak", "oktatas", "taborok", "egyesulet"] as const;
export type PageKey = (typeof PAGE_KEYS)[number];
export const isPageKey = (v: string): v is PageKey => (PAGE_KEYS as readonly string[]).includes(v);

export type PageContact = { person: string; phone: string; email: string; note: L };
export type Page = { key: PageKey; title: L; lead: L; body: L; images: string[]; contact: PageContact };
export type Event = {
  id: string; title: L; date: string; endDate?: string; time?: string; location?: string;
  summary: L; body?: L; image?: string; published: boolean; featured: boolean; registration: boolean;
  /** Az esemény utolsó mentése (ISO) — az eseménylap sitemap lastmod-ja. */
  updatedAt?: string;
};
/**
 * Túraútvonal a Túrák lapon (az ügyfél útvonal-képeket és útvonalon készült képeket ígért): név, rövid leírás,
 * egy térképkép és legfeljebb 4 fotó — mind képazonosító (kurált fotó vagy feltöltés). Sorrend és közzététel az adminból.
 * A mag üres: útvonalat nem találunk ki; amíg nincs közzétett útvonal, a Túrák lap az illusztrációt mutatja.
 */
export type TrailRoute = { id: string; name: L; summary: L; mapImage?: string; photos: string[]; published: boolean; order: number };
export const ROUTE_PHOTOS_MAX = 4;
export const sortRoutes = (routes: TrailRoute[]) => [...routes].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
export type Registration = { id: string; eventId: string; name: string; phone: string; email?: string; count: number; note?: string; receivedAt: string };
export type Report = { id: string; title: string; year: number; date: string; file: string; size: number; published: boolean };
/** Feltöltött kép. Az `alt` háromnyelvű leírás (a magyar kötelező, a fájlnév sosem az); a régi, egynyelvű tárolt érték olvasáskor alakul át. */
export type Upload = { id: string; src: string; width: number; height: number; alt: L; blur?: string; color?: string; uploadedAt: string };
export type Message = { id: string; name: string; email: string; phone?: string; message: string; page?: string; receivedAt: string; read: boolean };
export type Imprint = { operator: string; person: string; address: string; email: string; phone: string; taxId: string; regNo: string; hosting: string };
export type Legal = { imprint: Imprint; privacy: L };

export type SiteContent = {
  hero: { image: string; title: L; subtitle: L };
  /** A tulajdonos — mindig elöl: a ménessel kapcsolatos ügyek és a lovak adásvétele hozzá tartozik. */
  owner: { name: string; role: L; phone: string; email: string; note: L; image?: string };
  /** Általános kapcsolat (lovaglás, túra, tábor, események) — a kapcsolattartó és a lábléc-űrlap címzettje. */
  contact: { person: string; phone: string; email: string; address: string; facebook?: string; instagram?: string; mapUrl?: string; note: L };
  intro: { eyebrow: L; title: L; lead: L; body: L };
  pages: Record<PageKey, Page>;
  events: Event[];
  routes: TrailRoute[];
  /* A jelentkezések és az üzenetek NEM itt élnek, hanem rekordonként külön kulcson (src/lib/records.ts). */
  reports: Report[];
  uploads: Upload[];
  legal: Legal;
  /** Az utolsó tartalmi mentés ideje (ISO) — a writeSite állítja; a sitemap lastmod-ja ebből jön. A magban nincs. */
  updatedAt?: string;
};

/** A helyi (fájl-driveres) adatkönyvtár: alapból data/. A DATA_DIR a tesztek elszigeteléséhez állítható. */
export const dataDir = () => (process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), "data"));
const siteFile = () => path.join(dataDir(), "site.json");
const KEY = "site";

export function blobsAvailable(): boolean {
  return !!(process.env.NETLIFY_BLOBS_CONTEXT || (globalThis as { netlifyBlobsContext?: unknown }).netlifyBlobsContext
    || (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_TOKEN) || process.env.NETLIFY === "true");
}
const store = () => getStore({ name: "site", consistency: "strong" });

/* ---------- Közös segédek az írásokhoz (a records, a maintenance és a ratelimit is ezeket használja) ---------- */

/** Folyamatszintű egyke. A globalThis-en él, mert a Next útvonal-csomagonként külön példányt fordíthat egy modulból. */
export function processGlobal<T>(name: string, init: () => T): T {
  const g = globalThis as unknown as Record<symbol, T | undefined>;
  const k = Symbol.for(`gyurusi-menes.${name}`);
  return (g[k] ??= init());
}

/** Folyamaton belüli sor névenként: az azonos nevű műveletek egymás után futnak. */
export function withLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const locks = processGlobal("locks", () => new Map<string, Promise<void>>());
  const run = (locks.get(name) ?? Promise.resolve()).then(fn);
  const tail = run.then(() => undefined, () => undefined);
  locks.set(name, tail);
  void tail.then(() => { if (locks.get(name) === tail) locks.delete(name); });
  return run;
}

/**
 * Atomi fájlírás: egyedi ideiglenes név (folyamat + véletlen), majd átnevezés — olvasó sosem lát félkész fájlt,
 * és két író sem írja ugyanazt az ideiglenes fájlt (a régi, közös site.json.tmp név adatot vesztett).
 * `exclusive`: csak akkor ír, ha a cél még nem létezik (kemény link) — ilyenkor `false`, ha már foglalt.
 */
export async function writeFileAtomic(file: string, data: string, opts: { exclusive?: boolean } = {}): Promise<boolean> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmp, data);
  try {
    if (!opts.exclusive) { await fs.rename(tmp, file); return true; }
    try { await fs.link(tmp, file); return true; }
    catch (e) { if ((e as NodeJS.ErrnoException).code === "EEXIST") return false; throw e; }
  } finally {
    await fs.rm(tmp, { force: true });
  }
}

/** Véletlen, növekvő várakozás két ütköző írási kísérlet között — hogy a versenyzők ne ugyanakkor próbálják újra. */
export const retryPause = (attempt: number) => new Promise<void>((r) => setTimeout(r, 10 + Math.random() * Math.min(1200, 40 * 2 ** attempt)));

/** `strict`: íráshoz olvasunk — egy létező, de olvashatatlan fájlt ne írjon felül a mag. */
async function readLocal(strict = false): Promise<SiteContent> {
  const seed = () => structuredClone(seedJson as unknown as SiteContent);
  let raw: string;
  try { raw = await fs.readFile(siteFile(), "utf8"); }
  catch (e) { if (!strict || (e as NodeJS.ErrnoException).code === "ENOENT") return seed(); throw e; }
  try { return withDefaults(JSON.parse(raw) as Partial<SiteContent>); }
  catch (e) { if (strict) throw new Error(`A helyi tartalomfájl nem olvasható (${siteFile()}): ${e instanceof Error ? e.message : e}`); return seed(); }
}

/** Régebbi tárolt tartalom kiegészítése a mag új kulcsaival (pl. `legal`), hogy egy új mező soha ne döntsön el egy lapot. */
function withDefaults(data: Partial<SiteContent>): SiteContent {
  const seed = seedJson as unknown as SiteContent;
  const out = { ...structuredClone(seed), ...data } as SiteContent;
  for (const k of ["events", "routes", "reports", "uploads"] as const) if (!Array.isArray(out[k])) out[k] = [];
  if (!out.legal?.imprint || !out.legal?.privacy) out.legal = structuredClone(seed.legal);
  if (!out.owner) out.owner = structuredClone(seed.owner);
  for (const k of PAGE_KEYS) if (!out.pages?.[k]) out.pages = { ...structuredClone(seed.pages), ...(out.pages ?? {}) };
  out.uploads = out.uploads.map(normalizeUpload);
  migrateLegacyContent(out, seed);
  return out;
}

/** Fájlnévnek látszó leírás („IMG_1234.jpg”) — a korábbi feltöltő üres leírásnál ezt tette alt-szövegnek. */
const FILE_NAME_RE = /^[^\s/\\]+\.(jpe?g|png|webp|heic|heif|gif|avif|tiff?|bmp)$/i;

/** A régi, egynyelvű (sztring) képleírás → háromnyelvű; a fájlnév nem leírás, az üres marad. */
function normalizeUpload(u: Upload): Upload {
  const raw = u.alt as unknown;
  if (raw && typeof raw === "object") {
    const l = raw as Partial<L>;
    return { ...u, alt: { hu: String(l.hu ?? ""), en: String(l.en ?? ""), de: String(l.de ?? "") } };
  }
  const s = typeof raw === "string" ? raw.trim() : "";
  return { ...u, alt: { hu: FILE_NAME_RE.test(s) || s === "kép" ? "" : s, en: "", de: "" } };
}

/* A korábbi magból (2026-08/09) a már feltöltött tárakba (Netlify Blobs, helyi site.json) került, azóta hibásnak talált tartalom.
   Csak a SZÓ SZERINT változatlan régi alapértéket cseréljük: amit az admin átírt, azt nem bántjuk. */
const LEGACY_PRIVACY_SHA256 = "0df2c56f8a8eabac2d6e2ace791ee519fbd5738df186e864ecbcdb64f6babbff";
const LEGACY_EXAMPLE_EVENTS: Record<string, string> = { "oszi-lovastura-2026-09-19": "Őszi lovastúra a Zalai-dombságban", "oszi-szuneti-lovastabor-2026": "Őszi szüneti lovastábor" };
const legacyHash = (l: L) => createHash("sha256").update([l.hu, l.en, l.de].join(String.fromCharCode(0))).digest("hex");

/**
 *  · a régi adatkezelési szöveg valótlant ígért („a jelentkezéseket az esemény után töröljük” — kód nélkül), és hiányzott belőle
 *    az adatkezelő, a jogalap és a NAIH → a változatlan régi szöveg helyére az új, szerkezetes sablon kerül;
 *  · a két kitalált példaesemény (időpont, időtartam, program nem igazolt) → kikerül, ha az azonosítója ÉS a magyar címe is a régi.
 *    A helyi kipróbáláshoz az `npm run db:demo` más azonosítóval teszi vissza őket.
 * Csak olvasáskor hat; a következő mentés tartósan így írja vissza.
 */
function migrateLegacyContent(out: SiteContent, seed: SiteContent) {
  const p = out.legal?.privacy;
  if (p && typeof p.hu === "string" && legacyHash(p) === LEGACY_PRIVACY_SHA256) out.legal = { ...out.legal, privacy: structuredClone(seed.legal.privacy) };
  if (out.events.some((e) => LEGACY_EXAMPLE_EVENTS[e.id] !== undefined && e.title?.hu === LEGACY_EXAMPLE_EVENTS[e.id])) {
    out.events = out.events.filter((e) => !(LEGACY_EXAMPLE_EVENTS[e.id] !== undefined && e.title?.hu === LEGACY_EXAMPLE_EVENTS[e.id]));
  }
}

export async function readSite(): Promise<SiteContent> {
  if (blobsAvailable()) {
    try {
      const data = (await store().get(KEY, { type: "json" })) as Partial<SiteContent> | null;
      if (data) return withDefaults(data);
      const seed = structuredClone(seedJson as unknown as SiteContent);
      /* Csak ha közben senki nem írt bele: egy párhuzamos első mentést a mag nem írhat felül. */
      try { await store().setJSON(KEY, seed, { onlyIfNew: true }); } catch { /* build-lépésben nincs írás — nem baj */ }
      return seed;
    } catch (e) {
      console.warn("[store] Blobs nem elérhető, beépített tartalom:", e instanceof Error ? e.message : e);
      return structuredClone(seedJson as unknown as SiteContent);
    }
  }
  return readLocal();
}

const WRITE_TRIES = 10;

/**
 * A tartalomdokumentum módosítása — ütközésbiztosan, mert admin-mentés, karbantartás és migráció egyszerre is futhat:
 *   · Blobs-on: olvasás ETag-gel, majd feltételes írás (onlyIfMatch; ha még nincs dokumentum, onlyIfNew). Ha közben
 *     más írt, újraolvas és újra alkalmazza a módosítást — legfeljebb 10 kísérlet, véletlen várakozással.
 *   · helyben: folyamaton belüli sor + egyedi ideiglenes fájl + atomi átnevezés.
 * A `mutate` ezért TÖBBSZÖR is lefuthat: csak a kapott dokumentumot módosítsa, mellékhatás nélkül.
 * Minden mentés beírja az `updatedAt`-ot (a sitemap lastmod-ja); a nem tartalmi írás (pl. a régi rekordok áthelyezése) `touch: false`-szal kéri, hogy ne.
 */
export async function writeSite(mutate: (s: SiteContent) => void | Promise<void>, opts: { touch?: boolean } = {}): Promise<SiteContent> {
  const apply = async (site: SiteContent) => { await mutate(site); if (opts.touch !== false) site.updatedAt = new Date().toISOString(); };
  if (blobsAvailable()) return withLock("site", async () => {
    for (let attempt = 0; ; attempt++) {
      const cur = await store().getWithMetadata(KEY, { type: "json" });
      const site = cur?.data ? withDefaults(cur.data as Partial<SiteContent>) : structuredClone(seedJson as unknown as SiteContent);
      await apply(site);
      /* ETag nélkül (csak a helyi Blobs-szimulátor ilyen) nincs mihez feltételt kötni — ott egy folyamat fut, a sor véd. */
      const cond = !cur ? { onlyIfNew: true } : cur.etag ? { onlyIfMatch: cur.etag } : {};
      if ((await store().setJSON(KEY, site, cond)).modified) return site;
      if (attempt + 1 >= WRITE_TRIES) throw new Error("A tartalmat közben más is módosította, és többszöri próbálkozásra sem sikerült menteni. Töltsd újra a lapot, és mentsd újra.");
      await retryPause(attempt);
    }
  });
  return withLock("files", async () => {
    const site = await readLocal(true);
    await apply(site);
    await writeFileAtomic(siteFile(), JSON.stringify(site, null, 2));
    return site;
  });
}

export const uid = () => Math.random().toString(36).slice(2, 10);
const today = (now = new Date()) => now.toISOString().slice(0, 10);

export const isPast = (e: Pick<Event, "date" | "endDate">, now = new Date()) => (e.endDate ?? e.date) < today(now);
export function upcoming(events: Event[], now = new Date()) {
  return events.filter((e) => e.published && !isPast(e, now)).sort((a, b) => a.date.localeCompare(b.date));
}
export function past(events: Event[], now = new Date()) {
  return events.filter((e) => e.published && isPast(e, now)).sort((a, b) => b.date.localeCompare(a.date));
}
/** A kiemelt esemény: ami kiemeltnek van jelölve és még nem múlt el; ha nincs ilyen, a legközelebbi. */
export function featuredEvent(events: Event[], now = new Date()): Event | undefined {
  const up = upcoming(events, now);
  return up.find((e) => e.featured) ?? up[0];
}

const LOCALES: Record<Lang, string> = { hu: "hu-HU", en: "en-GB", de: "de-DE" };
export function formatDate(iso: string, lang: Lang = "hu", opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }) {
  return new Intl.DateTimeFormat(LOCALES[lang], opts).format(new Date(iso + "T12:00:00"));
}
/** „2026. augusztus 22–23.” / „22–23 August 2026” — egy- és többnapos eseményhez. */
export function formatRange(e: Pick<Event, "date" | "endDate">, lang: Lang): string {
  if (!e.endDate || e.endDate === e.date) return formatDate(e.date, lang);
  const sameMonth = e.date.slice(0, 7) === e.endDate.slice(0, 7);
  if (lang === "hu") return sameMonth ? `${formatDate(e.date, lang).replace(/\.$/, "")}–${e.endDate.slice(8).replace(/^0/, "")}.` : `${formatDate(e.date, lang)} – ${formatDate(e.endDate, lang)}`;
  if (sameMonth) return `${e.date.slice(8).replace(/^0/, "")}–${formatDate(e.endDate, lang)}`;
  return `${formatDate(e.date, lang)} – ${formatDate(e.endDate, lang)}`;
}
export function formatDateTime(iso: string, lang: Lang = "hu") {
  return new Intl.DateTimeFormat(LOCALES[lang], { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}
