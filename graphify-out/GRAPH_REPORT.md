# Graph Report - gyurusi-menes  (2026-09-14)

## Corpus Check
- 171 files · ~375,547 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1394 nodes · 3244 edges · 88 communities (78 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6345be50`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- supabaseActive
- p7-speed.mjs
- compilerOptions
- readSite
- devDependencies
- Gyűrűsi Ménes — online kutatási jelentés
- Sections.tsx
- prep-images.mjs
- Gyűrűsi Ménes — fotóelemzés (187 kép, 2026-08-22/23, Gyűrűs, GPS 46.888N 16.990E)
- Gyűrűsi Ménes — design rendszer
- p5-reviews.mjs
- Gyűrűsi Ménes — weboldal + admin (demó)
- revalidateSite
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
- supabase-import.mjs
- p6-geo.mjs
- admin-auth.ts
- sharp-linux.mjs
- final-live.mjs
- warm-images.mjs
- [lang]/layout.tsx
- records.ts
- privacy.ts
- [lang]/esemenyek/page.tsx
- google-reviews.ts
- qa-flow.mjs
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
- isLang
- db-demo.mjs
- P4 — Nyilvános javítások és adatkezelés (G25, G26, a G23 képleírás-pontja) — bizonyítékok
- (panel)/page.tsx
- p3-auth.mjs
- p3-admin-ux.mjs
- ratelimit.ts
- p2-uploads.mjs
- Javítókör (2026-09-14 este) — a független átvevő 13 hiánya
- actions.ts
- jelentkezesek/page.tsx
- p1-data.mjs
- Ellenőrzés fázis — teljes kapusor helyben, a G28 előkészítése
- _p1-harness.mjs
- t
- supabase-live.mjs
- deploy.mjs
- supabase-local.mjs
- store.ts
- SubPage.tsx
- 20260914200000_adatreteg.sql
- auth-actions.ts
- proxy.ts
- (panel)/layout.tsx
- route.tsx
- Supabase-átállás — 2026-09-14 este
- requireAdmin
- contact/route.ts

## God Nodes (most connected - your core abstractions)
1. `readSite()` - 66 edges
2. `t()` - 45 edges
3. `isLang()` - 40 edges
4. `langPath()` - 39 edges
5. `supabaseActive()` - 39 edges
6. `writeSite()` - 37 edges
7. `getDict()` - 29 edges
8. `resolveImage()` - 29 edges
9. `guard()` - 25 edges
10. `Lang` - 24 edges

## Surprising Connections (you probably didn't know these)
- `dailyMaintenance()` --calls--> `runMaintenance()`  [EXTRACTED]
  netlify/functions/daily-maintenance.mts → src/lib/maintenance.ts
- `RootLayout()` --calls--> `isLang()`  [EXTRACTED]
  src/app/[lang]/layout.tsx → src/content/types.ts
- `Pic()` --calls--> `placeholderStyle()`  [EXTRACTED]
  src/components/site/SubPage.tsx → src/lib/placeholder.ts
- `dir()` --calls--> `dataDir()`  [EXTRACTED]
  src/lib/files.ts → src/lib/store.ts
- `until()` --calls--> `sleep()`  [EXTRACTED]
  scripts/checks/p3-admin-ux.mjs → scripts/checks/_p1-harness.mjs

## Import Cycles
- None detected.

## Communities (88 total, 10 thin omitted)

### Community 0 - "supabaseActive"
Cohesion: 0.07
Nodes (73): dynamic, POST(), dynamic, POST(), dynamic, POST(), dynamic, FORMATS (+65 more)

### Community 1 - "p7-speed.mjs"
Cohesion: 0.11
Nodes (11): BASE, DB, get(), LANGS, LIMITS, problems, ROOT, secs (+3 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 3 - "readSite"
Cohesion: 0.08
Nodes (46): ConfirmButton(), EventEdit(), EventsAdmin(), ImagePicker(), PickerImage, Thumb(), ATTEMPTS, decode() (+38 more)

### Community 4 - "devDependencies"
Cohesion: 0.05
Nodes (43): eslint, eslint-config-next, @netlify/plugin-nextjs, next, dependencies, gsap, next, react (+35 more)

### Community 5 - "Gyűrűsi Ménes — online kutatási jelentés"
Cohesion: 0.06
Nodes (32): 0. Összefoglaló, egy bekezdésben, 10.1 huculosveny.gyurusimenes.hu [ÉLŐ, letöltve 2026-08-30], 10.2 gyurusimenes.hu [ARCHÍV 2024-07-18; ma 403], 10.3 gidrangyurus.hu (régi, 2018–2022) [ARCHÍV], 10. A jelenlegi weboldal(ak) menüszerkezete és szövegei — SZÓ SZERINT, 11. Képek témái a régi/mostani oldalakon, 12. Nem igazolt / nem található (összefoglaló lista), 13. Ellentmondások (+24 more)

### Community 6 - "Sections.tsx"
Cohesion: 0.11
Nodes (29): Photo(), photoAlt(), PhotoKey, PhotoMeta, PHOTOS, Labels, MapEmbed(), ContactBlock() (+21 more)

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
Cohesion: 0.11
Nodes (17): Adatszerkezet, karbantartás, mentés, Admin: belépés és használat, Ami szándékosan nincs benne, Ellenőrzés, Feltöltések (képek, PDF-beszámolók), Google-értékelések: keret és költség, Gyűrűsi Ménes — weboldal + admin (demó), Helyi adatbázis és tesztelés (+9 more)

### Community 12 - "revalidateSite"
Cohesion: 0.20
Nodes (5): writeSite(), ROOT, writeDb(), revalidateSite(), ROOT

### Community 13 - "types.ts"
Cohesion: 0.16
Nodes (17): generateMetadata(), State, KEYS, LangMenu(), LangSwitch(), remember(), NotFoundBody(), State (+9 more)

### Community 17 - "admin-flow.mjs"
Cohesion: 0.33
Nodes (8): BASE, confirmDelete(), errors, fail(), fetchText(), go(), login(), purge()

### Community 18 - "shots.mjs"
Cohesion: 0.25
Nodes (5): BASE, DB, problems, report, ROOT

### Community 19 - "p4-public.mjs"
Cohesion: 0.09
Nodes (13): BAND, BASE, DB, LANGS, oldSeed, pageErrors, PAGES, problems (+5 more)

### Community 23 - "GATES.md"
Cohesion: 0.50
Nodes (3): 5. kör — minden, ami ügyféladat nélkül megoldható (2026-09-14), Gates: Gyűrűsi Ménes — 2. kör, az ügyfél 2026-09-12-i specifikációja, Supabase-átállás (2026-09-14)

### Community 24 - "supabase-import.mjs"
Cohesion: 0.13
Nodes (24): ANON, args, bad(), BUCKETS, checkSchema(), COLUMNS, die(), DRY (+16 more)

### Community 25 - "p6-geo.mjs"
Cohesion: 0.08
Nodes (29): ADDRESSES, apple, at(), bad(), BOTS, calendarLinks, checkGraph(), composeAddress() (+21 more)

### Community 27 - "admin-auth.ts"
Cohesion: 0.21
Nodes (19): POST(), LoginPage(), metadata, adminLocked(), adminOpen(), adminProtected(), b64url(), basicAuthOk() (+11 more)

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
Cohesion: 0.14
Nodes (29): add(), addRegistration(), asItems(), COLUMNS, create(), deleteMessage(), deleteRegistration(), deleteRegistrationsForEvent() (+21 more)

### Community 33 - "privacy.ts"
Cohesion: 0.27
Nodes (9): BACKUPS_KEPT, MESSAGE_RETENTION_DAYS, REGISTRATION_RETENTION_DAYS, fillPrivacy(), parsePrivacy(), PRIVACY_TOKENS, PrivacyBlock, privacyValues() (+1 more)

### Community 34 - "[lang]/esemenyek/page.tsx"
Cohesion: 0.27
Nodes (11): EventsPage(), P, revalidate, EventsHome(), PastEvents(), calendar(), featuredEvent(), isPast() (+3 more)

### Community 35 - "google-reviews.ts"
Cohesion: 0.06
Nodes (39): dynamic, GET(), HEADERS, Labels, Reviews(), State, apiBase(), Counter (+31 more)

### Community 36 - "qa-flow.mjs"
Cohesion: 0.22
Nodes (6): BASE, DB, errors, fail(), go(), ROOT

### Community 37 - "seo.ts"
Cohesion: 0.15
Nodes (29): dynamic, sitemap(), alternatesFor(), langPath(), absUrl(), brandTitle(), breadcrumbLd(), businessLd() (+21 more)

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
Cohesion: 0.12
Nodes (15): BACK, bad(), base, checkRequired(), DAY_WORDS, decode(), LP, MSG (+7 more)

### Community 45 - "with-server.mjs"
Cohesion: 0.33
Nodes (5): [cmd, ...args], ISOLATED, ROOT, run, srv

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
Cohesion: 0.17
Nodes (21): config, dailyMaintenance(), Backup, backupDir(), budapestDay(), buildBackup(), claimRun(), LastRun (+13 more)

### Community 57 - "p1-maintenance.mjs"
Cohesion: 0.16
Nodes (17): initialDoc(), budapestDay(), dayOffset(), fixtureEvent(), minusDays(), readSeed(), runTsModule(), tmpDir() (+9 more)

### Community 58 - "P7 — Mobil sebesség (G27) — bizonyítékok"
Cohesion: 0.18
Nodes (10): A megmaradt LCP-hiba oka: versenyhelyzet, A teljes kapusor utáni javítás: beragadt RSC-előtöltések (stale-while-revalidate a böngészőben), Folytatás az Ellenőrzés fázisban (2026-09-14 délután), Javítókör (2026-09-14 este): angol és német lap, inlineCss és betű-előtöltés újramérve, Kiinduló mérés (50821c2 buildje), Mi készült, P7 — Mobil sebesség (G27) — bizonyítékok, Utolsó G27-futás (a fenti változtatásokkal) (+2 more)

### Community 59 - "isLang"
Cohesion: 0.08
Nodes (38): generateMetadata(), P, PrivacyPage(), revalidate, EventPage(), generateMetadata(), P, revalidate (+30 more)

### Community 60 - "db-demo.mjs"
Cohesion: 0.39
Nodes (7): addDays(), DB, DEMO_EVENT_IDS, demoEvents(), nextWeekday(), ROOT, ymd()

### Community 61 - "P4 — Nyilvános javítások és adatkezelés (G25, G26, a G23 képleírás-pontja) — bizonyítékok"
Cohesion: 0.22
Nodes (8): A tájékoztató ígéretei és a kód, G25 napló (p4-public, a lényeg), G26 napló (p4-privacy), Kapuk és ellenőrzések (a végleges kódon), Mi készült, Mérések a javítás előtt (01bf729 buildje), Nem kapu, de megnéztem, P4 — Nyilvános javítások és adatkezelés (G25, G26, a G23 képleírás-pontja) — bizonyítékok

### Community 63 - "(panel)/page.tsx"
Cohesion: 0.20
Nodes (21): sendTestEmail(), EnvRow(), envSet(), StatusPanel(), adminUserRequired(), apiBase(), CONFIRM, contactRecipient() (+13 more)

### Community 64 - "p3-auth.mjs"
Cohesion: 0.22
Nodes (6): ROOT, b64url(), cleanups, expectLoginRedirect(), loc(), signToken()

### Community 65 - "p3-admin-ux.mjs"
Cohesion: 0.21
Nodes (8): BASE, cleanups, L(), PHOTOS, readSite(), seedFixtures(), TAG, writeSite()

### Community 66 - "ratelimit.ts"
Cohesion: 0.24
Nodes (16): clientIp(), Entry, evaluate(), hit(), HitResult, ipKey(), limitByIp(), LimitRow (+8 more)

### Community 67 - "p2-uploads.mjs"
Cohesion: 0.20
Nodes (6): chromeExe, freePort(), BASE, cleanups, pdfFixture(), sha()

### Community 68 - "Javítókör (2026-09-14 este) — a független átvevő 13 hiánya"
Cohesion: 0.40
Nodes (4): G27 a teljes kapusorban (Lighthouse 13 mobil; csak az ebben a futásban írt fájlok), Javítókör (2026-09-14 este) — a független átvevő 13 hiánya, Mit futtattam, mit mértem (a teljes kapusor előtt, célzottan), Nem teljesülő kapuk

### Community 69 - "actions.ts"
Cohesion: 0.27
Nodes (34): b(), back(), deleteEvent(), deleteMessage(), deleteRegistration(), deleteReport(), deleteRoute(), deleteUpload() (+26 more)

### Community 70 - "jelentkezesek/page.tsx"
Cohesion: 0.36
Nodes (8): persons(), RegistrationsAdmin(), RegTable(), MessagesAdmin(), maybeRunMaintenance(), listMessages(), formatDateTime(), Registration

### Community 71 - "p1-data.mjs"
Cohesion: 0.16
Nodes (17): cleanups, log(), lostUpdateControl(), migration(), PAGE_KEYS, parallelSaves(), RUN, submissions() (+9 more)

### Community 72 - "Ellenőrzés fázis — teljes kapusor helyben, a G28 előkészítése"
Cohesion: 0.25
Nodes (7): 1. Kiinduló állapot, 2. Kódváltozások ebben a fázisban, 3. final-live.mjs (G28) helyi próbája, 4. Teljes kapusor, 5. Az éles tár mellékhatása (G13), 6. Élesítés — fő munkamenet (2026-09-14 este), Ellenőrzés fázis — teljes kapusor helyben, a G28 előkészítése

### Community 73 - "_p1-harness.mjs"
Cohesion: 0.24
Nodes (12): COLUMNS, fail(), fromRow(), HOP, killPort(), sleep(), startNext(), startSupabase() (+4 more)

### Community 74 - "t"
Cohesion: 0.34
Nodes (12): PagesAdmin(), EventCard(), buildLlms(), events(), facts(), links(), para(), texts() (+4 more)

### Community 75 - "supabase-live.mjs"
Cohesion: 0.14
Nodes (9): BASE, basic, fileEnv, KEY, PASS, problems, ROOT, SB (+1 more)

### Community 76 - "deploy.mjs"
Cohesion: 0.17
Nodes (9): FUNC_DIR, held, j, leaked, out, PROD, ROOT, SECRET_FILES (+1 more)

### Community 77 - "supabase-local.mjs"
Cohesion: 0.29
Nodes (10): API_URL, BUCKETS, containerEnv(), ensureLocalSupabase(), ROOT, run(), running(), syncWorkdir() (+2 more)

### Community 78 - "store.ts"
Cohesion: 0.11
Nodes (21): dataDir(), Imprint, LEGACY_EXAMPLE_EVENTS, LEGACY_PRIVACY_SHA256, legacyHash(), Legal, LOCALES, migrateLegacyContent() (+13 more)

### Community 79 - "SubPage.tsx"
Cohesion: 0.11
Nodes (19): Home(), Params, revalidate, menuPhoto(), ContactDock(), ContactForm(), Footer(), I (+11 more)

### Community 80 - "20260914200000_adatreteg.sql"
Cohesion: 0.29
Nodes (6): public.backups, public.kv, public.messages, public.rate_limits, public.registrations, public.site_content

### Community 81 - "auth-actions.ts"
Cohesion: 0.26
Nodes (10): lockedMessage(), login(), LoginState, logout(), minutesLeft(), LoginForm(), LOCKED_MESSAGE, secureCookieFor() (+2 more)

### Community 82 - "proxy.ts"
Cohesion: 0.36
Nodes (8): LOGIN_PATH, isBot(), negotiate(), preferredLang(), Tag, tags(), config, proxy()

### Community 83 - "(panel)/layout.tsx"
Cohesion: 0.32
Nodes (4): AdminNav(), ITEMS, Flash(), dynamic

### Community 84 - "route.tsx"
Cohesion: 0.32
Nodes (7): backdrop(), FONT, FULL, GET(), titleSize(), OG_SIZE, SITE_NAME

### Community 85 - "Supabase-átállás — 2026-09-14 este"
Cohesion: 0.29
Nodes (6): 1. Beállítások, 2. Supabase-projekt, 3. Kód, 4. Helyi ellenőrzés (helyi Supabase, nem az éles projekt), 5. Élesítés — a megbízó SQL-futtatására vár, Supabase-átállás — 2026-09-14 este

### Community 86 - "requireAdmin"
Cohesion: 0.38
Nodes (5): dynamic, GET(), dynamic, POST(), requireAdmin()

## Knowledge Gaps
- **496 isolated node(s):** `eslintConfig`, `config`, `LEGACY`, `nextConfig`, `name` (+491 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `revalidateSite()` connect `revalidateSite` to `p3-admin-ux.mjs`, `p7-speed.mjs`, `qa-flow.mjs`, `p4-privacy.mjs`, `p6-seo.mjs`, `shots.mjs`, `p4-public.mjs`, `db-demo.mjs`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Why does `readSite()` connect `readSite` to `supabaseActive`, `records.ts`, `[lang]/esemenyek/page.tsx`, `ratelimit.ts`, `seo.ts`, `jelentkezesek/page.tsx`, `admin-auth.ts`, `t`, `store.ts`, `SubPage.tsx`, `(panel)/layout.tsx`, `route.tsx`, `maintenance.ts`, `isLang`, `(panel)/page.tsx`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `ensureLocalSupabase()` connect `supabase-local.mjs` to `_p1-harness.mjs`, `p5-reviews.mjs`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `config`, `LEGACY` to the rest of the system?**
  _496 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `supabaseActive` be split into smaller, more focused modules?**
  _Cohesion score 0.06778711484593837 - nodes in this community are weakly interconnected._
- **Should `p7-speed.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._