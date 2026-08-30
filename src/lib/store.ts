import fs from "node:fs/promises";
import path from "node:path";

/**
 * Egyszerű, fájl alapú tartalomtár: data/site.json.
 * Demóhoz és kis oldalhoz elég; nincs adatbázis, nincs séma-migráció.
 * Ha éles hosztingon (pl. Netlify) tartós írás kell, ezt az egy fájlt
 * cseréljük Netlify Blobs-ra vagy Supabase-re — a felület ugyanaz marad.
 */

export type Event = {
  id: string; title: string; date: string; endDate?: string; time?: string;
  location?: string; summary: string; body?: string; image?: string; published: boolean;
};
export type News = { id: string; title: string; date: string; body: string; image?: string; published: boolean };
export type Program = { id: string; title: string; summary: string; body?: string; image: string; audience?: string; order: number; published: boolean };
export type GalleryItem = { id: string; image: string; caption?: string; order: number; published: boolean };
export type Upload = { id: string; src: string; width: number; height: number; alt: string; blur?: string; color?: string; uploadedAt: string };
export type Message = { id: string; name: string; email: string; phone?: string; message: string; receivedAt: string; read: boolean };

export type SiteContent = {
  intro: { eyebrow: string; title: string; lead: string; body: string };
  contact: { name: string; phone: string; email: string; address: string; facebook?: string; instagram?: string; mapUrl?: string; note?: string };
  hero: { image: string; title: string; subtitle: string };
  programs: Program[];
  events: Event[];
  news: News[];
  gallery: GalleryItem[];
  uploads: Upload[];
  messages: Message[];
};

const FILE = path.join(process.cwd(), "data/site.json");

export async function readSite(): Promise<SiteContent> {
  const raw = await fs.readFile(FILE, "utf8");
  return JSON.parse(raw) as SiteContent;
}

export async function writeSite(mutate: (s: SiteContent) => void | Promise<void>): Promise<SiteContent> {
  const site = await readSite();
  await mutate(site);
  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(site, null, 2));
  await fs.rename(tmp, FILE);
  return site;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function upcoming(events: Event[], now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return events.filter((e) => e.published && (e.endDate ?? e.date) >= today).sort((a, b) => a.date.localeCompare(b.date));
}
export function past(events: Event[], now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return events.filter((e) => e.published && (e.endDate ?? e.date) < today).sort((a, b) => b.date.localeCompare(a.date));
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }) {
  return new Intl.DateTimeFormat("hu-HU", opts).format(new Date(iso + "T12:00:00"));
}
