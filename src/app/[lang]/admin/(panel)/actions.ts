"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { writeSite, uid, isPageKey, sortRoutes, ROUTE_PHOTOS_MAX, type Event, type L, type TrailRoute } from "@/lib/store";
import * as records from "@/lib/records";
import { deleteFile } from "@/lib/files";
import { LOGIN_PATH, isAdmin } from "@/lib/admin-auth";
import { mailConfigured, mailSender, sendTestMail } from "@/lib/mail";

/**
 * Minden akció első lépése a `guard()`: egy szerver-akció közvetlen POST-tal BÁRMELY lap címére elküldhető (a Next
 * az akció-azonosító alapján futtatja), így az /admin útvonalat védő proxy önmagában nem elég.
 */
async function guard() { if (!(await isAdmin(await headers()))) redirect(LOGIN_PATH); }

/** Minden nyelvi lap újraépül; az admin lapok is. */
function refresh() { revalidatePath("/", "layout"); revalidatePath("/[lang]", "layout"); }
/** Vissza az admin lapra egy visszajelzéssel (a Flash mutatja). Élesben a dobott hiba szövege nem látszana — ezért nem dobunk. */
function back(path: string, msg: { ok?: string; hiba?: string; szakasz?: string }, hash = ""): never { redirect(`${path}?${new URLSearchParams(msg as Record<string, string>)}${hash}`); }
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const b = (fd: FormData, k: string) => fd.get(k) === "on";
const lf = (fd: FormData, k: string): L => ({ hu: s(fd, `${k}.hu`), en: s(fd, `${k}.en`), de: s(fd, `${k}.de`) });

