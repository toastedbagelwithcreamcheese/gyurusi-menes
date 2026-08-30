"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";
import { writeSite, uid, type Event, type News, type Program } from "@/lib/store";

function refresh() { revalidatePath("/", "layout"); }
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const b = (fd: FormData, k: string) => fd.get(k) === "on";

/* ---------- Események ---------- */
export async function saveEvent(fd: FormData) {
  const id = s(fd, "id") || uid();
  const ev: Event = {
    id, title: s(fd, "title"), date: s(fd, "date"), endDate: s(fd, "endDate") || undefined, time: s(fd, "time") || undefined,
    location: s(fd, "location") || undefined, summary: s(fd, "summary"), body: s(fd, "body") || undefined,
    image: s(fd, "image") || undefined, published: b(fd, "published"),
  };
  if (!ev.title || !ev.date) throw new Error("Cím és dátum kötelező.");
  await writeSite((site) => {
    const i = site.events.findIndex((e) => e.id === id);
    if (i >= 0) site.events[i] = ev; else site.events.unshift(ev);
  });
  refresh(); redirect("/admin/esemenyek");
}
export async function deleteEvent(fd: FormData) {
  const id = s(fd, "id");
  await writeSite((site) => { site.events = site.events.filter((e) => e.id !== id); });
  refresh(); redirect("/admin/esemenyek");
}
export async function toggleEvent(fd: FormData) {
  const id = s(fd, "id");
  await writeSite((site) => { const e = site.events.find((x) => x.id === id); if (e) e.published = !e.published; });
  refresh();
}

/* ---------- Hírek ---------- */
export async function saveNews(fd: FormData) {
  const id = s(fd, "id") || uid();
  const n: News = { id, title: s(fd, "title"), date: s(fd, "date"), body: s(fd, "body"), image: s(fd, "image") || undefined, published: b(fd, "published") };
  if (!n.title || !n.date) throw new Error("Cím és dátum kötelező.");
  await writeSite((site) => { const i = site.news.findIndex((e) => e.id === id); if (i >= 0) site.news[i] = n; else site.news.unshift(n); });
  refresh(); redirect("/admin/hirek");
}
export async function deleteNews(fd: FormData) {
  const id = s(fd, "id");
  await writeSite((site) => { site.news = site.news.filter((e) => e.id !== id); });
  refresh(); redirect("/admin/hirek");
}

/* ---------- Programok ---------- */
export async function saveProgram(fd: FormData) {
  const id = s(fd, "id") || uid();
  await writeSite((site) => {
    const i = site.programs.findIndex((e) => e.id === id);
    const p: Program = {
      id, title: s(fd, "title"), summary: s(fd, "summary"), body: s(fd, "body") || undefined, image: s(fd, "image"),
      audience: s(fd, "audience") || undefined, published: b(fd, "published"),
      order: i >= 0 ? site.programs[i].order : site.programs.length,
    };
    if (i >= 0) site.programs[i] = p; else site.programs.push(p);
  });
  refresh(); redirect("/admin/programok");
}
export async function deleteProgram(fd: FormData) {
  const id = s(fd, "id");
  await writeSite((site) => { site.programs = site.programs.filter((e) => e.id !== id); });
  refresh(); redirect("/admin/programok");
}
export async function moveProgram(fd: FormData) {
  const id = s(fd, "id"); const dir = s(fd, "dir") === "up" ? -1 : 1;
  await writeSite((site) => {
    const list = site.programs.sort((a, b) => a.order - b.order);
    const i = list.findIndex((p) => p.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((p, k) => (p.order = k));
  });
  refresh();
}

/* ---------- Szövegek, kapcsolat, hero ---------- */
export async function saveContent(fd: FormData) {
  await writeSite((site) => {
    site.intro = { eyebrow: s(fd, "intro.eyebrow"), title: s(fd, "intro.title"), lead: s(fd, "intro.lead"), body: s(fd, "intro.body") };
    site.hero = { image: s(fd, "hero.image") || site.hero.image, title: s(fd, "hero.title"), subtitle: s(fd, "hero.subtitle") };
    site.contact = {
      name: s(fd, "contact.name"), phone: s(fd, "contact.phone"), email: s(fd, "contact.email"), address: s(fd, "contact.address"),
      facebook: s(fd, "contact.facebook") || undefined, instagram: s(fd, "contact.instagram") || undefined,
      mapUrl: s(fd, "contact.mapUrl") || undefined, note: s(fd, "contact.note") || undefined,
    };
  });
  refresh();
}

/* ---------- Képek ---------- */
export async function uploadImage(fd: FormData) {
  const file = fd.get("file");
  const alt = s(fd, "alt");
  if (!(file instanceof File) || file.size === 0) throw new Error("Nincs fájl.");
  if (file.size > 25 * 1024 * 1024) throw new Error("A fájl túl nagy (max 25 MB).");
  const id = "u-" + uid();
  const buf = Buffer.from(await file.arrayBuffer());
  const out = path.join(process.cwd(), "public/uploads", `${id}.webp`);
  const img = sharp(buf).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true });
  await img.clone().webp({ quality: 78 }).toFile(out);
  const meta = await sharp(out).metadata();
  const tiny = await sharp(out).resize(16).blur(1).webp({ quality: 40 }).toBuffer();
  const { dominant } = await sharp(out).stats();
  await writeSite((site) => {
    site.uploads.unshift({
      id, src: `/uploads/${id}.webp`, width: meta.width ?? 0, height: meta.height ?? 0, alt: alt || file.name,
      blur: `data:image/webp;base64,${tiny.toString("base64")}`, color: `rgb(${dominant.r},${dominant.g},${dominant.b})`,
      uploadedAt: new Date().toISOString(),
    });
  });
  refresh();
}
export async function deleteUpload(fd: FormData) {
  const id = s(fd, "id");
  await writeSite(async (site) => {
    site.uploads = site.uploads.filter((u) => u.id !== id);
    site.gallery = site.gallery.filter((g) => g.image !== id);
    try { await fs.unlink(path.join(process.cwd(), "public/uploads", `${id}.webp`)); } catch {}
  });
  refresh();
}
export async function toggleGallery(fd: FormData) {
  const image = s(fd, "image");
  await writeSite((site) => {
    const i = site.gallery.findIndex((g) => g.image === image);
    if (i >= 0) site.gallery.splice(i, 1);
    else site.gallery.push({ id: uid(), image, order: site.gallery.length, published: true });
    site.gallery.forEach((g, k) => (g.order = k));
  });
  refresh();
}
export async function moveGallery(fd: FormData) {
  const id = s(fd, "id"); const dir = s(fd, "dir") === "up" ? -1 : 1;
  await writeSite((site) => {
    const list = site.gallery.sort((a, b) => a.order - b.order);
    const i = list.findIndex((g) => g.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((g, k) => (g.order = k));
  });
  refresh();
}
export async function setHeroImage(fd: FormData) {
  const image = s(fd, "image");
  await writeSite((site) => { site.hero.image = image; });
  refresh();
}

/* ---------- Üzenetek ---------- */
export async function markRead(fd: FormData) {
  const id = s(fd, "id");
  await writeSite((site) => { const m = site.messages.find((x) => x.id === id); if (m) m.read = !m.read; });
  revalidatePath("/admin/uzenetek");
}
export async function deleteMessage(fd: FormData) {
  const id = s(fd, "id");
  await writeSite((site) => { site.messages = site.messages.filter((x) => x.id !== id); });
  revalidatePath("/admin/uzenetek");
}
