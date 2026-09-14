# Graph Report - gyurusi-menes  (2026-09-14)

## Corpus Check
- 150 files · ~329,642 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1075 nodes · 2710 edges · 54 communities (42 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f5a3bccc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- blobsAvailable
- Sections.tsx
- compilerOptions
- store.ts
- devDependencies
- Gyűrűsi Ménes — online kutatási jelentés
- [slug]/page.tsx
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
- formatRange
- AGENTS.md
- CLAUDE.md
- GATES-2026-08-30.md
- GATES.md
- langPath
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
- p6-seo.mjs
- p6-lib.mjs
- make-icons.mjs
- P3 — Admin: belépés és egyszerű használat (G19, G20) — bizonyítékok
- Kapuk
- P6 — SEO és GEO: bizonyítékok (2026-09-14)
- p6-lighthouse.mjs
- Egyesítés — P5 (feat/p5-integraciok) és P6 (feat/p6-seo-geo) a main-be: bizonyítékok (2026-09-14)
- og-font.py

## God Nodes (most connected - your core abstractions)
1. `readSite()` - 65 edges
2. `t()` - 45 edges
3. `isLang()` - 40 edges
4. `langPath()` - 34 edges
5. `writeSite()` - 34 edges
6. `blobsAvailable()` - 33 edges
7. `getDict()` - 27 edges
8. `resolveImage()` - 27 edges
9. `guard()` - 24 edges
10. `s()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `dailyMaintenance()` --calls--> `runMaintenance()`  [EXTRACTED]
  netlify/functions/daily-maintenance.mts → src/lib/maintenance.ts
- `LegalAdmin()` --calls--> `readSite()`  [EXTRACTED]
  src/app/[lang]/admin/(panel)/jogi/page.tsx → src/lib/store.ts
- `RootLayout()` --calls--> `isLang()`  [EXTRACTED]
  src/app/[lang]/layout.tsx → src/content/types.ts
- `until()` --calls--> `sleep()`  [EXTRACTED]
  scripts/checks/p3-admin-ux.mjs → scripts/checks/_p1-harness.mjs
- `noisyJpeg()` --calls--> `CheckError`  [EXTRACTED]
  scripts/checks/p2-uploads.mjs → scripts/checks/_p1-harness.mjs

## Import Cycles
- None detected.

## Communities (54 total, 12 thin omitted)

### Community 0 - "blobsAvailable"
Cohesion: 0.06
Nodes (80): dynamic, POST(), dynamic, POST(), dynamic, FORMATS, POST(), TYPES (+72 more)

### Community 1 - "Sections.tsx"
Cohesion: 0.10
Nodes (26): PagesAdmin(), Params, ContactDock(), ContactForm(), Header(), HeroParallax(), Labels, MapEmbed() (+18 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 3 - "store.ts"
Cohesion: 0.07
Nodes (76): b(), back(), deleteEvent(), deleteMessage(), deleteRegistration(), deleteReport(), deleteRoute(), deleteUpload() (+68 more)

### Community 4 - "devDependencies"
Cohesion: 0.04
Nodes (44): eslint, eslint-config-next, gsap, @netlify/blobs, @netlify/plugin-nextjs, next, dependencies, gsap (+36 more)

### Community 5 - "Gyűrűsi Ménes — online kutatási jelentés"
Cohesion: 0.06
Nodes (31): 0. Összefoglaló, egy bekezdésben, 10.1 huculosveny.gyurusimenes.hu [ÉLŐ, letöltve 2026-08-30], 10.2 gyurusimenes.hu [ARCHÍV 2024-07-18; ma 403], 10.3 gidrangyurus.hu (régi, 2018–2022) [ARCHÍV], 10. A jelenlegi weboldal(ak) menüszerkezete és szövegei — SZÓ SZERINT, 11. Képek témái a régi/mostani oldalakon, 12. Nem igazolt / nem található (összefoglaló lista), 13. Ellentmondások (+23 more)

### Community 6 - "[slug]/page.tsx"
Cohesion: 0.09
Nodes (27): fmtSize(), P, Photo(), PhotoKey, PHOTOS, Reveal(), Footer(), I (+19 more)

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
Cohesion: 0.17
Nodes (11): Adatszerkezet, karbantartás, mentés, Admin: belépés és használat, Ami szándékosan nincs benne, Ellenőrzés, Feltöltések (képek, PDF-beszámolók), Gyűrűsi Ménes — weboldal + admin (demó), Helyi adatbázis és tesztelés, Indítás (+3 more)

### Community 13 - "types.ts"
Cohesion: 0.12
Nodes (22): State, KEYS, LangSwitch(), remember(), NotFoundBody(), RegistrationForm(), State, de (+14 more)

### Community 17 - "admin-flow.mjs"
Cohesion: 0.33
Nodes (8): BASE, confirmDelete(), errors, fail(), fetchText(), go(), login(), purge()

### Community 18 - "shots.mjs"
Cohesion: 0.50
Nodes (3): exe, pages, report

### Community 19 - "formatRange"
Cohesion: 0.25
Nodes (15): POST(), EventsAdmin(), RegistrationsAdmin(), AdminLayout(), AdminHome(), EventsHome(), addRegistration(), listRegistrations() (+7 more)

### Community 24 - "langPath"
Cohesion: 0.20
Nodes (19): GET(), revalidate, GET(), revalidate, revalidate, sitemap(), buildLlms(), events() (+11 more)

### Community 25 - "p6-geo.mjs"
Cohesion: 0.08
Nodes (29): ADDRESSES, apple, at(), bad(), BOTS, calendarLinks, checkGraph(), composeAddress() (+21 more)

### Community 27 - "admin-auth.ts"
Cohesion: 0.06
Nodes (63): POST(), lockedMessage(), login(), LoginState, logout(), minutesLeft(), LoginForm(), LoginPage() (+55 more)

### Community 28 - "sharp-linux.mjs"
Cohesion: 0.33
Nodes (4): PKGS, ROOT, sharpPkg, SIDE

### Community 29 - "with-server.mjs"
Cohesion: 0.40
Nodes (4): [cmd, ...args], ROOT, run, srv

### Community 31 - "readSite"
Cohesion: 0.15
Nodes (33): generateMetadata(), P, PrivacyPage(), EventPage(), generateMetadata(), generateStaticParams(), P, EventsPage() (+25 more)

### Community 32 - "records.ts"
Cohesion: 0.07
Nodes (64): config, dailyMaintenance(), dynamic, GET(), dynamic, POST(), persons(), RegTable() (+56 more)

### Community 33 - "p1-maintenance.mjs"
Cohesion: 0.06
Nodes (61): cleanups, initialDoc(), log(), lostUpdateControl(), migration(), PAGE_KEYS, parallelSaves(), RUN (+53 more)

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
Cohesion: 0.08
Nodes (32): PageEdit(), fraunces, instrument, Params, RootLayout(), backdrop(), FONT, FULL (+24 more)

### Community 38 - "P2 — Valós méretű feltöltések (G18) — bizonyítékok"
Cohesion: 0.25
Nodes (7): A régi kapuk (a változtatások után, friss builddel), Amit nem mértem (és miért), G18 — a kapu futása, Korlátok és forrásuk, Mért hiba → megoldás, P2 — Valós méretű feltöltések (G18) — bizonyítékok, Újraellenőrzés a main HEAD-en (c79f1ad — a P3, P5, P6 egyesítése után)

### Community 39 - "P1 — Adatréteg és megbízhatóság (G16, G17) — bizonyítékok"
Cohesion: 0.29
Nodes (6): Amit ez a fázis NEM bizonyít, Futtatott parancsok és eredményük, Hogyan mér a két kapu (és miért bízhatunk benne), Menet közben talált és javított hibák (a tesztkeretben), Mit oldottunk meg (mért hibák → mérés), P1 — Adatréteg és megbízhatóság (G16, G17) — bizonyítékok

### Community 40 - "Gyűrűsi Ménes — átnézés a megbízó szempontjai szerint (2026-09-13)"
Cohesion: 0.29
Nodes (6): Csiszolás és üzleti, Fontos, Gyűrűsi Ménes — átnézés a megbízó szempontjai szerint (2026-09-13), Kritikus, Rendben (mérve), Ütközés-ellenőrzés az ügyfél kéréseivel (C01–C15)

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
Cohesion: 0.25
Nodes (7): A negatív állítások kontrolljai, Ismert korlátok (szándékosan így), Kapu-futások, Menet közben talált hiba: az admin szerver-akciói megkerülhették a proxyt, Mi készült, P3 — Admin: belépés és egyszerű használat (G19, G20) — bizonyítékok, Vizuális ellenőrzés (nem kapu)

### Community 51 - "Kapuk"
Cohesion: 0.25
Nodes (7): A próbák el tudnak bukni (mutációs kontroll, utána a fájlok bájtra visszaállítva), Egyéb futtatott ellenőrzések (a végleges forráson), G21 — mért lépések (utolsó futás), G22 — mért lépések (utolsó futás), Kapuk, Megjegyzések, P5 — Integrációk szimulációval (e-mail, Google-értékelések) — bizonyítékok

### Community 52 - "P6 — SEO és GEO: bizonyítékok (2026-09-14)"
Cohesion: 0.29
Nodes (6): Előállított eszközök, Kapuk, Közben talált és javított hibák, Mit mér a két kapuszkript, P6 — SEO és GEO: bizonyítékok (2026-09-14), Régi kapuk és ellenőrzések (a végső kóddal)

### Community 53 - "p6-lighthouse.mjs"
Cohesion: 0.33
Nodes (5): BASE, report(), ROOT, lines, problems

### Community 54 - "Egyesítés — P5 (feat/p5-integraciok) és P6 (feat/p6-seo-geo) a main-be: bizonyítékok (2026-09-14)"
Cohesion: 0.40
Nodes (4): Egyesítés — P5 (feat/p5-integraciok) és P6 (feat/p6-seo-geo) a main-be: bizonyítékok (2026-09-14), Egyesítés utáni integrációs hibák (javítva), Futtatott ellenőrzések (a végső kóddal), Ütközések és feloldásuk

## Knowledge Gaps
- **336 isolated node(s):** `eslintConfig`, `config`, `LEGACY`, `nextConfig`, `name` (+331 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `readSite()` connect `readSite` to `records.ts`, `Sections.tsx`, `blobsAvailable`, `store.ts`, `seo.ts`, `[slug]/page.tsx`, `formatRange`, `langPath`, `admin-auth.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `blobsAvailable()` connect `blobsAvailable` to `records.ts`, `google-reviews.ts`, `store.ts`, `admin-auth.ts`, `readSite`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `t()` connect `Sections.tsx` to `records.ts`, `store.ts`, `seo.ts`, `[slug]/page.tsx`, `formatRange`, `langPath`, `admin-auth.ts`, `readSite`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `config`, `LEGACY` to the rest of the system?**
  _336 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `blobsAvailable` be split into smaller, more focused modules?**
  _Cohesion score 0.06373626373626373 - nodes in this community are weakly interconnected._
- **Should `Sections.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1006006006006006 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._