/* ---------- Események ---------- */
export async function saveEvent(fd: FormData) {
  await guard();
  const id = s(fd, "id") || uid();
  const ev: Event = {
    id, title: lf(fd, "title"), date: s(fd, "date"), endDate: s(fd, "endDate") || undefined, time: s(fd, "time") || undefined,
    location: s(fd, "location") || undefined, summary: lf(fd, "summary"), image: s(fd, "image") || undefined,
    published: b(fd, "published"), featured: b(fd, "featured"), registration: b(fd, "registration"),
    updatedAt: new Date().toISOString(), // az eseménylap sitemap lastmod-ja
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
  await guard();
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
  await guard();
  const id = s(fd, "id");
  await writeSite((site) => { const e = site.events.find((x) => x.id === id); if (e) { e.published = !e.published; e.updatedAt = new Date().toISOString(); } });
  refresh();
}
export async function setFeatured(fd: FormData) {
  await guard();
  const id = s(fd, "id");
  await writeSite((site) => { site.events.forEach((e) => { e.featured = e.id === id ? !e.featured : false; }); });
  refresh();
}

/* ---------- Jelentkezések (saját kulcsokon: src/lib/records.ts) ---------- */
export async function deleteRegistration(fd: FormData) {
  await guard();
  const id = s(fd, "id");
  await records.deleteRegistration(id);
  revalidatePath("/[lang]/admin/jelentkezesek", "page"); revalidatePath("/admin/jelentkezesek");
}

/* ---------- Aloldalak ---------- */
export async function savePage(fd: FormData) {
  await guard();
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

/* ---------- Túraútvonalak (a Túrák lap kártyái) ---------- */
/** Képazonosító: kurált fotó (slug) vagy feltöltés (u-…) — más nem kerülhet a dokumentumba. */
const imageId = (v: string) => (/^[a-z0-9][a-z0-9-]{0,80}$/.test(v) ? v : "");

export async function saveRoute(fd: FormData) {
  await guard();
  const isNew = !s(fd, "id");
  const id = s(fd, "id") || uid();
  const formPath = isNew ? "/admin/utvonalak/uj" : `/admin/utvonalak/${id}`;
  const name = lf(fd, "name"), summary = lf(fd, "summary");
  const mapImage = imageId(s(fd, "mapImage"));
  const photos = [...new Set(fd.getAll("photos").map((v) => imageId(String(v).trim())).filter(Boolean))];
  const published = b(fd, "published");
  if (!name.hu) back(formPath, { hiba: "Az útvonal magyar neve kötelező — ez a kártya címe a Túrák lapon." });
  if (photos.length > ROUTE_PHOTOS_MAX) back(formPath, { hiba: `Egy útvonalhoz legfeljebb ${ROUTE_PHOTOS_MAX} fotó tartozhat — most ${photos.length} van kijelölve.` });
  try {
    await writeSite((site) => {
      const i = site.routes.findIndex((r) => r.id === id);
      const order = i >= 0 ? site.routes[i].order : site.routes.reduce((m, r) => Math.max(m, r.order + 1), 0);
      const route: TrailRoute = { id, name, summary, photos, published, order, ...(mapImage ? { mapImage } : {}) };
      if (i >= 0) site.routes[i] = route; else site.routes.push(route);
    });
  } catch (e) { back(formPath, { hiba: `A mentés nem sikerült: ${errMsg(e)}` }); }
  refresh(); back("/admin/utvonalak", { ok: `„${name.hu}” mentve.${published ? "" : " Rejtett — a Túrák lapon nem látszik, amíg közzé nem teszed."}` });
}
export async function toggleRoute(fd: FormData) {
  await guard();
  const id = s(fd, "id");
  await writeSite((site) => { const r = site.routes.find((x) => x.id === id); if (r) r.published = !r.published; });
  refresh();
}
/** Egy hellyel feljebb / lejjebb; utána a sorrend 0-tól folytonos. */
export async function moveRoute(fd: FormData) {
  await guard();
  const id = s(fd, "id"), dir = s(fd, "dir") === "up" ? -1 : 1;
  await writeSite((site) => {
    const list = sortRoutes(site.routes); // ugyanazok az objektumok, csak rendezve
    const i = list.findIndex((r) => r.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((r, n) => { r.order = n; });
  });
  refresh();
}
export async function deleteRoute(fd: FormData) {
  await guard();
  const id = s(fd, "id");
  try { await writeSite((site) => { site.routes = site.routes.filter((r) => r.id !== id); }); }
  catch (e) { back(`/admin/utvonalak/${id}`, { hiba: `A törlés nem sikerült: ${errMsg(e)}` }); }
  refresh(); back("/admin/utvonalak", { ok: "Útvonal törölve. A képei megmaradtak a Képek között." });
}

/* ---------- Főoldal és kapcsolat: szekciónként külön mentés (Nyitókép · Tulajdonos · Bemutatkozás · Kapcsolat) ----------
   Mindegyik akció CSAK a saját részét írja a dokumentumba; a visszajelzés a Flash-sávban és a mentett rész gombja mellett. */
const CONTENT = "/admin/tartalom";
const toSection = (szakasz: string, msg: { ok?: string; hiba?: string }): never => back(CONTENT, { ...msg, szakasz }, `#${szakasz}`);

export async function saveHero(fd: FormData) {
  await guard();
  if (!s(fd, "hero.title.hu")) toSection("nyitokep", { hiba: "A magyar főcím kötelező." });
  try { await writeSite((site) => { site.hero = { image: s(fd, "hero.image") || site.hero.image, title: lf(fd, "hero.title"), subtitle: lf(fd, "hero.subtitle") }; }); }
  catch (e) { toSection("nyitokep", { hiba: `A nyitókép mentése nem sikerült: ${errMsg(e)}` }); }
  refresh(); toSection("nyitokep", { ok: "Nyitókép és főcím mentve." });
}
export async function saveOwner(fd: FormData) {
  await guard();
  if (!s(fd, "owner.name")) toSection("tulajdonos", { hiba: "A tulajdonos neve kötelező." });
  try { await writeSite((site) => {
    site.owner = { name: s(fd, "owner.name"), role: lf(fd, "owner.role"), phone: s(fd, "owner.phone"), email: s(fd, "owner.email"), note: lf(fd, "owner.note"), image: s(fd, "owner.image") || undefined };
  }); } catch (e) { toSection("tulajdonos", { hiba: `A tulajdonos adatainak mentése nem sikerült: ${errMsg(e)}` }); }
  refresh(); toSection("tulajdonos", { ok: "A tulajdonos adatai mentve." });
}
export async function saveIntro(fd: FormData) {
  await guard();
  try { await writeSite((site) => {
    site.intro = { eyebrow: lf(fd, "intro.eyebrow"), title: lf(fd, "intro.title"), lead: lf(fd, "intro.lead"), body: lf(fd, "intro.body") };
  }); } catch (e) { toSection("bemutatkozas", { hiba: `A bemutatkozás mentése nem sikerült: ${errMsg(e)}` }); }
  refresh(); toSection("bemutatkozas", { ok: "Bemutatkozás mentve." });
}
export async function saveContact(fd: FormData) {
  await guard();
  if (!s(fd, "contact.phone") || !s(fd, "contact.email")) toSection("kapcsolat", { hiba: "A kapcsolati telefonszám és e-mail kötelező." });
  try { await writeSite((site) => {
    site.contact = {
      person: s(fd, "contact.person"), phone: s(fd, "contact.phone"), email: s(fd, "contact.email"), address: s(fd, "contact.address"),
      facebook: s(fd, "contact.facebook") || undefined, instagram: s(fd, "contact.instagram") || undefined, mapUrl: s(fd, "contact.mapUrl") || undefined, note: lf(fd, "contact.note"),
    };
  }); } catch (e) { toSection("kapcsolat", { hiba: `A kapcsolati adatok mentése nem sikerült: ${errMsg(e)}` }); }
  refresh(); toSection("kapcsolat", { ok: "Kapcsolati adatok mentve." });
}
export async function setHeroImage(fd: FormData) {
  await guard();
  const image = s(fd, "image");
  try { await writeSite((site) => { site.hero.image = image; }); } catch (e) { back("/admin/kepek", { hiba: `Nem sikerült beállítani: ${errMsg(e)}` }); }
  refresh(); back("/admin/kepek", { ok: "Nyitókép beállítva." });
}

/* ---------- Képek ----------
   A feltöltés NEM szerver-akció (annak törzse legfeljebb 1 MB): a böngésző kicsinyít (ImageUpload.tsx), a szerver
   a POST /api/admin/upload-image route handlerben dolgozza fel. Itt csak a kis metaadat-műveletek maradtak. */
export async function deleteUpload(fd: FormData) {
  await guard();
  const id = s(fd, "id");
  try { await writeSite(async (site) => { site.uploads = site.uploads.filter((u) => u.id !== id); }); await deleteFile(`${id}.webp`); }
  catch (e) { back("/admin/kepek", { hiba: `A törlés nem sikerült: ${errMsg(e)}` }); }
  refresh(); back("/admin/kepek", { ok: "Kép törölve." });
}
/** Egy feltöltött kép háromnyelvű leírása (alt). A magyar kötelező; a fájlnév nem lehet leírás. */
export async function saveUploadAlt(fd: FormData) {
  await guard();
  const id = s(fd, "id"), alt = lf(fd, "alt");
  const at = `#kep-${id}`;
  if (!alt.hu) back("/admin/kepek", { hiba: "A kép magyar leírása kötelező — ezt olvassa fel a képernyőolvasó, és ezt látják a keresők." }, at);
  let found = false;
  try { await writeSite((site) => { const u = site.uploads.find((x) => x.id === id); found = !!u; if (u) u.alt = alt; }); }
  catch (e) { back("/admin/kepek", { hiba: `A leírás mentése nem sikerült: ${errMsg(e)}` }, at); }
  if (!found) back("/admin/kepek", { hiba: "Ez a kép már nincs meg (közben törölték?). Töltsd újra a lapot." });
  refresh(); back("/admin/kepek", { ok: `„${alt.hu}” leírás mentve.` }, at);
}

/* ---------- Egyesületi beszámolók (PDF) ----------
   A feltöltés darabolva megy route handlereken (ReportUpload.tsx → /api/admin/upload-chunk, /upload-complete);
   itt a közzététel és a törlés maradt. */
export async function toggleReport(fd: FormData) {
  await guard();
  const id = s(fd, "id");
  await writeSite((site) => { const r = site.reports.find((x) => x.id === id); if (r) r.published = !r.published; });
  refresh();
}
export async function deleteReport(fd: FormData) {
  await guard();
  const id = s(fd, "id"); let key = "";
  try { await writeSite((site) => { key = site.reports.find((r) => r.id === id)?.file ?? ""; site.reports = site.reports.filter((r) => r.id !== id); }); if (key) await deleteFile(key); }
  catch (e) { back("/admin/beszamolok", { hiba: `A törlés nem sikerült: ${errMsg(e)}` }); }
  refresh(); back("/admin/beszamolok", { ok: "Beszámoló törölve." });
}

/* ---------- Jogi oldalak ---------- */
export async function saveLegal(fd: FormData) {
  await guard();
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
  await guard();
  const id = s(fd, "id");
  await records.setMessageRead(id, s(fd, "read") !== "0");
  revalidatePath("/admin/uzenetek");
}
export async function deleteMessage(fd: FormData) {
  await guard();
  const id = s(fd, "id");
  await records.deleteMessage(id);
  revalidatePath("/admin/uzenetek");
}

/* ---------- Állapotpanel: próba e-mail (a mail.ts meglévő küldőjével, a valódi címzettnek) ---------- */
export async function sendTestEmail() {
  await guard();
  const r = await sendTestMail();
  if (r.sent) back("/admin", { ok: `Próba e-mail elküldve ide: ${r.to}. Nézd meg a postafiókot (a levélszemét mappát is).` });
  if (!mailConfigured()) back("/admin", { hiba: "nincs beállítva a RESEND_API_KEY környezeti változó, ezért az oldal egyáltalán nem küld e-mailt. Állítsd be a Resend-fiókban létrehozott kulccsal (Netlify: Site configuration → Environment variables), deployold újra az oldalt, és próbáld újra." });
  back("/admin", { hiba: `a Resend nem küldte el a levelet (${r.reason}). Ellenőrizd a kulcsot, és hogy a feladó (${mailSender()}) domainje hitelesítve van-e a Resendben.` });
}
