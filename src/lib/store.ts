import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import seedJson from "../../data/seed.json";
import type { Lang } from "@/content/types";
import { DATABASE_MISSING_MESSAGE, databaseMissingOnNetlify, db, eq, supabaseActive } from "./supabase";

/**
 * Tartalomtár két driverrel, egy felülettel:
 *   · Supabase (élesben, és helyben is, ha a SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY be van állítva): a `site_content` tábla
 *     egyetlen sora (id = 'site'), a `version` oszloppal ütközésbiztosan írva — src/lib/supabase.ts, séma: supabase/migrations/;
 *   · helyi fájl (tesztek, beállítás nélküli fejlesztés, vagy STORE_DRIVER=file): data/site.json.
 * Üres adatbázisban az első olvasás a beépített magot (data/seed.json) teszi be. Ha az adatbázis nem elérhető (pl. build-lépés),
 * a beépített tartalom jön — az oldal sosem marad üresen; írni viszont ilyenkor nem lehet, és a hiba megmondja, miért.
 * A jelentkezések és üzenetek soronként saját táblában élnek (records.ts); karbantartás és mentés: maintenance.ts.
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
/** GYIK / tudnivaló: kérdés és válasz háromnyelvűen (a magyar kötelező). */
export type FaqItem = { q: L; a: L };
export const FAQ_MAX = 12;
/** Külső hivatkozás az aloldal szövege alatt (pl. a Huculösvény saját oldala): csak http(s) cím, felirat háromnyelvűen. */
export type PageLink = { url: string; label: L };
export type Page = { key: PageKey; title: L; lead: L; body: L; images: string[]; contact: PageContact; faq?: FaqItem[]; link?: PageLink };
export type Event = {
  id: string; title: L; date: string; endDate?: string; time?: string; location?: string;
  summary: L; body?: L; image?: string; published: boolean; featured: boolean; registration: boolean;
  /** Mely aloldalak „Kapcsolódó események” blokkjában jelenjen meg (közelgőként). */
  pages?: PageKey[];
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
  /* A jelentkezések és az üzenetek NEM itt élnek, hanem soronként saját táblában (src/lib/records.ts). */
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
const seed = () => structuredClone(seedJson as unknown as SiteContent);

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
  let raw: string;
  try { raw = await fs.readFile(siteFile(), "utf8"); }
  catch (e) { if (!strict || (e as NodeJS.ErrnoException).code === "ENOENT") return seed(); throw e; }
  try { return withDefaults(JSON.parse(raw) as Partial<SiteContent>); }
  catch (e) { if (strict) throw new Error(`A helyi tartalomfájl nem olvasható (${siteFile()}): ${e instanceof Error ? e.message : e}`); return seed(); }
}

