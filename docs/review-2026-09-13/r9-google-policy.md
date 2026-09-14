# R9 — Google Places: megjelenítési és tárolási szabályok (ellenőrizve 2026-09-13)

Forrás 1: https://developers.google.com/maps/documentation/places/web-service/policies
- Jelzés térkép nélkül: „Attribution should take the form of the Google Maps logo whenever possible. In cases where space is limited, the text Google Maps is acceptable.”
- Szerzők: „You must always credit the author when displaying photos or reviews. Each photo and review includes an author attribution (avatar image, name, and profile link).” — helyhiány esetén a minimum az avatar.
- Tárolás: „The place ID … is exempt from the caching restrictions. You can therefore store place ID values indefinitely.” — a vélemények, értékelés és más Places-tartalom nem tárolható (a korlátozott kivételeken túl).

Forrás 2: https://cloud.google.com/maps-platform/terms/maps-service-terms (Places API szakasz, curl-lel kivonatolva)
- „Customer may temporarily cache latitude and longitude values from the Places API for up to 30 consecutive calendar days…”
- „…Customer may cache (a) place_id from Places API…”
- Kivétel csak ott, „where the cache is not used as a replacement for making an additional call to the Services.”

Összevetés a mostani megvalósítással (src/lib/google-reviews.ts, src/app/[lang]/page.tsx):
- A place ID tárolása: RENDBEN (kifejezetten engedett).
- A vélemények + értékelés 24 órás tárolása a Blobs „cache” tárban ÉS a főoldal `revalidate = 86400` ISR-je: a szabály szerint NEM ENGEDETT (a cache pontosan egy további hívást vált ki).
- Jelzés: a blokkban „· Google” szöveg áll — a szabály „Google Maps” logót vagy „Google Maps” szöveget kér: NEM MEGFELELŐ.
- Szerzői avatar (authorAttribution.photoUri): nincs megjelenítve (a kód nem kéri le) — a szabály a nevet, a linket ÉS az avatart kéri, ha van hely: NEM MEGFELELŐ.
