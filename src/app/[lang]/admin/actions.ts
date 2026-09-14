"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeSite, uid, isPageKey, type Event, type L } from "@/lib/store";
import * as records from "@/lib/records";
import { deleteFile } from "@/lib/files";

/** Minden nyelvi lap újraépül; az admin lapok is. */
function refresh() { revalidatePath("/", "layout"); revalidatePath("/[lang]", "layout"); }
/** Vissza az admin lapra egy visszajelzéssel (a Flash mutatja). Élesben a dobott hiba szövege nem látszana — ezért nem dobunk. */
function back(path: string, msg: { ok?: string; hiba?: string }): never { redirect(`${path}?${new URLSearchParams(msg as Record<string, string>)}`); }
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
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
  const formPath = s(fd, "id") ? `/admin/esemenyek/${id}` : "/admin/esemenyek/uj";
  if (!ev.title.hu) back(formPath, { hiba: "A magyar cím kötelező." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.date)) back(formPath, { hiba: "Adj meg egy dátumot (év-hónap-nap)." });
  if (ev.endDate && ev.endDate < ev.date) back(formPath, { hiba: "A záró nap nem lehet korábbi a kezdőnapnál." });
  if (!ev.summary.hu) back(formPath, { hiba: "A magyar rövid leírás kötelező — ez jelenik meg a listában." });
  try {
    await writeSite((site) => {
      if (ev.featured) site.events.forEach((e) => { e.featured = false; });
      const i = site.events.findIndex((e) => e.id === id);
      if (i >= 0) site.events[i] = ev; else site.events.unshift(ev);
    });
  } catch (e) { back(formPath, { hiba: `A mentés nem sikerült: ${errMsg(e)}` }); }
  refresh(); back("/admin/esemenyek", { ok: `„${ev.title.hu}” mentve.` });
}
export async function deleteEvent(fd: FormData) {
  const id = s(fd, "id");
  /* Előbb az esemény, utána a jelentkezései: ha a második bukik, a maradék a Jelentkezések lapon „törölt esemény”
     alatt látszik, és a karbantartás 30 nap után törli — fordított sorrendben egy hiba az eseményt hagyná jelentkezők nélkül. */
  try {
    await writeSite((site) => { site.events = site.events.filter((e) => e.id !== id); });
    await records.deleteRegistrationsForEvent(id);
  } catch (e) { back(`/admin/esemenyek/${id}`, { hiba: `A törlés nem sikerült: ${errMsg(e)}` }); }
  refresh(); back("/admin/esemenyek", { ok: "Esemény törölve, a jelentkezéseivel együtt." });
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

/* ---------- Jelentkezések (saját kulcsokon: src/lib/records.ts) ---------- */
export async function deleteRegistration(fd: FormData) {
  const id = s(fd, "id");
  await records.deleteRegistration(id);
  revalidatePath("/[lang]/admin/jelentkezesek", "page"); revalidatePath("/admin/jelentkezesek");
}

/* ---------- Aloldalak ---------- */
export async function savePage(fd: FormData) {
  const key = s(fd, "key");
  if (!isPageKey(key)) back("/admin/oldalak", { hiba: "Ismeretlen aloldal." });
  const title = lf(fd, "title"), lead = lf(fd, "lead");
  if (!title.hu) back(`/admin/oldalak/${key}`, { hiba: "A magyar cím kötelező." });
  if (!lead.hu) back(`/admin/oldalak/${key}`, { hiba: "A magyar bevezető kötelező — ez látszik a csempén." });
  if (!s(fd, "image1")) back(`/admin/oldalak/${key}`, { hiba: "Válassz egy fejlécképet (1. kép)." });
  try {
    await writeSite((site) => {
      const p = site.pages[key];
      p.title = title; p.lead = lead; p.body = lf(fd, "body");
      p.images = [s(fd, "image1"), s(fd, "image2"), s(fd, "image3")].filter(Boolean);
      p.contact = { person: s(fd, "contact.person"), phone: s(fd, "contact.phone"), email: s(fd, "contact.email"), note: lf(fd, "contact.note") };
    });
  } catch (e) { back(`/admin/oldalak/${key}`, { hiba: `A mentés nem sikerült: ${errMsg(e)}` }); }
  refresh(); back("/admin/oldalak", { ok: `„${title.hu}” mentve.` });
}

/* ---------- Szövegek, tulajdonos, kapcsolat, hero ---------- */
export async function saveContent(fd: FormData) {
  if (!s(fd, "hero.title.hu")) back("/admin/tartalom", { hiba: "A magyar főcím kötelező." });
  if (!s(fd, "owner.name")) back("/admin/tartalom", { hiba: "A tulajdonos neve kötelező." });
  if (!s(fd, "contact.phone") || !s(fd, "contact.email")) back("/admin/tartalom", { hiba: "A kapcsolati telefonszám és e-mail kötelező." });
  try { await writeSite((site) => {
    site.hero = { image: s(fd, "hero.image") || site.hero.image, title: lf(fd, "hero.title"), subtitle: lf(fd, "hero.subtitle") };
    site.owner = { name: s(fd, "owner.name"), role: lf(fd, "owner.role"), phone: s(fd, "owner.phone"), email: s(fd, "owner.email"), note: lf(fd, "owner.note"), image: s(fd, "owner.image") || undefined };
    site.intro = { eyebrow: lf(fd, "intro.eyebrow"), title: lf(fd, "intro.title"), lead: lf(fd, "intro.lead"), body: lf(fd, "intro.body") };
    site.contact = {
      person: s(fd, "contact.person"), phone: s(fd, "contact.phone"), email: s(fd, "contact.email"), address: s(fd, "contact.address"),
      facebook: s(fd, "contact.facebook") || undefined, instagram: s(fd, "contact.instagram") || undefined, mapUrl: s(fd, "contact.mapUrl") || undefined, note: lf(fd, "contact.note"),
    };
  }); } catch (e) { back("/admin/tartalom", { hiba: `A mentés nem sikerült: ${errMsg(e)}` }); }
  refresh(); back("/admin/tartalom", { ok: "Főoldal és kapcsolat mentve." });
}
export async function setHeroImage(fd: FormData) {
  const image = s(fd, "image");
  try { await writeSite((site) => { site.hero.image = image; }); } catch (e) { back("/admin/kepek", { hiba: `Nem sikerült beállítani: ${errMsg(e)}` }); }
  refresh(); back("/admin/kepek", { ok: "Nyitókép beállítva." });
}

/* ---------- Képek ----------
   A feltöltés NEM szerver-akció (annak törzse legfeljebb 1 MB): a böngésző kicsinyít (ImageUpload.tsx), a szerver
   a POST /api/admin/upload-image route handlerben dolgozza fel. Itt csak a kis metaadat-műveletek maradtak. */
export async function deleteUpload(fd: FormData) {
  const id = s(fd, "id");
  try { await writeSite(async (site) => { site.uploads = site.uploads.filter((u) => u.id !== id); }); await deleteFile(`${id}.webp`); }
  catch (e) { back("/admin/kepek", { hiba: `A törlés nem sikerült: ${errMsg(e)}` }); }
  refresh(); back("/admin/kepek", { ok: "Kép törölve." });
}

/* ---------- Egyesületi beszámolók (PDF) ----------
   A feltöltés darabolva megy route handlereken (ReportUpload.tsx → /api/admin/upload-chunk, /upload-complete);
   itt a közzététel és a törlés maradt. */
export async function toggleReport(fd: FormData) {
  const id = s(fd, "id");
  await writeSite((site) => { const r = site.reports.find((x) => x.id === id); if (r) r.published = !r.published; });
  refresh();
}
export async function deleteReport(fd: FormData) {
  const id = s(fd, "id"); let key = "";
  try { await writeSite((site) => { key = site.reports.find((r) => r.id === id)?.file ?? ""; site.reports = site.reports.filter((r) => r.id !== id); }); if (key) await deleteFile(key); }
  catch (e) { back("/admin/beszamolok", { hiba: `A törlés nem sikerült: ${errMsg(e)}` }); }
  refresh(); back("/admin/beszamolok", { ok: "Beszámoló törölve." });
}

/* ---------- Jogi oldalak ---------- */
export async function saveLegal(fd: FormData) {
  if (!s(fd, "privacy.hu")) back("/admin/jogi", { hiba: "A magyar adatkezelési szöveg nem lehet üres." });
  try { await writeSite((site) => {
    site.legal = {
      imprint: { operator: s(fd, "imprint.operator"), person: s(fd, "imprint.person"), address: s(fd, "imprint.address"), email: s(fd, "imprint.email"), phone: s(fd, "imprint.phone"), taxId: s(fd, "imprint.taxId"), regNo: s(fd, "imprint.regNo"), hosting: s(fd, "imprint.hosting") },
      privacy: lf(fd, "privacy"),
    };
  }); } catch (e) { back("/admin/jogi", { hiba: `A mentés nem sikerült: ${errMsg(e)}` }); }
  refresh(); back("/admin/jogi", { ok: "Impresszum és adatkezelés mentve." });
}

/* ---------- Üzenetek ---------- */
/** A kívánt állapotot kapja (read=1/0), nem fordít — egy dupla kattintás sem jelöli vissza. */
export async function markRead(fd: FormData) {
  const id = s(fd, "id");
  await records.setMessageRead(id, s(fd, "read") !== "0");
  revalidatePath("/admin/uzenetek");
}
export async function deleteMessage(fd: FormData) {
  const id = s(fd, "id");
  await records.deleteMessage(id);
  revalidatePath("/admin/uzenetek");
}