/** Régebbi tárolt tartalom kiegészítése a mag új kulcsaival (pl. `legal`), hogy egy új mező soha ne döntsön el egy lapot. */
function withDefaults(data: Partial<SiteContent>): SiteContent {
  const base = seedJson as unknown as SiteContent;
  const out = { ...structuredClone(base), ...data } as SiteContent;
  for (const k of ["events", "routes", "reports", "uploads"] as const) if (!Array.isArray(out[k])) out[k] = [];
  if (!out.legal?.imprint || !out.legal?.privacy) out.legal = structuredClone(base.legal);
  if (!out.owner) out.owner = structuredClone(base.owner);
  for (const k of PAGE_KEYS) if (!out.pages?.[k]) out.pages = { ...structuredClone(base.pages), ...(out.pages ?? {}) };
  out.uploads = out.uploads.map(normalizeUpload);
  /* Az aloldalak új, választható mezői: hiányzó vagy hibás érték → üres (a blokk nem jelenik meg). */
  const L0 = (v: unknown): L => { const o = (v && typeof v === "object" ? v : {}) as Partial<L>; return { hu: String(o.hu ?? ""), en: String(o.en ?? ""), de: String(o.de ?? "") }; };
  for (const k of PAGE_KEYS) {
    const p = out.pages[k];
    p.faq = Array.isArray(p.faq) ? p.faq.filter((x) => x && typeof x === "object").map((x) => ({ q: L0(x.q), a: L0(x.a) })).filter((x) => x.q.hu && x.a.hu).slice(0, FAQ_MAX) : [];
    if (p.link && (typeof p.link.url !== "string" || !/^https?:\/\//i.test(p.link.url))) delete p.link;
    else if (p.link) p.link = { url: p.link.url, label: L0(p.link.label) };
  }
  out.events = out.events.map((e) => ({ ...e, pages: Array.isArray(e.pages) ? e.pages.filter((k): k is PageKey => isPageKey(String(k))) : [] }));
  migrateLegacyContent(out, base);
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

/* A korábbi magokból a már feltöltött tárakba (Netlify Blobs → Supabase, helyi site.json) került, azóta elavult tartalom.
   Csak a SZÓ SZERINT változatlan régi alapértéket cseréljük: amit az admin átírt, azt nem bántjuk. */
const LEGACY_PRIVACY_SHA256 = new Set([
  "0df2c56f8a8eabac2d6e2ace791ee519fbd5738df186e864ecbcdb64f6babbff", // 2026-08/09: törlést ígért kód nélkül, adatkezelő és NAIH nélkül
  "61ad810992c7d0105bca38dbbc96348adeba3628b8203c7f70e1276f1f0b6aac", // 2026-09-13/14: a Netlify-t nevezte meg adattárolóként (a Supabase előtt)
]);
const LEGACY_EXAMPLE_EVENTS: Record<string, string> = { "oszi-lovastura-2026-09-19": "Őszi lovastúra a Zalai-dombságban", "oszi-szuneti-lovastabor-2026": "Őszi szüneti lovastábor" };
/* A böngésző a textarea sortöréseit CRLF-ként küldi: az admin-mentésen átment, változatlan szöveg is egyezzen. */
const legacyHash = (l: L) => createHash("sha256").update([l.hu, l.en, l.de].map((s) => String(s ?? "").replace(/\r\n/g, "\n")).join(String.fromCharCode(0))).digest("hex");

/**
 *  · a régi adatkezelési szövegek (a változatlan régi alapérték) → az új, szerkezetes sablon;
 *  · a két kitalált példaesemény (időpont, időtartam, program nem igazolt) → kikerül, ha az azonosítója ÉS a magyar címe is a régi.
 *    A helyi kipróbáláshoz az `npm run db:demo` más azonosítóval teszi vissza őket.
 * Csak olvasáskor hat; a következő mentés tartósan így írja vissza.
 */
function migrateLegacyContent(out: SiteContent, base: SiteContent) {
  const p = out.legal?.privacy;
  if (p && typeof p.hu === "string" && LEGACY_PRIVACY_SHA256.has(legacyHash(p))) out.legal = { ...out.legal, privacy: structuredClone(base.legal.privacy) };
  if (out.events.some((e) => LEGACY_EXAMPLE_EVENTS[e.id] !== undefined && e.title?.hu === LEGACY_EXAMPLE_EVENTS[e.id])) {
    out.events = out.events.filter((e) => !(LEGACY_EXAMPLE_EVENTS[e.id] !== undefined && e.title?.hu === LEGACY_EXAMPLE_EVENTS[e.id]));
  }
}

type SiteRow = { data: Partial<SiteContent>; version: number };

export async function readSite(): Promise<SiteContent> {
  if (supabaseActive()) {
    try {
      const rows = await db.select<SiteRow>("site_content", `id=${eq(KEY)}&select=data`);
      if (rows[0]?.data) return withDefaults(rows[0].data);
      const first = seed();
      /* Csak ha közben senki nem írt bele: egy párhuzamos első mentést a mag nem írhat felül. A build (next build) sosem ír az adatbázisba —
         egy helyi build a .env.local kulcsaival különben az éles, még üres táblába tenné a magot. */
      if (process.env.NEXT_PHASE !== "phase-production-build") {
        try { await db.insertIgnore("site_content", "id", { id: KEY, data: first }); } catch { /* nincs jog vagy tábla — az olvasás a magot adja */ }
      }
      return first;
    } catch (e) {
      console.warn("[store] az adatbázis nem elérhető, beépített tartalom:", e instanceof Error ? e.message : e);
      return seed();
    }
  }
  if (databaseMissingOnNetlify()) { console.warn(`[store] ${DATABASE_MISSING_MESSAGE}`); return seed(); }
  return readLocal();
}

const WRITE_TRIES = 10;

/**
 * A tartalomdokumentum módosítása — ütközésbiztosan, mert admin-mentés, karbantartás és migráció egyszerre is futhat:
 *   · Supabase-en: olvasás a `version`-nel, majd feltételes frissítés (`version = a beolvasott`; ha még nincs sor, beszúrás csak
 *     szabad kulcsra). Ha közben más írt, újraolvas és újra alkalmazza a módosítást — legfeljebb 10 kísérlet, véletlen várakozással.
 *   · helyben: folyamaton belüli sor + egyedi ideiglenes fájl + atomi átnevezés.
 * A `mutate` ezért TÖBBSZÖR is lefuthat: csak a kapott dokumentumot módosítsa, mellékhatás nélkül.
 * Minden mentés beírja az `updatedAt`-ot (a sitemap lastmod-ja); a nem tartalmi írás (pl. a régi rekordok áthelyezése) `touch: false`-szal kéri, hogy ne.
 */
export async function writeSite(mutate: (s: SiteContent) => void | Promise<void>, opts: { touch?: boolean } = {}): Promise<SiteContent> {
  const apply = async (site: SiteContent) => { await mutate(site); if (opts.touch !== false) site.updatedAt = new Date().toISOString(); };
  if (supabaseActive()) return withLock("site", async () => {
    for (let attempt = 0; ; attempt++) {
      const cur = (await db.select<SiteRow>("site_content", `id=${eq(KEY)}&select=data,version`))[0];
      const site = cur?.data ? withDefaults(cur.data) : seed();
      await apply(site);
      const saved = cur
        ? await db.update("site_content", `id=${eq(KEY)}&version=${eq(cur.version)}`, { data: site, version: cur.version + 1, updated_at: new Date().toISOString() })
        : await db.insertIgnore("site_content", "id", { id: KEY, data: site });
      if (saved.length === 1) return site;
      if (attempt + 1 >= WRITE_TRIES) throw new Error("A tartalmat közben más is módosította, és többszöri próbálkozásra sem sikerült menteni. Töltsd újra a lapot, és mentsd újra.");
      await retryPause(attempt);
    }
  });
  if (databaseMissingOnNetlify()) throw new Error(DATABASE_MISSING_MESSAGE);
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
/** Egy aloldalhoz rendelt, közzétett, még el nem múlt események időrendben. */
export function eventsForPage(events: Event[], key: PageKey, now = new Date()) {
  return upcoming(events, now).filter((e) => e.pages?.includes(key));
}
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
