/**
 * Helyi Places API (New) mock a Google-értékelések próbájához (scripts/checks/p5-reviews.mjs). Nincs függősége.
 * A vélemények szövege KITALÁLT PRÓBAADAT, egyedi „P5MOCK-” jelölővel — csak arra jó, hogy a próba megtalálja
 * (vagy ne találja meg) a tárban; a weboldal tartalmába soha nem kerülhet.
 *
 * Importálva:  const m = await startMockPlaces({ port: 0 });
 *              m.url · m.calls() · m.clear() · m.setStatus(500) · m.sample("hu") · await m.close()
 * Önállóan:    node scripts/mock-places.mjs [--port 4020]
 *              majd GOOGLE_PLACES_KEY=teszt GOOGLE_PLACES_API_BASE=http://127.0.0.1:4020 npm start
 *
 * Végpontok:
 *   POST /v1/places:searchText         → { places: [{ id }] }
 *   GET  /v1/places/:id?languageCode=  → rating, userRatingCount, googleMapsUri, 5 vélemény (a szöveg nyelvenként más)
 *   GET  /avatar/:n.png                → kis PNG (a szerzői avatar — a böngésző ténylegesen betölti)
 *   GET  /__calls · DELETE /__calls    → a kapott Places-hívások (az avatar-kérések nem számítanak)
 *   POST /__status { "status": 500 }   → a következő Places-válaszok kódja (200: rendes válasz)
 */
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MOCK_PLACE_ID = "p5-mock-place-id";
export const MOCK_MARKER = "P5MOCK";
export const MOCK_COUNT = 48213;
export const MOCK_RATING = 4.7;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const LANG_TEXT = {
  hu: "próba-vélemény magyarul, a teszt kedvéért",
  en: "test review in English, for the check only",
  de: "Testbewertung auf Deutsch, nur für die Prüfung",
};
const RELATIVE = { hu: "2 hónapja", en: "2 months ago", de: "vor 2 Monaten" };

/** A mock válasza egy nyelvre — a próba ezzel a szöveggel végzi a pozitív kontrollt. */
export function placeSample(base, lang = "hu") {
  const l = LANG_TEXT[lang] ? lang : "hu";
  return {
    rating: MOCK_RATING,
    userRatingCount: MOCK_COUNT,
    googleMapsUri: `https://maps.google.com/?cid=${MOCK_PLACE_ID}`,
    reviews: [1, 2, 3, 4, 5].map((n) => {
      const text = `${MOCK_MARKER}-${l}-${n} ${LANG_TEXT[l]}`;
      /* A 2. véleményt „fordítottként” adjuk vissza (nem magyar kérésnél): az eredeti magyar. */
      const translated = n === 2 && l !== "hu";
      return {
        rating: n === 3 ? 4 : 5,
        text: { text, languageCode: l },
        originalText: translated ? { text: `${MOCK_MARKER}-orig-${n} ${LANG_TEXT.hu}`, languageCode: "hu" } : { text, languageCode: l },
        relativePublishTimeDescription: RELATIVE[l],
        publishTime: `2026-07-0${n}T10:00:00Z`,
        authorAttribution: { displayName: `Próba Szerző ${n}`, uri: `https://www.google.com/maps/contrib/p5-mock-${n}`, photoUri: `${base}/avatar/${n}.png` },
      };
    }),
  };
}

export async function startMockPlaces({ port = 0 } = {}) {
  let code = 200;
  const calls = [];
  const readBody = (req) => new Promise((resolve) => { let s = ""; req.setEncoding("utf8"); req.on("data", (c) => (s += c)); req.on("end", () => resolve(s)); });
  const json = (res, st, obj) => { res.writeHead(st, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
  let base = "";

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://mock");
    if (url.pathname.startsWith("/avatar/")) { res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "no-store" }); return res.end(PNG); }
    if (url.pathname === "/__calls") { if (req.method === "DELETE") calls.length = 0; return json(res, 200, calls); }
    if (url.pathname === "/__status" && req.method === "POST") { try { code = Number(JSON.parse(await readBody(req)).status) || 200; } catch { /* marad */ } return json(res, 200, { status: code }); }

    const key = req.headers["x-goog-api-key"] ?? "";
    const fieldMask = req.headers["x-goog-fieldmask"] ?? "";
    if (req.method === "POST" && url.pathname === "/v1/places:searchText") {
      const body = await readBody(req);
      calls.push({ at: new Date().toISOString(), kind: "search", key, fieldMask, body });
      if (!key) return json(res, 403, { error: { code: 403, message: "API key missing" } });
      if (code !== 200) return json(res, code, { error: { code, message: "mock hiba" } });
      return json(res, 200, { places: [{ id: MOCK_PLACE_ID }] });
    }
    const m = url.pathname.match(/^\/v1\/places\/([^/:]+)$/);
    if (req.method === "GET" && m) {
      const lang = url.searchParams.get("languageCode") ?? "";
      calls.push({ at: new Date().toISOString(), kind: "details", id: decodeURIComponent(m[1]), lang, key, fieldMask });
      if (!key) return json(res, 403, { error: { code: 403, message: "API key missing" } });
      if (code !== 200) return json(res, code, { error: { code, message: "mock hiba" } });
      if (decodeURIComponent(m[1]) !== MOCK_PLACE_ID) return json(res, 404, { error: { code: 404, message: "place not found" } });
      return json(res, 200, placeSample(base, lang));
    }
    json(res, 404, { error: { code: 404, message: "ismeretlen végpont" } });
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  const actual = server.address().port;
  base = `http://127.0.0.1:${actual}`;
  return {
    port: actual,
    url: base,
    calls: () => structuredClone(calls),
    clear: () => { calls.length = 0; },
    setStatus: (n) => { code = n; },
    sample: (lang) => placeSample(base, lang),
    close: () => new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); }),
  };
}

/* Önálló futtatás */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf("--port");
  const m = await startMockPlaces({ port: i > 0 ? Number(process.argv[i + 1]) : 4020 });
  console.log(`Places-mock: ${m.url}  (GOOGLE_PLACES_API_BASE=${m.url}, GOOGLE_PLACE_ID=${MOCK_PLACE_ID})`);
}
