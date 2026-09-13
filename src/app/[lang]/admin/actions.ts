"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeSite, uid, isPageKey, type Event, type L } from "@/lib/store";
import { putFile, deleteFile, fileUrl } from "@/lib/files";

/** Minden nyelvi lap újraépül; az admin lapok is. */
function refresh() { revalidatePath("/", "layout"); revalidatePath("/[lang]", "layout"); }
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const b = (fd: FormData, k: string) => fd.get(k) === "on";
const lf = (fd: FormData, k: string): L => ({ hu: s(fd, `${k}.hu`), en: s(fd, `${k}.en`), de: s(fd, `${k}.de`) });

/* ---------- Események ---------- */
export async function saveEvent(fd: FormData) {
  const id = s(fd, "id") || uid();
  const ev: Event = {
    id, title: lf(fd, "title"), date: s(fd, "date"), endDate: s(fd, "endDate") || undefined, time: s(fd, "time") || undefined,
    location: s(fd, "location") || undefined, summary: lf(fd, "summary"), image: s(fd, "image") || undefined,
    published: b(fd, "published"), featured: b(fd, "featured"), registration: b(fd, "registration"),
  };
  const body = lf(fd, "body"); if (body.hu || body.en || body.de) ev.body = body;
  if (!ev.title.hu || !ev.date) throw new Error("Cím (magyar) és dátum kötelező.");
  await writeSite((site) => {
    if (ev.featured) site.events.forEach((e) => { e.featured = false; });
    const i = site.events.findIndex((e) => e.id === id);
    if (i >= 0) site.events[i] = ev; else site.events.unshift(ev);
  });
  refresh(); redirect("/admin/esemenyek");
}
export async function deleteEvent(fd: FormData) {
  const id = s(fd, "id");
  await writeSite((site) => { site.events = site.events.filter((e) => e.id !== id); site.registrations = site.registrations.filter((r) => r.eventId !== id); });
  refresh(); redirect("/admin/esemenyek");
}
export async function toggleEvent(fd: FormData) {
  const id = s(fd, "id");
  await writeSite((site) => { const e = site.events.find((x) => x.id === id); if (e) e.published = !e.published; });
  refresh();
}
export async function setFeatured(fd: FormData) {
  const id = s(fd, "id");
  await writeSite((site) => { site.events.forEach((e) => { e.featured = e.id === id ? !e.featured : false; }); });
  refresh();
}

/* ---------- Jelentkezések ---------- */
export async function deleteRegistration(fd: FormData) {
  const id = s(fd, "id");
  await writeSite((site) => { site.registrations = site.registrations.filter((r) => r.id !== id); });
  revalidatePath("/[lang]/admin/jelentkezesek", "page"); revalidatePath("/admin/jelentkezesek");
}

/* ---------- Aloldalak ---------- */
export async function savePage(fd: FormData) {
  const key = s(fd, "key");
  if (!isPageKey(key)) throw new Error("Ismeretlen aloldal.");
  await writeSite((site) => {
    const p = site.pages[key];
    p.title = lf(fd, "title"); p.lead = lf(fd, "lead"); p.body = lf(fd, "body");
    p.images = [s(fd, "image1"), s(fd, "image2"), s(fd, "image3")].filter(Boolean);
    p.contact = { person: s(fd, "contact.person"), phone: s(fd, "contact.phone"), email: s(fd, "contact.email"), note: lf(fd, "contact.note") };
  });
  refresh(); redirect("/admin/oldalak");
}

/* ---------- Szövegek, tulajdonos, kapcsolat, hero ---------- */
export async function saveContent(fd: FormData) {
  await writeSite((site) => {
    site.hero = { image: s(fd, "hero.image") || site.hero.image, title: lf(fd, "hero.title"), subtitle: lf(fd, "hero.subtitle") };
    site.owner = { name: s(fd, "owner.name"), role: lf(fd, "owner.role"), phone: s(fd, "owner.phone"), email: s(fd, "owner.email"), note: lf(fd, "owner.note"), image: s(fd, "owner.image") || undefined };
    site.intro = { eyebrow: lf(fd, "intro.eyebrow"), title: lf(fd, "intro.title"), lead: lf(fd, "intro.lead"), body: lf(fd, "intro.body") };
    site.contact = {
      person: s(fd, "contact.person"), phone: s(fd, "contact.phone"), email: s(fd, "contact.email"), address: s(fd, "contact.address"),
      facebook: s(fd, "contact.facebook") || undefined, instagram: s(fd, "contact.instagram") || undefined, mapUrl: s(fd, "contact.mapUrl") || undefined, note: lf(fd, "contact.note"),
    };
  });
  refresh();
}
export async function setHeroImage(fd: FormData) {
  const image = s(fd, "image");
  await writeSite((site) => { site.hero.image = image; });
  refresh();
}

