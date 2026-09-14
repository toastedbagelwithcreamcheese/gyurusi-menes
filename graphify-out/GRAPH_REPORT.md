# Graph Report - gyurusi-menes  (2026-09-14)

## Corpus Check
- 155 files · ~344,938 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1162 nodes · 2841 edges · 64 communities (51 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `01bf729a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- blobsAvailable
- Sections.tsx
- compilerOptions
- store.ts
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
- t
- p6-geo.mjs
- admin-auth.ts
- sharp-linux.mjs
- with-server.mjs
- db-reset.mjs
- readSite
- records.ts
- p1-maintenance.mjs
- HeroIntro.tsx
- google-reviews.ts
- qa-flow.mjs
- seo.ts
- P2 — Valós méretű feltöltések (G18) — bizonyítékok
- P1 — Adatréteg és megbízhatóság (G16, G17) — bizonyítékok
- Gyűrűsi Ménes — átnézés a megbízó szempontjai szerint (2026-09-13)
- admin/layout.tsx
- r9-google-policy.md
- p4-privacy.mjs
- p3-auth.mjs
- p6-seo.mjs
- p6-lib.mjs
- make-icons.mjs
- P3 — Admin: belépés és egyszerű használat (G19, G20) — bizonyítékok
- P5 — Integrációk szimulációval (e-mail, Google-értékelések) — bizonyítékok
- P6 — SEO és GEO: bizonyítékok (2026-09-14)
- p6-lighthouse.mjs
- Egyesítés — P5 (feat/p5-integraciok) és P6 (feat/p6-seo-geo) a main-be: bizonyítékok (2026-09-14)
- og-font.py
- p3-admin-ux.mjs
- p2-uploads.mjs
- p1-data.mjs
- [lang]/layout.tsx
- db-demo.mjs
- P4 — Nyilvános javítások és adatkezelés (G25, G26, a G23 képleírás-pontja) — bizonyítékok
- robots.ts
- startNext

## God Nodes (most connected - your core abstractions)
1. `readSite()` - 65 edges
2. `t()` - 45 edges
3. `isLang()` - 40 edges
4. `langPath()` - 39 edges
5. `writeSite()` - 34 edges
6. `blobsAvailable()` - 33 edges
7. `getDict()` - 29 edges
8. `resolveImage()` - 28 edges
9. `guard()` - 24 edges
10. `Lang` - 24 edges

## Surprising Connections (you probably didn't know these)
- `dailyMaintenance()` --calls--> `runMaintenance()`  [EXTRACTED]
  netlify/functions/daily-maintenance.mts → src/lib/maintenance.ts
- `LegalAdmin()` --calls--> `readSite()`  [EXTRACTED]
  src/app/[lang]/admin/(panel)/jogi/page.tsx → src/lib/store.ts
- `generateStaticParams()` --calls--> `readSite()`  [EXTRACTED]
  src/app/[lang]/esemenyek/[id]/page.tsx → src/lib/store.ts
- `RootLayout()` --calls--> `isLang()`  [EXTRACTED]
  src/app/[lang]/layout.tsx → src/content/types.ts
- `until()` --calls--> `sleep()`  [EXTRACTED]
  scripts/checks/p3-admin-ux.mjs → scripts/checks/_p1-harness.mjs

## Import Cycles
- None detected.

## Communities (64 total, 13 thin omitted)

### Community 0 - "blobsAvailable"
Cohesion: 0.07
Nodes (78): dynamic, POST(), dynamic, POST(), dynamic, FORMATS, POST(), TYPES (+70 more)

### Community 1 - "Sections.tsx"
Cohesion: 0.11
Nodes (25): EventPage(), generateStaticParams(), P, Params, HeroParallax(), Labels, MapEmbed(), ContactBlock() (+17 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 3 - "store.ts"
Cohesion: 0.07
Nodes (81): b(), back(), deleteEvent(), deleteMessage(), deleteRegistration(), deleteReport(), deleteRoute(), deleteUpload() (+73 more)

### Community 4 - "devDependencies"
Cohesion: 0.04
Nodes (45): eslint, eslint-config-next, gsap, @netlify/blobs, @netlify/plugin-nextjs, next, dependencies, gsap (+37 more)

### Community 5 - "Gyűrűsi Ménes — online kutatási jelentés"
Cohesion: 0.06
Nodes (32): 0. Összefoglaló, egy bekezdésben, 10.1 huculosveny.gyurusimenes.hu [ÉLŐ, letöltve 2026-08-30], 10.2 gyurusimenes.hu [ARCHÍV 2024-07-18; ma 403], 10.3 gidrangyurus.hu (régi, 2018–2022) [ARCHÍV], 10. A jelenlegi weboldal(ak) menüszerkezete és szövegei — SZÓ SZERINT, 11. Képek témái a régi/mostani oldalakon, 12. Nem igazolt / nem található (összefoglaló lista), 13. Ellentmondások (+24 more)

### Community 6 - "SubPage.tsx"
Cohesion: 0.10
Nodes (22): ImagesAdmin(), Photo(), photoAlt(), PhotoKey, PhotoMeta, PHOTOS, ContactDock(), Paragraphs() (+14 more)

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
Cohesion: 0.15
Nodes (12): Adatszerkezet, karbantartás, mentés, Admin: belépés és használat, Ami szándékosan nincs benne, Ellenőrzés, Feltöltések (képek, PDF-beszámolók), Gyűrűsi Ménes — weboldal + admin (demó), Helyi adatbázis és tesztelés, Indítás (+4 more)

### Community 13 - "types.ts"
Cohesion: 0.10
Nodes (29): generateMetadata(), revalidate, sitemap(), ContactForm(), State, Footer(), I, tel() (+21 more)

### Community 17 - "admin-flow.mjs"
Cohesion: 0.33
Nodes (8): BASE, confirmDelete(), errors, fail(), fetchText(), go(), login(), purge()

### Community 18 - "shots.mjs"
Cohesion: 0.50
Nodes (3): exe, pages, report

### Community 19 - "p4-public.mjs"
Cohesion: 0.09
Nodes (13): BAND, BASE, DB, LANGS, oldSeed, pageErrors, PAGES, problems (+5 more)

### Community 24 - "t"
Cohesion: 0.17
Nodes (21): PagesAdmin(), GET(), revalidate, GET(), revalidate, buildLlms(), events(), facts() (+13 more)

### Community 25 - "p6-geo.mjs"
Cohesion: 0.08
Nodes (29): ADDRESSES, apple, at(), bad(), BOTS, calendarLinks, checkGraph(), composeAddress() (+21 more)

### Community 27 - "admin-auth.ts"
Cohesion: 0.05
Nodes (74): POST(), lockedMessage(), login(), LoginState, logout(), minutesLeft(), LoginForm(), LoginPage() (+66 more)

### Community 28 - "sharp-linux.mjs"
Cohesion: 0.33
Nodes (4): PKGS, ROOT, sharpPkg, SIDE

### Community 29 - "with-server.mjs"
Cohesion: 0.40
Nodes (4): [cmd, ...args], ROOT, run, srv

### Community 31 - "readSite"
Cohesion: 0.12
Nodes (34): POST(), generateMetadata(), P, PrivacyPage(), PageEdit(), generateMetadata(), generateMetadata(), generateMetadata() (+26 more)

### Community 32 - "records.ts"
Cohesion: 0.06
Nodes (72): config, dailyMaintenance(), dynamic, GET(), dynamic, POST(), persons(), RegistrationsAdmin() (+64 more)

### Community 33 - "p1-maintenance.mjs"
Cohesion: 0.18
Nodes (17): initialDoc(), budapestDay(), dayOffset(), fileAdapter(), fixtureEvent(), minusDays(), readSeed(), runTsModule() (+9 more)

### Community 34 - "HeroIntro.tsx"
Cohesion: 0.67
Nodes (3): gradient(), HeroIntro(), SWEEP

### Community 35 - "google-reviews.ts"
Cohesion: 0.08
Nodes (27): dynamic, GET(), HEADERS, Labels, Reviews(), State, apiBase(), Counter (+19 more)

### Community 36 - "qa-flow.mjs"
Cohesion: 0.20
Nodes (6): BASE, DB, errors, fail(), go(), ROOT

### Community 37 - "seo.ts"
Cohesion: 0.12
Nodes (28): EventsPage(), P, backdrop(), FONT, FULL, GET(), titleSize(), EventsHome() (+20 more)

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
Nodes (15): BACK, bad(), base, checkRequired(), DAY_WORDS, decode(), LP, MSG (+7 more)

### Community 45 - "p3-auth.mjs"
Cohesion: 0.17
Nodes (11): assert(), ROOT, load(), getText(), b64url(), checkPublicNoAdminLink(), cleanups, expectAdmin200() (+3 more)

### Community 47 - "p6-seo.mjs"
Cohesion: 0.11
Nodes (18): pathOf(), altIssues, altKey(), bad(), descs, fetched, groups, LEGACY (+10 more)

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

### Community 56 - "p3-admin-ux.mjs"
Cohesion: 0.17
Nodes (12): sleep(), startBlobs(), tmpDir(), BASE, cleanups, L(), PHOTOS, readSite() (+4 more)

### Community 57 - "p2-uploads.mjs"
Cohesion: 0.16
Nodes (9): parallelSaves(), CheckError, chromeExe, dbReset(), BASE, cleanups, noisyJpeg(), pdfFixture() (+1 more)

### Community 58 - "p1-data.mjs"
Cohesion: 0.27
Nodes (9): cleanups, log(), lostUpdateControl(), migration(), PAGE_KEYS, RUN, submissions(), blobsAdapter() (+1 more)

### Community 59 - "[lang]/layout.tsx"
Cohesion: 0.22
Nodes (7): fraunces, generateMetadata(), instrument, Params, RootLayout(), ScrollTop(), SITE_URL

### Community 60 - "db-demo.mjs"
Cohesion: 0.39
Nodes (7): addDays(), DB, DEMO_EVENT_IDS, demoEvents(), nextWeekday(), ROOT, ymd()

### Community 61 - "P4 — Nyilvános javítások és adatkezelés (G25, G26, a G23 képleírás-pontja) — bizonyítékok"
Cohesion: 0.50
Nodes (3): A tájékoztató ígéretei és a kód, Mi készült, P4 — Nyilvános javítások és adatkezelés (G25, G26, a G23 képleírás-pontja) — bizonyítékok

### Community 63 - "startNext"
Cohesion: 0.67
Nodes (3): fail(), killPort(), startNext()

## Knowledge Gaps
- **377 isolated node(s):** `eslintConfig`, `config`, `LEGACY`, `nextConfig`, `name` (+372 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `readSite()` connect `readSite` to `records.ts`, `Sections.tsx`, `blobsAvailable`, `store.ts`, `seo.ts`, `SubPage.tsx`, `types.ts`, `t`, `admin-auth.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `blobsAvailable()` connect `blobsAvailable` to `records.ts`, `google-reviews.ts`, `store.ts`, `admin-auth.ts`, `readSite`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `isLang()` connect `readSite` to `Sections.tsx`, `google-reviews.ts`, `seo.ts`, `[lang]/layout.tsx`, `types.ts`, `admin-auth.ts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `config`, `LEGACY` to the rest of the system?**
  _377 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `blobsAvailable` be split into smaller, more focused modules?**
  _Cohesion score 0.06537282941777324 - nodes in this community are weakly interconnected._
- **Should `Sections.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10695187165775401 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._