# Egyesítés — P5 (feat/p5-integraciok) és P6 (feat/p6-seo-geo) a main-be: bizonyítékok (2026-09-14)

Alap: main b17d410 (P1–P3). Mindkét ág a 67aaf1f-ről indult. `git merge --no-ff`, egyenként: előbb P5 (a1c552a), aztán P6.
Gép: macOS, Node 25, Next 16 (production build), @netlify/blobs 11.0.3, Chrome for Testing (chromium-1234). Helyi szerver: a 3012-es port.

## Ütközések és feloldásuk

| Fájl | Mi ütközött | Feloldás |
|---|---|---|
| `src/lib/mail.ts` | P3: `contactRecipient`/`mailSender`/`mailConfigured`/`sendTestMail`, `RESEND_API_URL`, feladó `onboarding@resend.dev` · P5: `mailStatus`, `RESEND_API_BASE`, 5 s időkorlát, feladó `weboldal@gyurusimenes.hu` | Mindkét export-készlet megmaradt (az állapotpanel és a próba-levél a P3 neveit hívja); a `send()` a P5 időkorlátjával és hibatűrésével megy. A végpont `RESEND_API_URL` (teljes) → `RESEND_API_BASE`/emails → alap. Az alapértelmezett feladó a P5-é (az integrációs fázis döntése, a G21 méri); a `p3-admin-ux.mjs` E2-es állítása ehhez igazítva. |
| `src/app/globals.css` | a fájl végére a P3 útvonal-kártyái és a P5 értékelés-stílusai kerültek | mindkét blokk megmaradt egymás után; csak a három jelölősort töröltem (blokk-csere nélkül). Soronkénti ellenőrzés: mindkét szülő minden nem üres sora benne van. |
| `README.md` | P3 „Admin: belépés és használat” és P5 „Integrációk” fejezet ugyanott | mindkét fejezet megmaradt |
| `next.config.ts` | `outputFileTracingIncludes`: P2 `/api/admin/upload-image` és P6 `/og/**` | mindkét bejegyzés |
| `src/proxy.ts` | matcher: P3 négy admin-mintája és a P6 `og/` kivétele | a P3 több elemű matchere, az első mintába a P6 `og/` kivétele |
| `src/app/[lang]/page.tsx` | P5 élő `<Reviews>` + a régi kézi JSON-LD · P6 `metadataFor`/`ldFor` + a régi szerveroldali `getGoogleReviews` | P6 metaadat és JSON-LD (`ldFor`, aggregateRating nélkül) + P5 kliens-komponens (`reviewsEnabled() && <Reviews …>`); a `getGoogleReviews` hívás és a `revalidate` export kikerült (a P5 szerint a vélemény nem süthető a lapba) |
| `src/app/[lang]/[slug]/page.tsx` | automatikusan fésült | ellenőrizve: a Túrák lapon a P3 `TrailRoutes`/`RouteMap` ág és a P6 `metadataFor`/`ldFor` is benne van |

## Egyesítés utáni integrációs hibák (javítva)

1. **`src/app/og/[lang]/[[...path]]/route.tsx`** — a P6 a régi `getFile`-t importálta, amit a P2 `openFile`-ra (stream) cserélt → `tsc` TS2305. Javítás: `openFile`, a stream `new Response(body).arrayBuffer()`-rel beolvasva (a feltöltött kép legfeljebb 4 MB).
2. **`scripts/checks/_p5-harness.mjs` `cleanEnv`** — a P5 a worktree-ben futott, ahol nincs `.env.local`. A fő repóban a Next a `.env.local` `CONTACT_TO` értékét betöltötte, mert a harness a változót csak törölte (a `@next/env` csak a folyamatban nem létező kulcsot tölti be). Az első futás: `FAIL: a címzett nem az info@gyurusimenes.hu (CONTACT_TO nélkül): ["info@example.hu"]`. Javítás: az integrációs változók üres értékkel kerülnek a környezetbe (a kód mindenhol `?.trim() ||`-t használ). Utána `PASS: p5-mail`. Ez egyben a pozitív kontroll: ugyanaz a próba a szivárgó értékkel elbukik.

## Futtatott ellenőrzések (a végső kóddal)

Statikus: `npx tsc --noEmit` → TSC_OK · `npm run lint` → 0 hiba · `npm run build` → exit 0 (útvonalak közt `ƒ /api/reviews`, `ƒ /og/[lang]/[[...path]]`, `○ /llms.txt`, `○ /llms-full.txt`, `ƒ /api/admin/upload-*`) · `node scripts/verify.mjs css-motion | i18n | content-no-fabrication | images | no-gallery` → mind PASS.

Szerveres (egymás után, mindegyik előtt `npm run db:reset`; a naplók sha256-előtagjával):

| Kapu | Parancs | Eredmény |
|---|---|---|
| G9 | `node scripts/with-server.mjs node scripts/verify.mjs http` | PASS: http (f22234ef9287cfa8) |
| G10 | `node scripts/with-server.mjs node scripts/admin-flow.mjs` | ADMIN_FLOW_OK (b37d2bc3edbd6713) |
| G15 | `node scripts/with-server.mjs node scripts/qa-flow.mjs` | QA_FLOW_OK (79d108c255c06778) |
| G16 | `node scripts/checks/p1-data.mjs` | PASS: p1-data (d6922f6f576c1446 — azonos a P1-es naplóval) |
| G17 | `node scripts/checks/p1-maintenance.mjs` | PASS: p1-maintenance (664a197e3cc83b11) |
| G18 | `node scripts/with-server.mjs node scripts/checks/p2-uploads.mjs` | PASS: p2-uploads (96aed33889e68420) |
| G19 | `node scripts/checks/p3-auth.mjs` | PASS: p3-auth (da0d800b2e0c5c7f — azonos a P3-as naplóval) |
| G20 | `node scripts/with-server.mjs node scripts/checks/p3-admin-ux.mjs` | PASS: p3-admin-ux (f3fc0b0476e2c19a; a próba-levél feladója már `weboldal@gyurusimenes.hu`) |
| G21 | `node scripts/checks/p5-mail.mjs` | első futás FAIL (lásd fent, 7758c8b83e88d67b) → harness-javítás után PASS: p5-mail (f837d94864f8c7d4) |
| G22 | `node scripts/checks/p5-reviews.mjs` | PASS: p5-reviews (7822da822ff4197b), a harness-javítás után újra PASS (7490b73ea827b940) |
| G23 | `node scripts/with-server.mjs node scripts/checks/p6-seo.mjs` | **FAIL — 1 hiba**, ugyanaz, mint a P6 ágon: 66 képleírás en/de lapon magyar (a P4 feladata). Más állítás nem bukik. |
| G24 | `node scripts/with-server.mjs node scripts/checks/p6-geo.mjs` | PASS: p6-geo (b9a954249f2d39b3) — 15 lap × 3 nyelv, 45 JSON-LD blokk; llms.txt 12 968 / llms-full.txt 39 731 karakter |

A p5-* szkriptek maguk buildelnek (tiszta környezettel); utánuk normál `npm run build` futott, a `.next` tehát a szokásos build. A futtatás végén `npm run db:reset`.
