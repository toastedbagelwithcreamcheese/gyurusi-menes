import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { blobsAvailable, dataDir, processGlobal, readSite, retryPause, withLock, writeFileAtomic, writeSite } from "./store";
import type { Message, Registration, SiteContent } from "./store";

/**
 * Jelentkezések és üzenetek — rekordonként külön kulcson, NEM a tartalomdokumentumban:
 *   · Netlify-on a „site” Blobs-tár registrations/<id> és messages/<id> kulcsai;
 *   · helyben data/registrations/<id>.json és data/messages/<id>.json.
 * Így két egyidejű beküldés sosem írja felül egymást (az egy dokumentumos tárolásnál 20 egyidejű
 * jelentkezésből 3 maradt meg). Új rekord csak szabad kulcsra kerülhet (onlyIfNew / kizárólagos létrehozás),
 * a módosítás feltételes írással megy. Relatív importok, next/* nélkül: a Netlify-függvény is betölti.
 */

type Kind = "registrations" | "messages";
const KINDS: Kind[] = ["registrations", "messages"];
type Rec = { id: string; receivedAt: string };
/** A régi tartalomdokumentum, amelyben még benne lehetnek a beágyazott tömbök. */
type LegacyDoc = SiteContent & { registrations?: unknown; messages?: unknown };

