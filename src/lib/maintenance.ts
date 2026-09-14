import fs from "node:fs/promises";
import path from "node:path";
import { dataDir, readSite, withLock, writeFileAtomic } from "./store";
import type { Message, Registration, SiteContent } from "./store";
import { deleteMessage, deleteRegistration, listMessages, listRegistrations } from "./records";
import { pruneRateLimits } from "./ratelimit";
import { pruneStaleChunks } from "./chunks";
import { DATABASE_MISSING_MESSAGE, databaseMissingOnNetlify, db, inList, kv, supabaseActive } from "./supabase";

/**
 * Karbantartás — az adatkezelési tájékoztató megőrzési ígéreteinek kódja, és a mentés:
 *   · jelentkezések törlése az esemény vége (endDate || date) után 30 nappal;
 *   · a 365 napnál régebbi üzenetek törlése;
 *   · napi mentés a `backups` táblába (helyben data/backups/) YYYY-MM-DD.json néven — tartalomdokumentum
 *     + minden jelentkezés és üzenet —, az utolsó 30 marad meg;
 *   · lejárt sebességkorlát-bejegyzések törlése;
 *   · a 24 óránál régebben kezdett, félbemaradt darabolt feltöltések (PDF) törlése (chunks.ts).
 * Futás: napi ütemezett Netlify-függvény (netlify/functions/daily-maintenance.mts); alkalmanként az admin
 * Jelentkezések és Üzenetek lapjának betöltése (óránként legfeljebb egyszer); kézzel a POST /api/admin/maintenance.
 * Relatív importok, next/* nélkül: a Netlify-függvény a Next nélkül tölti be.
 */

export const REGISTRATION_RETENTION_DAYS = 30;
export const MESSAGE_RETENTION_DAYS = 365;
export const BACKUPS_KEPT = 30;
export const OPPORTUNISTIC_INTERVAL_MS = 3600_000;

const DAY = 864e5;
const BACKUP_RE = /^\d{4}-\d{2}-\d{2}\.json$/;
const LAST_RUN_KEY = "maintenance/last-run";
const lastRunFile = () => path.join(dataDir(), "maintenance.json");
const backupDir = () => path.join(dataDir(), "backups");

/** Naptári nap Budapesten (YYYY-MM-DD) — az események dátumai is helyi napok. */
export const budapestDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

export type Backup = { format: "gyurusi-menes-backup"; version: 1; createdAt: string; site: SiteContent; registrations: Registration[]; messages: Message[] };
export type MaintenanceReport = {
  at: string; registrationsDeleted: number; messagesDeleted: number;
  backup: { name: string; created: boolean }; backupsDeleted: number; rateLimitsPruned: number; chunkUploadsDeleted: number; ms: number;
};

/** A teljes mentés: tartalomdokumentum + minden jelentkezés és üzenet (a letöltés és a napi mentés is ez). */
export async function buildBackup(now = new Date()): Promise<Backup> {
  const site = await readSite();
  const registrations = await listRegistrations();
  const messages = await listMessages();
  return { format: "gyurusi-menes-backup", version: 1, createdAt: now.toISOString(), site, registrations, messages };
}

/** A tárolt napi mentések neve, legújabb elöl. */
export async function listBackups(): Promise<string[]> {
  let names: string[];
  if (supabaseActive()) names = (await db.select<{ name: string }>("backups", "select=name&order=name.desc&limit=1000")).map((r) => r.name);
  else {
    try { names = await fs.readdir(backupDir()); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return []; throw e; }
  }
  return names.filter((n) => BACKUP_RE.test(n)).sort().reverse();
}

/** A mai mentés — csak ha még nincs: a nap első állapota marad meg (egy délutáni hibás törlés nem írja felül). */
async function writeDailyBackup(now: Date): Promise<{ name: string; created: boolean }> {
  const name = `${budapestDay(now)}.json`;
  if ((await listBackups()).includes(name)) return { name, created: false };
  const data = await buildBackup(now);
  if (supabaseActive()) return { name, created: (await db.insertIgnore("backups", "name", { name, data })).length === 1 };
  return { name, created: await writeFileAtomic(path.join(backupDir(), name), JSON.stringify(data), { exclusive: true }) };
}

async function pruneBackups(): Promise<number> {
  const old = (await listBackups()).slice(BACKUPS_KEPT);
  if (!old.length) return 0;
  if (supabaseActive()) await db.remove("backups", `name=${inList(old)}`, "name");
  else for (const name of old) await fs.rm(path.join(backupDir(), name), { force: true });
  return old.length;
}