/* ---------- Képek (feltöltés → webp → fájltár) ---------- */
export async function uploadImage(fd: FormData) {
  const file = fd.get("file"); const alt = s(fd, "alt");
  if (!(file instanceof File) || file.size === 0) throw new Error("Nincs fájl.");
  if (file.size > 25 * 1024 * 1024) throw new Error("A fájl túl nagy (max 25 MB).");
  const id = "u-" + uid(); const key = `${id}.webp`;
  /* A sharp csak itt, feltöltéskor töltődik be — az admin lapjai ne függjenek a natív modultól. */
  const sharp = (await import("sharp")).default;
  const src = sharp(Buffer.from(await file.arrayBuffer())).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true });
  const webp = await src.clone().webp({ quality: 78 }).toBuffer();
  const meta = await sharp(webp).metadata();
  const tiny = await sharp(webp).resize(16).blur(1).webp({ quality: 40 }).toBuffer();
  const { dominant } = await sharp(webp).stats();
  await putFile(key, webp);
  await writeSite((site) => {
    site.uploads.unshift({ id, src: fileUrl(key), width: meta.width ?? 0, height: meta.height ?? 0, alt: alt || file.name,
      blur: `data:image/webp;base64,${tiny.toString("base64")}`, color: `rgb(${dominant.r},${dominant.g},${dominant.b})`, uploadedAt: new Date().toISOString() });
  });
  refresh();
}
export async function deleteUpload(fd: FormData) {
  const id = s(fd, "id");
  await writeSite(async (site) => { site.uploads = site.uploads.filter((u) => u.id !== id); });
  await deleteFile(`${id}.webp`);
  refresh();
}

/* ---------- Egyesületi beszámolók (PDF) ---------- */
export async function uploadReport(fd: FormData) {
  const file = fd.get("file"); const title = s(fd, "title"); const date = s(fd, "date") || new Date().toISOString().slice(0, 10);
  if (!(file instanceof File) || file.size === 0) throw new Error("Nincs fájl.");
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) throw new Error("Csak PDF tölthető fel.");
  if (file.size > 10 * 1024 * 1024) throw new Error("A fájl túl nagy (max 10 MB).");
  if (!title) throw new Error("Cím kötelező.");
  const id = "r-" + uid(); const key = `${id}.pdf`;
  await putFile(key, Buffer.from(await file.arrayBuffer()));
  await writeSite((site) => { site.reports.unshift({ id, title, year: Number(date.slice(0, 4)), date, file: key, size: file.size, published: b(fd, "published") }); });
  refresh();
}
export async function toggleReport(fd: FormData) {
  const id = s(fd, "id");
  await writeSite((site) => { const r = site.reports.find((x) => x.id === id); if (r) r.published = !r.published; });
  refresh();
}
export async function deleteReport(fd: FormData) {
  const id = s(fd, "id"); let key = "";
  await writeSite((site) => { key = site.reports.find((r) => r.id === id)?.file ?? ""; site.reports = site.reports.filter((r) => r.id !== id); });
  if (key) await deleteFile(key);
  refresh();
}

/* ---------- Jogi oldalak ---------- */
export async function saveLegal(fd: FormData) {
  await writeSite((site) => {
    site.legal = {
      imprint: { operator: s(fd, "imprint.operator"), person: s(fd, "imprint.person"), address: s(fd, "imprint.address"), email: s(fd, "imprint.email"), phone: s(fd, "imprint.phone"), taxId: s(fd, "imprint.taxId"), regNo: s(fd, "imprint.regNo"), hosting: s(fd, "imprint.hosting") },
      privacy: lf(fd, "privacy"),
    };
  });
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
