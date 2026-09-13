import fs from "node:fs/promises";
import path from "node:path";
import { getStore } from "@netlify/blobs";
import { blobsAvailable } from "./store";
import type { Lang } from "@/content/types";

/**
 * Google-értékelések a cégprofilból (Places API New). Csak GOOGLE_PLACES_KEY mellett dolgozik;
 * nélküle `null`, és a blokk nem jelenik meg. Naponta egyszer kérdez (a Google legfeljebb 5 véleményt ad),
 * az eredményt a Blobs „cache” tárban (helyben data/cache/) tartja nyelvenként. A hely azonosítóját
 * GOOGLE_PLACE_ID adja; ha nincs, egyszer szöveges kereséssel keresi meg és azt is elteszi.
 * Szabály: az író neve és profil-linkje látszik, a szöveget nem módosítjuk, „Google” jelzéssel jelenik meg.
 */
export type GoogleReview = { author: string; authorUrl?: string; rating: number; text: string; relative: string; time: string };
export type GoogleReviews = { rating: number; count: number; url: string; name: string; reviews: GoogleReview[]; fetchedAt: string };

const TTL = 24 * 3600 * 1000;
const QUERY = "Gyűrűsi Ménes, 8932 Gyűrűs, Petőfi Sándor u. 2.";
const DIR = path.join(process.cwd(), "data/cache");

async function cacheGet(key: string): Promise<unknown | null> {
  if (blobsAvailable()) { try { return await getStore({ name: "cache" }).get(key, { type: "json" }); } catch { return null; } }
  try { return JSON.parse(await fs.readFile(path.join(DIR, `${key}.json`), "utf8")); } catch { return null; }
}
async function cacheSet(key: string, value: unknown): Promise<void> {
  if (blobsAvailable()) { try { await getStore({ name: "cache" }).setJSON(key, value); } catch { /* nem kritikus */ } return; }
  await fs.mkdir(DIR, { recursive: true }); await fs.writeFile(path.join(DIR, `${key}.json`), JSON.stringify(value, null, 2));
}

async function findPlaceId(key: string): Promise<string | null> {
  const cached = (await cacheGet("google-place-id")) as { id: string } | null;
  if (cached?.id) return cached.id;
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id,places.displayName" },
    body: JSON.stringify({ textQuery: QUERY, languageCode: "hu" }),
  });
  if (!res.ok) { console.warn("[reviews] hely-keresés:", res.status, await res.text()); return null; }
  const data = (await res.json()) as { places?: { id: string }[] };
  const id = data.places?.[0]?.id ?? null;
  if (id) await cacheSet("google-place-id", { id });
  return id;
}

export async function getGoogleReviews(lang: Lang): Promise<GoogleReviews | null> {
  const key = process.env.GOOGLE_PLACES_KEY;
  if (!key) return null;
  const cacheKey = `google-reviews-${lang}`;
  const cached = (await cacheGet(cacheKey)) as GoogleReviews | null;
  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < TTL) return cached;
  try {
    const id = process.env.GOOGLE_PLACE_ID || (await findPlaceId(key));
    if (!id) return cached ?? null;
    const res = await fetch(`https://places.googleapis.com/v1/places/${id}?languageCode=${lang}`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "displayName,rating,userRatingCount,googleMapsUri,reviews" },
    });
    if (!res.ok) { console.warn("[reviews] Places:", res.status, await res.text()); return cached ?? null; }
    const p = (await res.json()) as {
      displayName?: { text: string }; rating?: number; userRatingCount?: number; googleMapsUri?: string;
      reviews?: { rating: number; text?: { text: string }; originalText?: { text: string }; relativePublishTimeDescription?: string; publishTime?: string; authorAttribution?: { displayName: string; uri?: string } }[];
    };
    const out: GoogleReviews = {
      name: p.displayName?.text ?? "Gyűrűsi Ménes", rating: p.rating ?? 0, count: p.userRatingCount ?? 0, url: p.googleMapsUri ?? "", fetchedAt: new Date().toISOString(),
      reviews: (p.reviews ?? []).filter((r) => (r.text?.text ?? r.originalText?.text ?? "").trim()).map((r) => ({
        author: r.authorAttribution?.displayName ?? "Google-felhasználó", authorUrl: r.authorAttribution?.uri, rating: r.rating,
        text: (r.text?.text ?? r.originalText?.text ?? "").trim(), relative: r.relativePublishTimeDescription ?? "", time: r.publishTime ?? "",
      })),
    };
    await cacheSet(cacheKey, out);
    return out;
  } catch (e) { console.warn("[reviews] hiba:", e instanceof Error ? e.message : e); return cached ?? null; }
}
