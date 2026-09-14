import fs from "node:fs/promises";
import path from "node:path";
import { kv, supabaseActive } from "./supabase";
import type { Lang } from "@/content/types";

/**
 * Google-értékelések a cégprofilból (Places API New) — a Google szabályai szerint ÉLŐBEN, tárolás nélkül
 * (docs/review-2026-09-13/r9-google-policy.md): a vélemény, az értékelés és más Places-tartalom nem tárolható,
 * csak a hely azonosítója (place ID). Ezért:
 *   · a főoldal HTML-je nem tartalmaz Google-adatot, csak egy üres vázat — azt is csak GOOGLE_PLACES_KEY mellett;
 *   · a böngésző a blokk közelében kéri a GET /api/reviews-t, ami minden kérésre élőben kérdez (no-store: se adatbázis, se ISR, se CDN);
 *   · tárolt csak a place ID (GOOGLE_PLACE_ID, ha nincs: egyszeri szöveges keresés) és egy napi hívásszámláló —
 *     GOOGLE_REVIEWS_DAILY_CAP (alap 30) betöltés után aznap nincs több Google-hívás, a blokk eltűnik.
 * Tár: a Supabase `kv` táblája (google/place-id, google/daily-calls), helyben data/google/. A Places címe GOOGLE_PLACES_API_BASE-szel
 * felülírható (scripts/mock-places.mjs).
 */
export type ReviewAuthor = { name: string; url?: string; photo?: string };
/** `original`: csak ha a Google lefordította a véleményt — ilyenkor az eredeti szöveg is megnézhető. */
export type GoogleReview = { author: ReviewAuthor; rating: number; text: string; original?: string; relative: string; time: string };
export type GoogleReviews = { rating: number; count: number; url: string; reviews: GoogleReview[] };
export type ReviewsResult = { ok: true; data: GoogleReviews } | { ok: false; status: 404 | 429 | 502; reason: string };

const QUERY = "Gyűrűsi Ménes, 8932 Gyűrűs, Petőfi Sándor u. 2.";
const FIELDS = "rating,userRatingCount,googleMapsUri,reviews";
const DEFAULT_CAP = 30;
const TIMEOUT_MS = 6000;
/* Helyi fájlnév (data/google/<név>.json) és a kv-kulcs. */
const PLACE_KEY = "place-id";
const COUNTER_KEY = "daily-calls";
const KV_PLACE = `google/${PLACE_KEY}`;
const KV_COUNTER = `google/${COUNTER_KEY}`;
const DIR = path.join(process.cwd(), "data/google");

export const reviewsEnabled = () => !!process.env.GOOGLE_PLACES_KEY?.trim();
const apiBase = () => (process.env.GOOGLE_PLACES_API_BASE?.trim() || "https://places.googleapis.com").replace(/\/+$/, "");
function dailyCap(): number {
  const n = Number.parseInt(process.env.GOOGLE_REVIEWS_DAILY_CAP ?? "", 10);
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_CAP;
}
/** A „nap" a ménes naptári napja (Europe/Budapest): éjfélkor nullázódik a keret. */
const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest" }).format(new Date());

/* ---------------- a kis állapottár: place ID + napi számláló ---------------- */
let localQueue: Promise<unknown> = Promise.resolve();
/** Helyben egy folyamat fut: az írásokat sorba állítjuk, hogy két egyidejű kérés ne ugyanazt a helyet foglalja le. */
function serial<T>(fn: () => Promise<T>): Promise<T> { const p = localQueue.then(fn, fn); localQueue = p.catch(() => undefined); return p; }
async function readLocal<T>(key: string): Promise<T | null> {
  try { return JSON.parse(await fs.readFile(path.join(DIR, `${key}.json`), "utf8")) as T; } catch { return null; }
}
async function writeLocal(key: string, value: unknown): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
  const file = path.join(DIR, `${key}.json`);
  await fs.writeFile(file + ".tmp", JSON.stringify(value));
  await fs.rename(file + ".tmp", file);
}

type Counter = { day: string; count: number };

