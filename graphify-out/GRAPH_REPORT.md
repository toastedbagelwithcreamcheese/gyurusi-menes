# Graph Report - gyurusi-menes  (2026-09-14)

## Corpus Check
- 164 files · ~367,916 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1290 nodes · 3075 edges · 73 communities (62 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9f6c978c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ImageUpload.tsx
- p7-speed.mjs
- compilerOptions
- actions.ts
- devDependencies
- Gyűrűsi Ménes — online kutatási jelentés
- SubPage.tsx
- prep-images.mjs
- Gyűrűsi Ménes — fotóelemzés (187 kép, 2026-08-22/23, Gyűrűs, GPS 46.888N 16.990E)
- Gyűrűsi Ménes — design rendszer
- p5-reviews.mjs
- Gyűrűsi Ménes — weboldal + admin (demó)
- verify.mjs
- types.ts
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- admin-flow.mjs
- shots.mjs
- p4-public.mjs
- AGENTS.md
- CLAUDE.md
- GATES-2026-08-30.md
- GATES.md
- store.ts
- p6-geo.mjs
- admin-auth.ts
- sharp-linux.mjs
- final-live.mjs
- warm-images.mjs
- [lang]/layout.tsx
- records.ts
- privacy.ts
- Sections.tsx
- google-reviews.ts
- revalidateSite
- seo.ts
- P2 — Valós méretű feltöltések (G18) — bizonyítékok
- P1 — Adatréteg és megbízhatóság (G16, G17) — bizonyítékok
- Gyűrűsi Ménes — átnézés a megbízó szempontjai szerint (2026-09-13)
- admin/layout.tsx
- r9-google-policy.md
- p4-privacy.mjs
- with-server.mjs
- p6-seo.mjs
- p6-lib.mjs
- make-icons.mjs
- P3 — Admin: belépés és egyszerű használat (G19, G20) — bizonyítékok
- P5 — Integrációk szimulációval (e-mail, Google-értékelések) — bizonyítékok
- P6 — SEO és GEO: bizonyítékok (2026-09-14)
- p6-lighthouse.mjs
- Egyesítés — P5 (feat/p5-integraciok) és P6 (feat/p6-seo-geo) a main-be: bizonyítékok (2026-09-14)
- og-font.py
- maintenance.ts
- p1-maintenance.mjs
- P7 — Mobil sebesség (G27) — bizonyítékok
- readSite
- db-demo.mjs
- P4 — Nyilvános javítások és adatkezelés (G25, G26, a G23 képleírás-pontja) — bizonyítékok
- route.tsx
- p3-auth.mjs
- p3-admin-ux.mjs
- blobsAvailable
- p2-uploads.mjs
- Javítókör (2026-09-14 este) — a független átvevő 13 hiánya
- formatRange
- p1-data.mjs
- Ellenőrzés fázis — teljes kapusor helyben, a G28 előkészítése
- startNext

## God Nodes (most connected - your core abstractions)
1. `readSite()` - 64 edges
2. `t()` - 45 edges
3. `isLang()` - 40 edges
4. `langPath()` - 39 edges
5. `writeSite()` - 35 edges
6. `blobsAvailable()` - 33 edges
7. `getDict()` - 29 edges
8. `resolveImage()` - 29 edges
9. `guard()` - 25 edges
10. `Lang` - 24 edges

## Surprising Connections (you probably didn't know these)
- `dailyMaintenance()` --calls--> `runMaintenance()`  [EXTRACTED]
  netlify/functions/daily-maintenance.mts → src/lib/maintenance.ts
- `writeSite()` --calls--> `revalidateSite()`  [EXTRACTED]
  scripts/checks/p4-privacy.mjs → scripts/revalidate.mjs
- `LegalAdmin()` --calls--> `readSite()`  [EXTRACTED]
  src/app/[lang]/admin/(panel)/jogi/page.tsx → src/lib/store.ts
- `RootLayout()` --calls--> `isLang()`  [EXTRACTED]
  src/app/[lang]/layout.tsx → src/content/types.ts
- `Img()` --calls--> `placeholderStyle()`  [EXTRACTED]
  src/components/site/Sections.tsx → src/lib/placeholder.ts

## Import Cycles
- None detected.

## Communities (73 total, 11 thin omitted)

### Community 0 - "ImageUpload.tsx"
Cohesion: 0.06
Nodes (80): dynamic, POST(), dynamic, POST(), dynamic, POST(), dynamic, FORMATS (+72 more)

### Community 1 - "p7-speed.mjs"
Cohesion: 0.11
Nodes (11): BASE, DB, get(), LANGS, LIMITS, problems, ROOT, secs (+3 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 3 - "actions.ts"
Cohesion: 0.09
Nodes (66): b(), back(), deleteEvent(), deleteMessage(), deleteRegistration(), deleteReport(), deleteRoute(), deleteUpload() (+58 more)

### Community 4 - "devDependencies"
Cohesion: 0.04
Nodes (45): eslint, eslint-config-next, @netlify/blobs, @netlify/plugin-nextjs, next, dependencies, gsap, @netlify/blobs (+37 more)

### Community 5 - "Gyűrűsi Ménes — online kutatási jelentés"
Cohesion: 0.06
Nodes (32): 0. Összefoglaló, egy bekezdésben, 10.1 huculosveny.gyurusimenes.hu [ÉLŐ, letöltve 2026-08-30], 10.2 gyurusimenes.hu [ARCHÍV 2024-07-18; ma 403], 10.3 gidrangyurus.hu (régi, 2018–2022) [ARCHÍV], 10. A jelenlegi weboldal(ak) menüszerkezete és szövegei — SZÓ SZERINT, 11. Képek témái a régi/mostani oldalakon, 12. Nem igazolt / nem található (összefoglaló lista), 13. Ellentmondások (+24 more)

### Community 6 - "SubPage.tsx"
Cohesion: 0.13
Nodes (26): PagesAdmin(), menuPhoto(), Photo(), photoAlt(), PhotoKey, PhotoMeta, PHOTOS, ContactDock() (+18 more)

### Community 7 - "prep-images.mjs"
Cohesion: 0.32
Nodes (6): PHOTOS, SOURCE_ROOT, force, MANIFEST, OUT, ROOT

### Community 8 - "Gyűrűsi Ménes — fotóelemzés (187 kép, 2026-08-22/23, Gyűrűs, GPS 46.888N 16.990E)"
Cohesion: 0.22
Nodes (8): Design-következtetések, Domináns vizuális világ, FEATURE-képek, GALÉRIA (egységes, 12–16 kép), Gyűrűsi Ménes — fotóelemzés (187 kép, 2026-08-22/23, Gyűrűs, GPS 46.888N 16.990E), HERO-jelöltek (1–3), Kerülendő, STORYTELLING-képek

### Community 9 - "Gyűrűsi Ménes — design rendszer"
Cohesion: 0.25
Nodes (7): Gyűrűsi Ménes — design rendszer, Irány, Motion, Színek (`src/app/globals.css` `@theme`), Tipográfia, Térköz, forma, Töréspontok

### Community 10 - "p5-reviews.mjs"
Cohesion: 0.09
Nodes (38): api(), assert(), BASE, build(), CheckFail, CHROME, cleanEnv(), dbReset() (+30 more)

### Community 11 - "Gyűrűsi Ménes — weboldal + admin (demó)"
Cohesion: 0.12
Nodes (16): Adatszerkezet, karbantartás, mentés, Admin: belépés és használat, Ami szándékosan nincs benne, Ellenőrzés, Feltöltések (képek, PDF-beszámolók), Google-értékelések: keret és költség, Gyűrűsi Ménes — weboldal + admin (demó), Helyi adatbázis és tesztelés (+8 more)

### Community 13 - "types.ts"
Cohesion: 0.12
Nodes (25): generateMetadata(), dynamic, sitemap(), ContactForm(), State, Header(), KEYS, LangMenu() (+17 more)

### Community 17 - "admin-flow.mjs"
Cohesion: 0.33
Nodes (8): BASE, confirmDelete(), errors, fail(), fetchText(), go(), login(), purge()

### Community 18 - "shots.mjs"
Cohesion: 0.25
Nodes (5): BASE, DB, problems, report, ROOT

### Community 19 - "p4-public.mjs"
Cohesion: 0.09
Nodes (13): BAND, BASE, DB, LANGS, oldSeed, pageErrors, PAGES, problems (+5 more)

### Community 24 - "store.ts"
Cohesion: 0.13
Nodes (17): Imprint, LEGACY_EXAMPLE_EVENTS, legacyHash(), Legal, LOCALES, migrateLegacyContent(), normalizeUpload(), Page (+9 more)

### Community 25 - "p6-geo.mjs"
Cohesion: 0.08
Nodes (29): ADDRESSES, apple, at(), bad(), BOTS, calendarLinks, checkGraph(), composeAddress() (+21 more)

### Community 27 - "admin-auth.ts"
Cohesion: 0.06
Nodes (65): dynamic, GET(), dynamic, POST(), POST(), lockedMessage(), login(), LoginState (+57 more)

### Community 28 - "sharp-linux.mjs"
Cohesion: 0.33
Nodes (4): PKGS, ROOT, sharpPkg, SIDE

### Community 29 - "final-live.mjs"
Cohesion: 0.10
Nodes (18): adminJson(), backup(), bad(), BASE, confirmDelete(), deleteEvent(), deleteReport(), deleteUpload() (+10 more)

### Community 30 - "warm-images.mjs"
Cohesion: 0.16
Nodes (15): ACCEPT, BASE, CONCURRENCY, decode(), FALLBACK_PATHS, images, kb(), pagePaths() (+7 more)

### Community 31 - "[lang]/layout.tsx"
Cohesion: 0.14
Nodes (11): fraunces, generateMetadata(), instrument, Params, RootLayout(), BOTS, DISALLOW, RevealObserver() (+3 more)

### Community 32 - "records.ts"
Cohesion: 0.16
Nodes (27): add(), asItems(), blobKey(), create(), deleteMessage(), deleteRegistration(), deleteRegistrationsForEvent(), eachLimit() (+19 more)

### Community 33 - "privacy.ts"
Cohesion: 0.27
Nodes (9): BACKUPS_KEPT, MESSAGE_RETENTION_DAYS, REGISTRATION_RETENTION_DAYS, fillPrivacy(), parsePrivacy(), PRIVACY_TOKENS, PrivacyBlock, privacyValues() (+1 more)

### Community 34 - "Sections.tsx"
Cohesion: 0.10
Nodes (27): P, revalidate, Params, revalidate, Footer(), I, tel(), Labels (+19 more)

### Community 35 - "google-reviews.ts"
Cohesion: 0.08
Nodes (28): dynamic, GET(), HEADERS, Labels, Reviews(), State, apiBase(), Counter (+20 more)

### Community 36 - "revalidateSite"
Cohesion: 0.17
Nodes (9): ROOT, BASE, DB, errors, fail(), go(), ROOT, writeDb() (+1 more)

### Community 37 - "seo.ts"
Cohesion: 0.11
Nodes (41): EventsPage(), dynamic, GET(), dynamic, GET(), EventsHome(), buildLlms(), events() (+33 more)

### Community 38 - "P2 — Valós méretű feltöltések (G18) — bizonyítékok"
Cohesion: 0.25
Nodes (7): A régi kapuk (a változtatások után, friss builddel), Amit nem mértem (és miért), G18 — a kapu futása, Korlátok és forrásuk, Mért hiba → megoldás, P2 — Valós méretű feltöltések (G18) — bizonyítékok, Újraellenőrzés a main HEAD-en (c79f1ad — a P3, P5, P6 egyesítése után)

### Community 39 - "P1 — Adatréteg és megbízhatóság (G16, G17) — bizonyítékok"
Cohesion: 0.29
Nodes (6): Amit ez a fázis NEM bizonyít, Futtatott parancsok és eredményük, Hogyan mér a két kapu (és miért bízhatunk benne), Menet közben talált és javított hibák (a tesztkeretben), Mit oldottunk meg (mért hibák → mérés), P1 — Adatréteg és megbízhatóság (G16, G17) — bizonyítékok

### Community 40 - "Gyűrűsi Ménes — átnézés a megbízó szempontjai szerint (2026-09-13)"
Cohesion: 0.29
Nodes (6): Csiszolás és üzleti, Fontos, Gyűrűsi Ménes — átnézés a megbízó szempontjai szerint (2026-09-13), Kritikus, Rendben (mérve), Ütközés-ellenőrzés az ügyfél kéréseivel (C01–C15)

### Community 43 - "p4-privacy.mjs"
Cohesion: 0.11
Nodes (16): BACK, bad(), base, checkRequired(), DAY_WORDS, decode(), LP, MSG (+8 more)

### Community 45 - "with-server.mjs"
Cohesion: 0.40
Nodes (4): [cmd, ...args], ROOT, run, srv

### Community 47 - "p6-seo.mjs"
Cohesion: 0.09
Nodes (22): pathOf(), altIssues, altKey(), bad(), DB, descs, extra, fetched (+14 more)

### Community 48 - "p6-lib.mjs"
Cohesion: 0.23
Nodes (11): attrs(), BOT_UA, decode(), get(), imageSize(), langPath(), LANGS, PAGE_KEYS (+3 more)

### Community 49 - "make-icons.mjs"
Cohesion: 0.28
Nodes (6): APP, ROOT, round(), scaled(), sizes, square()

### Community 50 - "P3 — Admin: belépés és egyszerű használat (G19, G20) — bizonyítékok"
Cohesion: 0.17
Nodes (11): A feladatok a kódban (átnézve), A negatív állítások kontrolljai, Egy javítás: a feladó-sor valótlant mondott, Futtatások (az utolsó forrásváltozás utáni buildön), Ismert korlátok (szándékosan így), Kapu-futások, Menet közben talált hiba: az admin szerver-akciói megkerülhették a proxyt, Mi készült (+3 more)

### Community 51 - "P5 — Integrációk szimulációval (e-mail, Google-értékelések) — bizonyítékok"
Cohesion: 0.22
Nodes (8): A próbák el tudnak bukni (mutációs kontroll ebben a futásban; utána `git checkout` a mutált fájlra, `git diff --quiet` → bájtra visszaállítva, a `data/reviews-cache.json` törölve), Egyéb futtatott ellenőrzések (ez a futás), Ennek a futásnak a helyzete (újrafuttatás), G21 — mért lépések (ez a futás, `.env.local` nélkül), G22 — mért lépések (ez a futás), Kapuk, Megjegyzések, P5 — Integrációk szimulációval (e-mail, Google-értékelések) — bizonyítékok

### Community 52 - "P6 — SEO és GEO: bizonyítékok (2026-09-14)"
Cohesion: 0.25
Nodes (7): Előállított eszközök, Kapuk, Közben talált és javított hibák, Mit mér a két kapuszkript, P6 — SEO és GEO: bizonyítékok (2026-09-14), Régi kapuk és ellenőrzések (a végső kóddal), Újraellenőrzés friss worktree-ben (2026-09-14, második futás)

### Community 53 - "p6-lighthouse.mjs"
Cohesion: 0.33
Nodes (5): BASE, report(), ROOT, lines, problems

### Community 54 - "Egyesítés — P5 (feat/p5-integraciok) és P6 (feat/p6-seo-geo) a main-be: bizonyítékok (2026-09-14)"
Cohesion: 0.25
Nodes (7): Egyesítés — P5 (feat/p5-integraciok) és P6 (feat/p6-seo-geo) a main-be: bizonyítékok (2026-09-14), Egyesítés utáni integrációs hibák (javítva), Futtatott ellenőrzések (a javított `mail.ts`-sel, HEAD ad32594 + a javítás), Futtatott ellenőrzések (a végső kóddal), Integrációs javítás, Második egyesítési kör (2026-09-14 délután) — a P5/P6 újrafuttatási ágak, main a4cb24e-ről, Ütközések és feloldásuk

### Community 56 - "maintenance.ts"
Cohesion: 0.18
Nodes (21): config, dailyMaintenance(), Backup, backupDir(), backupStore(), budapestDay(), claimRun(), LastRun (+13 more)

### Community 57 - "p1-maintenance.mjs"
Cohesion: 0.18
Nodes (17): initialDoc(), budapestDay(), dayOffset(), fileAdapter(), fixtureEvent(), minusDays(), readSeed(), runTsModule() (+9 more)

### Community 58 - "P7 — Mobil sebesség (G27) — bizonyítékok"
Cohesion: 0.18
Nodes (10): A megmaradt LCP-hiba oka: versenyhelyzet, A teljes kapusor utáni javítás: beragadt RSC-előtöltések (stale-while-revalidate a böngészőben), Folytatás az Ellenőrzés fázisban (2026-09-14 délután), Javítókör (2026-09-14 este): angol és német lap, inlineCss és betű-előtöltés újramérve, Kiinduló mérés (50821c2 buildje), Mi készült, P7 — Mobil sebesség (G27) — bizonyítékok, Utolsó G27-futás (a fenti változtatásokkal) (+2 more)

### Community 59 - "readSite"
Cohesion: 0.09
Nodes (38): generateMetadata(), P, PrivacyPage(), revalidate, EventPage(), generateMetadata(), P, revalidate (+30 more)

### Community 60 - "db-demo.mjs"
Cohesion: 0.39
Nodes (7): addDays(), DB, DEMO_EVENT_IDS, demoEvents(), nextWeekday(), ROOT, ymd()

### Community 61 - "P4 — Nyilvános javítások és adatkezelés (G25, G26, a G23 képleírás-pontja) — bizonyítékok"
Cohesion: 0.22
Nodes (8): A tájékoztató ígéretei és a kód, G25 napló (p4-public, a lényeg), G26 napló (p4-privacy), Kapuk és ellenőrzések (a végleges kódon), Mi készült, Mérések a javítás előtt (01bf729 buildje), Nem kapu, de megnéztem, P4 — Nyilvános javítások és adatkezelés (G25, G26, a G23 képleírás-pontja) — bizonyítékok

### Community 63 - "route.tsx"
Cohesion: 0.32
Nodes (7): backdrop(), FONT, FULL, GET(), titleSize(), OG_SIZE, SITE_NAME

### Community 64 - "p3-auth.mjs"
Cohesion: 0.17
Nodes (11): assert(), ROOT, load(), getText(), b64url(), checkPublicNoAdminLink(), cleanups, expectAdmin200() (+3 more)

### Community 65 - "p3-admin-ux.mjs"
Cohesion: 0.17
Nodes (12): sleep(), startBlobs(), tmpDir(), BASE, cleanups, L(), PHOTOS, readSite() (+4 more)

### Community 66 - "blobsAvailable"
Cohesion: 0.24
Nodes (17): POST(), clientIp(), Entry, evaluate(), hit(), HitResult, ipKey(), limitByIp() (+9 more)

### Community 67 - "p2-uploads.mjs"
Cohesion: 0.16
Nodes (9): parallelSaves(), CheckError, chromeExe, dbReset(), BASE, cleanups, noisyJpeg(), pdfFixture() (+1 more)

### Community 68 - "Javítókör (2026-09-14 este) — a független átvevő 13 hiánya"
Cohesion: 0.40
Nodes (4): G27 a teljes kapusorban (Lighthouse 13 mobil; csak az ebben a futásban írt fájlok), Javítókör (2026-09-14 este) — a független átvevő 13 hiánya, Mit futtattam, mit mértem (a teljes kapusor előtt, célzottan), Nem teljesülő kapuk

### Community 70 - "formatRange"
Cohesion: 0.19
Nodes (16): EventsAdmin(), Flash(), persons(), RegistrationsAdmin(), RegTable(), AdminLayout(), dynamic, AdminHome() (+8 more)

### Community 71 - "p1-data.mjs"
Cohesion: 0.27
Nodes (9): cleanups, log(), lostUpdateControl(), migration(), PAGE_KEYS, RUN, submissions(), blobsAdapter() (+1 more)

### Community 72 - "Ellenőrzés fázis — teljes kapusor helyben, a G28 előkészítése"
Cohesion: 0.25
Nodes (7): 1. Kiinduló állapot, 2. Kódváltozások ebben a fázisban, 3. final-live.mjs (G28) helyi próbája, 4. Teljes kapusor, 5. Az éles tár mellékhatása (G13), 6. Élesítés — fő munkamenet (2026-09-14 este), Ellenőrzés fázis — teljes kapusor helyben, a G28 előkészítése

### Community 73 - "startNext"
Cohesion: 0.67
Nodes (3): fail(), killPort(), startNext()

## Knowledge Gaps
- **440 isolated node(s):** `eslintConfig`, `config`, `LEGACY`, `nextConfig`, `name` (+435 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `revalidateSite()` connect `revalidateSite` to `p3-admin-ux.mjs`, `p7-speed.mjs`, `p4-privacy.mjs`, `p6-seo.mjs`, `shots.mjs`, `p4-public.mjs`, `db-demo.mjs`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Why does `readSite()` connect `readSite` to `records.ts`, `Sections.tsx`, `actions.ts`, `blobsAvailable`, `seo.ts`, `formatRange`, `SubPage.tsx`, `types.ts`, `maintenance.ts`, `store.ts`, `admin-auth.ts`, `route.tsx`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `assert()` connect `p3-auth.mjs` to `p3-admin-ux.mjs`, `p2-uploads.mjs`, `p1-data.mjs`, `startNext`, `p1-maintenance.mjs`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `config`, `LEGACY` to the rest of the system?**
  _440 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ImageUpload.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.062111801242236024 - nodes in this community are weakly interconnected._
- **Should `p7-speed.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._