type LastRun = { at: string };
async function markRun(now: Date): Promise<void> {
  const value: LastRun = { at: now.toISOString() };
  if (supabaseActive()) { await kv.set(LAST_RUN_KEY, value); return; }
  await withLock("files", () => writeFileAtomic(lastRunFile(), JSON.stringify(value)));
}

/** Az alkalmi futás joga: ha az utolsó futás egy óránál régebbi, feltételes írással lefoglalja — két egyidejű lapbetöltésből csak egy fut. */
async function claimRun(now: Date): Promise<boolean> {
  const due = (v: unknown) => { const at = Date.parse((v as LastRun | null)?.at ?? ""); return !Number.isFinite(at) || now.getTime() - at >= OPPORTUNISTIC_INTERVAL_MS; };
  const value: LastRun = { at: now.toISOString() };
  if (supabaseActive()) {
    const cur = await kv.get<LastRun>(LAST_RUN_KEY);
    if (cur && !due(cur.value)) return false;
    return cur ? kv.update(LAST_RUN_KEY, value, cur.version) : kv.insert(LAST_RUN_KEY, value);
  }
  return withLock("files", async () => {
    let cur: unknown = null;
    try { cur = JSON.parse(await fs.readFile(lastRunFile(), "utf8")); } catch { /* még nem futott */ }
    if (!due(cur)) return false;
    await writeFileAtomic(lastRunFile(), JSON.stringify(value));
    return true;
  });
}

/** Egy teljes karbantartási kör (ütemezett függvény, kézi futtatás). */
export async function runMaintenance(now = new Date(), opts: { claimed?: boolean } = {}): Promise<MaintenanceReport> {
  if (databaseMissingOnNetlify()) throw new Error(DATABASE_MISSING_MESSAGE);
  const t0 = Date.now();
  if (!opts.claimed) await markRun(now);

  const site = await readSite();
  const ends = new Map(site.events.map((e) => [e.id, e.endDate || e.date]));
  const regCutoffDay = budapestDay(new Date(now.getTime() - REGISTRATION_RETENTION_DAYS * DAY));
  const regCutoffIso = new Date(now.getTime() - REGISTRATION_RETENTION_DAYS * DAY).toISOString();
  let registrationsDeleted = 0;
  for (const r of await listRegistrations()) {
    const end = ends.get(r.eventId);
    /* Esemény nélkül (egy törölt esemény maradéka) a beérkezés napjától számolunk. */
    const expired = end ? end < regCutoffDay : r.receivedAt < regCutoffIso;
    if (expired && (await deleteRegistration(r.id))) registrationsDeleted++;
  }

  const msgCutoff = new Date(now.getTime() - MESSAGE_RETENTION_DAYS * DAY).toISOString();
  let messagesDeleted = 0;
  for (const m of await listMessages()) if (m.receivedAt < msgCutoff && (await deleteMessage(m.id))) messagesDeleted++;

  /* A mentés a törlés UTÁN készül: a lejárt adat a mentésekbe se kerüljön vissza. */
  const backup = await writeDailyBackup(now);
  const backupsDeleted = await pruneBackups();
  let rateLimitsPruned = 0;
  try { rateLimitsPruned = await pruneRateLimits(now.getTime()); }
  catch (e) { console.warn("[maintenance] a sebességkorlát-takarítás nem sikerült:", e instanceof Error ? e.message : e); }
  let chunkUploadsDeleted = 0;
  try { chunkUploadsDeleted = await pruneStaleChunks(now); }
  catch (e) { console.warn("[maintenance] a félbemaradt feltöltések takarítása nem sikerült:", e instanceof Error ? e.message : e); }
  return { at: now.toISOString(), registrationsDeleted, messagesDeleted, backup, backupsDeleted, rateLimitsPruned, chunkUploadsDeleted, ms: Date.now() - t0 };
}

/** Alkalmi futás az admin lapjairól: óránként legfeljebb egyszer, és a hibája sosem dönti el a lapot. */
export async function maybeRunMaintenance(now = new Date()): Promise<MaintenanceReport | null> {
  try {
    if (!(await claimRun(now))) return null;
    const report = await runMaintenance(now, { claimed: true });
    console.log("[maintenance] alkalmi futás:", JSON.stringify(report));
    return report;
  } catch (e) {
    console.warn("[maintenance] az alkalmi futás nem sikerült:", e instanceof Error ? e.message : e);
    return null;
  }
}
