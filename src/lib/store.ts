import fs from "node:fs/promises";
import path from "node:path";
import { getStore } from "@netlify/blobs";
import seedJson from "../../data/site.json";
import type { Lang } from "@/content/types";

/**
 * Tartalomtár két driverrel, egy felülettel:
 *   · helyben (next dev, saját gép): data/site.json — olvasható, írható, git-ben követhető;
 *   · Netlify-on: Netlify Blobs „site” tár — a függvények fájlrendszere csak olvasható,
 *     a Blobs viszont a Netlify ingyenes csomag része, nem kell külön adatbázis.
 * Első futáskor a Blobs a beépített site.json-ból kapja a magját. Ha a Blobs valamiért
 * nem elérhető (pl. build-lépés), a beépített tartalom jön — az oldal sosem marad üresen.
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
};
export type Registration = { id: string; eventId: string; name: string; phone: string; email?: string; count: number; note?: string; receivedAt: string };
export type Report = { id: string; title: string; year: number; date: string; file: string; size: number; published: boolean };
export type Upload = { id: string; src: string; width: number; height: number; alt: string; blur?: string; color?: string; uploadedAt: string };
export type Message = { id: string; name: string; email: string; phone?: string; message: string; receivedAt: string; read: boolean };

export type SiteContent = {
  hero: { image: string; title: L; subtitle: L };
  /** A tulajdonos — mindig elöl: a ménessel kapcsolatos ügyek és a lovak adásvétele hozzá tartozik. */
  owner: { name: string; role: L; phone: string; email: string; note: L; image?: string };
  /** Általános kapcsolat (lovaglás, túra, tábor, események) — a kapcsolattartó és a lábléc-űrlap címzettje. */
  contact: { person: string; phone: string; email: string; address: string; facebook?: string; instagram?: string; mapUrl?: string; note: L };
  intro: { eyebrow: L; title: L; lead: L; body: L };
  pages: Record<PageKey, Page>;
  events: Event[];
  registrations: Registration[];
  reports: Report[];
  uploads: Upload[];
  messages: Message[];
};

const FILE = path.join(process.cwd(), "data/site.json");
const KEY = "site";

export function blobsAvailable(): boolean {
  return !!(process.env.NETLIFY_BLOBS_CONTEXT || (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_TOKEN) || process.env.NETLIFY === "true");
}
const store = () => getStore({ name: "site", consistency: "strong" });

async function readLocal(): Promise<SiteContent> {
  try { return JSON.parse(await fs.readFile(FILE, "utf8")) as SiteContent; }
  catch { return structuredClone(seedJson as unknown as SiteContent); }
}

export async function readSite(): Promise<SiteContent> {
  if (blobsAvailable()) {
    try {
      const data = (await store().get(KEY, { type: "json" })) as SiteContent | null;
      if (data) return data;
      const seed = structuredClone(seedJson as unknown as SiteContent);
      try { await store().setJSON(KEY, seed); } catch { /* build-lépésben nincs írás — nem baj */ }
      return seed;
    } catch (e) {
      console.warn("[store] Blobs nem elérhető, beépített tartalom:", e instanceof Error ? e.message : e);
      return structuredClone(seedJson as unknown as SiteContent);
    }
  }
  return readLocal();
}

export async function writeSite(mutate: (s: SiteContent) => void | Promise<void>): Promise<SiteContent> {
  const site = await readSite();
  await mutate(site);
  if (blobsAvailable()) { await store().setJSON(KEY, site); return site; }
  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(site, null, 2));
  await fs.rename(tmp, FILE);
  return site;
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