const ID_RE = /^[a-z0-9][a-z0-9-]{3,63}$/;
export const isRecordId = (id: string) => ID_RE.test(id);
/** Időrendbe rendezhető, ütközésmentes azonosító: <ms base36>-<8 hex>. */
const newId = () => `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;

const store = () => getStore({ name: "site", consistency: "strong" });
const blobKey = (kind: Kind, id: string) => `${kind}/${id}`;
const fileOf = (kind: Kind, id: string) => path.join(dataDir(), kind, `${id}.json`);
const notFound = (e: unknown) => (e as NodeJS.ErrnoException)?.code === "ENOENT";

async function eachLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (i < items.length) await fn(items[i++]); }));
}

/** Létrehozás csak szabad kulcsra. `false`, ha a kulcs már foglalt — sosem ír felül meglévő rekordot. */
async function create(kind: Kind, rec: Rec): Promise<boolean> {
  if (!isRecordId(rec.id)) throw new Error(`Érvénytelen azonosító: ${rec.id}`);
  if (blobsAvailable()) return (await store().setJSON(blobKey(kind, rec.id), rec, { onlyIfNew: true })).modified;
  return writeFileAtomic(fileOf(kind, rec.id), JSON.stringify(rec, null, 2), { exclusive: true });
}

/**
 * Minden rekord egy fajtából. Blobs-on a lista csak kulcsot és ETag-et ad, ezért a folyamat megjegyzi a már
 * letöltött rekordokat (ETag szerint), és csak az újakat/változottakat kéri le — egy meleg függvénypéldányban
 * az admin lapjai így nem töltenek le minden betöltéskor minden rekordot.
 */
async function readAll(kind: Kind): Promise<unknown[]> {
  if (blobsAvailable()) {
    const { blobs } = await store().list({ prefix: `${kind}/` });
    const cache = processGlobal(`records.${kind}`, () => new Map<string, { etag: string; value: unknown }>());
    const live = new Set(blobs.map((b) => b.key));
    for (const k of cache.keys()) if (!live.has(k)) cache.delete(k);
    const out: unknown[] = [];
    await eachLimit(blobs, 12, async (b) => {
      const hit = cache.get(b.key);
      if (hit && b.etag && hit.etag === b.etag) { out.push(hit.value); return; }
      const value: unknown = await store().get(b.key, { type: "json" });
      if (value == null) return; // közben törölték
      if (b.etag) cache.set(b.key, { etag: b.etag, value });
      out.push(value);
    });
    return out.map((v) => structuredClone(v));
  }
  const dir = path.join(dataDir(), kind);
  let names: string[];
  try { names = (await fs.readdir(dir)).filter((n) => n.endsWith(".json")); } catch (e) { if (notFound(e)) return []; throw e; }
  const out: unknown[] = [];
  await eachLimit(names, 32, async (n) => {
    try { out.push(JSON.parse(await fs.readFile(path.join(dir, n), "utf8"))); }
    catch (e) { if (!notFound(e)) console.warn(`[records] olvashatatlan fájl kihagyva: ${kind}/${n}`); }
  });
  return out;
}

async function remove(kind: Kind, id: string): Promise<boolean> {
  if (!isRecordId(id)) return false;
  if (blobsAvailable()) { await store().delete(blobKey(kind, id)); return true; }
  return withLock("files", async () => {
    try { await fs.unlink(fileOf(kind, id)); return true; } catch (e) { if (notFound(e)) return false; throw e; }
  });
}

/** Egy rekord módosítása: Blobs-on ETag-feltételes írás újrapróbálással; a közben törölt rekordot nem támasztja fel. */
async function update<T extends Rec>(kind: Kind, id: string, change: (r: T) => T | null): Promise<T | null> {
  if (!isRecordId(id)) return null;
  if (blobsAvailable()) {
    for (let i = 0; ; i++) {
      const cur = await store().getWithMetadata(blobKey(kind, id), { type: "json" });
      if (!cur) return null;
      const next = change(cur.data as T);
      if (!next) return cur.data as T;
      /* ETag nélkül (csak a helyi Blobs-szimulátor ilyen) feltétel nélkül írunk — ott egy folyamat fut. */
      const res = await store().setJSON(blobKey(kind, id), next, cur.etag ? { onlyIfMatch: cur.etag } : {});
      if (res.modified) return next;
      if (i >= 7) throw new Error("A tételt közben más is módosította, és többszöri próbálkozásra sem sikerült menteni. Próbáld újra.");
      await retryPause(i);
    }
  }
  return withLock("files", async () => {
    let cur: T;
    try { cur = JSON.parse(await fs.readFile(fileOf(kind, id), "utf8")) as T; } catch (e) { if (notFound(e)) return null; throw e; }
    const next = change(cur);
    if (!next) return cur;
    await writeFileAtomic(fileOf(kind, id), JSON.stringify(next, null, 2));
    return next;
  });
}

/* ---------- A régi, dokumentumba ágyazott tömbök áthelyezése ---------- */

const asItems = (v: unknown): Partial<Rec>[] => (Array.isArray(v) ? v.filter((x): x is Partial<Rec> => !!x && typeof x === "object") : []);
/** A kulcsot az azonosító adja; ha egy régi tételé nem használható, a tartalmából képzett, mindig ugyanaz az azonosító. */
const legacyId = (r: Partial<Rec>) => (typeof r.id === "string" && isRecordId(r.id) ? r.id : `legacy-${createHash("sha256").update(JSON.stringify(r)).digest("hex").slice(0, 20)}`);

/**
 * A tartalomdokumentum régi `registrations` / `messages` tömbjeinek áthelyezése a saját kulcsaikra.
 * Lusta (a listázás hívja) és idempotens: a már meglévő kulcsot nem írja felül, és a dokumentumból csak az
 * átmásolt tételeket veszi ki — egy félbeszakadt vagy két párhuzamos futás sem duplikál, és semmi nem vész el.
 */
export async function migrateLegacyRecords(): Promise<number> {
  const doc = (await readSite()) as LegacyDoc;
  const legacy = { registrations: asItems(doc.registrations), messages: asItems(doc.messages) };
  if (!legacy.registrations.length && !legacy.messages.length) return 0;
  const moved = { registrations: new Set<string>(), messages: new Set<string>() };
  for (const kind of KINDS) for (const r of legacy[kind]) {
    const id = legacyId(r);
    await create(kind, { ...r, id, receivedAt: typeof r.receivedAt === "string" ? r.receivedAt : new Date().toISOString() });
    moved[kind].add(id);
  }
  await writeSite((s) => {
    const d = s as LegacyDoc;
    for (const kind of KINDS) {
      const rest = asItems(d[kind]).filter((r) => !moved[kind].has(legacyId(r)));
      if (rest.length) d[kind] = rest; else delete d[kind];
    }
  });
  console.log(`[records] áthelyezve a tartalomdokumentumból: ${moved.registrations.size} jelentkezés, ${moved.messages.size} üzenet`);
  return moved.registrations.size + moved.messages.size;
}

async function listKind<T extends Rec>(kind: Kind): Promise<T[]> {
  try { await migrateLegacyRecords(); }
  catch (e) { console.warn("[records] a régi tételek áthelyezése nem sikerült:", e instanceof Error ? e.message : e); }
  const items = (await readAll(kind)).filter((x): x is T => !!x && typeof x === "object" && typeof (x as Rec).id === "string" && typeof (x as Rec).receivedAt === "string");
  return items.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

async function add<T extends Rec>(kind: Kind, fields: Omit<T, "id" | "receivedAt">): Promise<T> {
  for (let i = 0; i < 3; i++) {
    const rec = { ...fields, id: newId(), receivedAt: new Date().toISOString() } as unknown as T;
    if (await create(kind, rec)) return rec;
  }
  throw new Error("Nem sikerült egyedi azonosítót foglalni.");
}

/* ---------- Nyilvános felület ---------- */

export type NewRegistration = Omit<Registration, "id" | "receivedAt">;
export type NewMessage = Omit<Message, "id" | "receivedAt" | "read">;

/** Új jelentkezés a saját kulcsára. Legújabb elöl a listában. */
export const addRegistration = (r: NewRegistration) => add<Registration>("registrations", r);
export const listRegistrations = () => listKind<Registration>("registrations");
export const deleteRegistration = (id: string) => remove("registrations", id);
/** Egy esemény összes jelentkezésének törlése (az esemény törlésekor). A törölt darabszámot adja. */
export async function deleteRegistrationsForEvent(eventId: string): Promise<number> {
  let n = 0;
  for (const r of await listRegistrations()) if (r.eventId === eventId && (await remove("registrations", r.id))) n++;
  return n;
}

export const addMessage = (m: NewMessage) => add<Message>("messages", { ...m, read: false });
export const listMessages = () => listKind<Message>("messages");
/** Olvasott/olvasatlan jelölés — a kívánt állapotot kapja, így a dupla kattintás sem fordítja vissza. */
export const setMessageRead = (id: string, read: boolean) => update<Message>("messages", id, (m) => (m.read === read ? null : { ...m, read }));
export const deleteMessage = (id: string) => remove("messages", id);