/** Lefoglal egy betöltést a napi keretből. `false`: a keret elfogyott — ilyenkor nincs Google-hívás. */
async function reserveCall(cap: number): Promise<boolean> {
  const day = today();
  if (supabaseActive()) {
    for (let i = 0; i < 8; i++) {
      const cur = await kv.get<Counter>(KV_COUNTER);
      const count = cur?.value?.day === day ? cur.value.count : 0;
      if (count >= cap) return false;
      const next: Counter = { day, count: count + 1 };
      /* Feltételes írás: ha közben más kérés is írt, újraolvasunk — így egyidejű betöltéseknél sem lépjük túl a keretet. */
      if (cur ? await kv.update(KV_COUNTER, next, cur.version) : await kv.insert(KV_COUNTER, next)) return true;
    }
    return false; // nyolcszor ütköztünk: inkább kimarad egy betöltés, mint hogy a keret fölé menjünk
  }
  return serial(async () => {
    const cur = await readLocal<Counter>(COUNTER_KEY);
    const count = cur?.day === day ? cur.count : 0;
    if (count >= cap) return false;
    await writeLocal(COUNTER_KEY, { day, count: count + 1 } satisfies Counter);
    return true;
  });
}

/** A hely azonosítója: GOOGLE_PLACE_ID, a tárolt érték, vagy egyszeri szöveges keresés (az eredményt eltesszük). */
async function placeId(key: string): Promise<string | null> {
  const fromEnv = process.env.GOOGLE_PLACE_ID?.trim();
  if (fromEnv) return fromEnv;
  const saved = supabaseActive()
    ? (await kv.get<{ id?: string }>(KV_PLACE))?.value ?? null
    : await readLocal<{ id?: string }>(PLACE_KEY);
  if (saved?.id) return saved.id;
  const res = await fetch(`${apiBase()}/v1/places:searchText`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id" },
    body: JSON.stringify({ textQuery: QUERY, languageCode: "hu" }), cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) { console.warn("[reviews] hely-keresés:", res.status); return null; }
  const id = ((await res.json()) as { places?: { id?: string }[] }).places?.[0]?.id ?? null;
  /* A place ID a szabály szerint korlátlanul tárolható — a Places válaszaiból egyedül ezt tesszük el. */
  if (id) {
    const value = { id, savedAt: new Date().toISOString() };
    if (supabaseActive()) await kv.set(KV_PLACE, value); else await writeLocal(PLACE_KEY, value);
  }
  return id;
}

type PlaceText = { text?: string; languageCode?: string };
type PlaceReview = {
  rating?: number; text?: PlaceText; originalText?: PlaceText; relativePublishTimeDescription?: string; publishTime?: string;
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
};
type Place = { rating?: number; userRatingCount?: number; googleMapsUri?: string; reviews?: PlaceReview[] };

/** Csak http(s) cím mehet linkbe vagy képforrásba (egy váratlan `javascript:` érték se jusson a DOM-ba). */
const httpUrl = (u?: string) => (u && /^https?:\/\//i.test(u) ? u : undefined);

function toReviews(p: Place): GoogleReviews {
  return {
    rating: typeof p.rating === "number" ? p.rating : 0,
    count: p.userRatingCount ?? 0,
    url: httpUrl(p.googleMapsUri) ?? "",
    reviews: (p.reviews ?? []).map((r): GoogleReview => {
      const shown = r.text?.text?.trim() || r.originalText?.text?.trim() || "";
      const orig = r.originalText?.text?.trim() || "";
      const translated = !!(orig && orig !== shown && r.text?.languageCode && r.originalText?.languageCode && r.text.languageCode !== r.originalText.languageCode);
      return {
        author: { name: r.authorAttribution?.displayName?.trim() || "Google", url: httpUrl(r.authorAttribution?.uri), photo: httpUrl(r.authorAttribution?.photoUri) },
        rating: r.rating ?? 0, text: shown, original: translated ? orig : undefined,
        relative: r.relativePublishTimeDescription ?? "", time: r.publishTime ?? "",
      };
    }).filter((r) => r.text).slice(0, 5),
  };
}

/** Egy élő betöltés (a /api/reviews hívja). Semmit nem ír el a válaszból — csak a számlálót és egyszer a place ID-t. */
export async function loadGoogleReviews(lang: Lang): Promise<ReviewsResult> {
  const key = process.env.GOOGLE_PLACES_KEY?.trim();
  if (!key) return { ok: false, status: 404, reason: "GOOGLE_PLACES_KEY hiányzik" };
  try {
    if (!(await reserveCall(dailyCap()))) return { ok: false, status: 429, reason: "elfogyott a napi keret (GOOGLE_REVIEWS_DAILY_CAP)" };
    const id = await placeId(key);
    if (!id) return { ok: false, status: 502, reason: "a hely azonosítója nem található" };
    const res = await fetch(`${apiBase()}/v1/places/${encodeURIComponent(id)}?languageCode=${lang}`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS }, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, status: 502, reason: `Places ${res.status}` };
    return { ok: true, data: toReviews((await res.json()) as Place) };
  } catch (e) {
    return { ok: false, status: 502, reason: e instanceof Error ? e.message : String(e) };
  }
}
