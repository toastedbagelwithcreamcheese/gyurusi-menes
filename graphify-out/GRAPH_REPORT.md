# Graph Report - gyurusi-menes  (2026-09-14)

## Corpus Check
- 128 files · ~308,006 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 831 nodes · 2174 edges · 47 communities (36 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2780a7d3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- upload-complete/route.ts
- Sections.tsx
- compilerOptions
- store.ts
- devDependencies
- Gyűrűsi Ménes — online kutatási jelentés
- SubPage.tsx
- prep-images.mjs
- Gyűrűsi Ménes — fotóelemzés (187 kép, 2026-08-22/23, Gyűrűs, GPS 46.888N 16.990E)
- Gyűrűsi Ménes — design rendszer
- opengraph-image.tsx
- Gyűrűsi Ménes — weboldal + admin (demó)
- verify.mjs
- types.ts
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- admin-flow.mjs
- shots.mjs
- AGENTS.md
- CLAUDE.md
- GATES-2026-08-30.md
- GATES.md
- t
- admin-auth.ts
- sharp-linux.mjs
- with-server.mjs
- db-reset.mjs
- readSite
- records.ts
- p1-maintenance.mjs
- (panel)/page.tsx
- google-reviews.ts
- qa-flow.mjs
- [lang]/layout.tsx
- P2 — Valós méretű feltöltések (G18) — bizonyítékok
- P1 — Adatréteg és megbízhatóság (G16, G17) — bizonyítékok
- Gyűrűsi Ménes — átnézés a megbízó szempontjai szerint (2026-09-13)
- admin/layout.tsx
- r9-google-policy.md
- [lang]/page.tsx
- HeroIntro.tsx

## God Nodes (most connected - your core abstractions)
1. `readSite()` - 55 edges
2. `t()` - 40 edges
3. `writeSite()` - 34 edges
4. `langPath()` - 33 edges
5. `blobsAvailable()` - 33 edges
6. `isLang()` - 32 edges
7. `guard()` - 24 edges
8. `getDict()` - 24 edges
9. `resolveImage()` - 23 edges
10. `s()` - 22 edges

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

## Communities (47 total, 11 thin omitted)

### Community 0 - "upload-complete/route.ts"
Cohesion: 0.08
Nodes (59): dynamic, POST(), dynamic, POST(), dynamic, FORMATS, POST(), TYPES (+51 more)

### Community 1 - "Sections.tsx"
Cohesion: 0.15
Nodes (16): EventsPage(), P, HeroParallax(), Labels, MapEmbed(), ContactBlock(), EventList(), EventsHome() (+8 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 3 - "store.ts"
Cohesion: 0.06
Nodes (81): b(), back(), deleteEvent(), deleteMessage(), deleteRegistration(), deleteReport(), deleteRoute(), deleteUpload() (+73 more)

### Community 4 - "devDependencies"
Cohesion: 0.04
Nodes (44): eslint, eslint-config-next, gsap, @netlify/blobs, @netlify/plugin-nextjs, next, dependencies, gsap (+36 more)

### Community 5 - "Gyűrűsi Ménes — online kutatási jelentés"
Cohesion: 0.06
Nodes (31): 0. Összefoglaló, egy bekezdésben, 10.1 huculosveny.gyurusimenes.hu [ÉLŐ, letöltve 2026-08-30], 10.2 gyurusimenes.hu [ARCHÍV 2024-07-18; ma 403], 10.3 gidrangyurus.hu (régi, 2018–2022) [ARCHÍV], 10. A jelenlegi weboldal(ak) menüszerkezete és szövegei — SZÓ SZERINT, 11. Képek témái a régi/mostani oldalakon, 12. Nem igazolt / nem található (összefoglaló lista), 13. Ellentmondások (+23 more)

### Community 6 - "SubPage.tsx"
Cohesion: 0.12
Nodes (19): ContentPage(), fmtSize(), P, Reveal(), CONTOURS, FORESTS, RouteMap(), ROUTES (+11 more)

### Community 7 - "prep-images.mjs"
Cohesion: 0.32
Nodes (6): PHOTOS, SOURCE_ROOT, force, MANIFEST, OUT, ROOT

### Community 8 - "Gyűrűsi Ménes — fotóelemzés (187 kép, 2026-08-22/23, Gyűrűs, GPS 46.888N 16.990E)"
Cohesion: 0.22
Nodes (8): Design-következtetések, Domináns vizuális világ, FEATURE-képek, GALÉRIA (egységes, 12–16 kép), Gyűrűsi Ménes — fotóelemzés (187 kép, 2026-08-22/23, Gyűrűs, GPS 46.888N 16.990E), HERO-jelöltek (1–3), Kerülendő, STORYTELLING-képek

### Community 9 - "Gyűrűsi Ménes — design rendszer"
Cohesion: 0.25
Nodes (7): Gyűrűsi Ménes — design rendszer, Irány, Motion, Színek (`src/app/globals.css` `@theme`), Tipográfia, Térköz, forma, Töréspontok

### Community 10 - "opengraph-image.tsx"
Cohesion: 0.40
Nodes (3): alt, contentType, size

### Community 11 - "Gyűrűsi Ménes — weboldal + admin (demó)"
Cohesion: 0.18
Nodes (10): Adatszerkezet, karbantartás, mentés, Admin: belépés és használat, Ami szándékosan nincs benne, Ellenőrzés, Feltöltések (képek, PDF-beszámolók), Gyűrűsi Ménes — weboldal + admin (demó), Helyi adatbázis és tesztelés, Indítás (+2 more)

### Community 13 - "types.ts"
Cohesion: 0.13
Nodes (19): POST(), Photo(), PhotoKey, PHOTOS, State, KEYS, LangSwitch(), remember() (+11 more)

### Community 17 - "admin-flow.mjs"
Cohesion: 0.33
Nodes (8): BASE, confirmDelete(), errors, fail(), fetchText(), go(), login(), purge()

### Community 18 - "shots.mjs"
Cohesion: 0.50
Nodes (3): exe, pages, report

### Community 24 - "t"
Cohesion: 0.17
Nodes (24): EventsAdmin(), RegistrationsAdmin(), PagesAdmin(), AdminHome(), EventPage(), generateStaticParams(), P, RegistrationForm() (+16 more)

### Community 27 - "admin-auth.ts"
Cohesion: 0.09
Nodes (45): lockedMessage(), login(), LoginState, logout(), minutesLeft(), LoginForm(), LoginPage(), metadata (+37 more)

### Community 28 - "sharp-linux.mjs"
Cohesion: 0.33
Nodes (4): PKGS, ROOT, sharpPkg, SIDE

### Community 29 - "with-server.mjs"
Cohesion: 0.40
Nodes (4): [cmd, ...args], ROOT, run, srv

### Community 31 - "readSite"
Cohesion: 0.25
Nodes (20): generateMetadata(), P, PrivacyPage(), generateMetadata(), generateMetadata(), generateMetadata(), ImprintPage(), P (+12 more)

### Community 32 - "records.ts"
Cohesion: 0.05
Nodes (83): config, dailyMaintenance(), dynamic, GET(), dynamic, POST(), GET(), persons() (+75 more)

### Community 33 - "p1-maintenance.mjs"
Cohesion: 0.06
Nodes (61): cleanups, initialDoc(), log(), lostUpdateControl(), migration(), PAGE_KEYS, parallelSaves(), RUN (+53 more)

### Community 34 - "(panel)/page.tsx"
Cohesion: 0.21
Nodes (18): POST(), sendTestEmail(), EnvRow(), envSet(), StatusPanel(), CONFIRM, contactRecipient(), DEFAULT_CONTACT_TO (+10 more)

### Community 35 - "google-reviews.ts"
Cohesion: 0.43
Nodes (7): cacheGet(), cacheSet(), DIR, findPlaceId(), getGoogleReviews(), GoogleReview, GoogleReviews

### Community 36 - "qa-flow.mjs"
Cohesion: 0.20
Nodes (6): BASE, DB, errors, fail(), go(), ROOT

### Community 37 - "[lang]/layout.tsx"
Cohesion: 0.25
Nodes (6): fraunces, instrument, Params, RootLayout(), ScrollTop(), DICTS

### Community 38 - "P2 — Valós méretű feltöltések (G18) — bizonyítékok"
Cohesion: 0.29
Nodes (6): A régi kapuk (a változtatások után, friss builddel), Amit nem mértem (és miért), G18 — a kapu futása, Korlátok és forrásuk, Mért hiba → megoldás, P2 — Valós méretű feltöltések (G18) — bizonyítékok

### Community 39 - "P1 — Adatréteg és megbízhatóság (G16, G17) — bizonyítékok"
Cohesion: 0.29
Nodes (6): Amit ez a fázis NEM bizonyít, Futtatott parancsok és eredményük, Hogyan mér a két kapu (és miért bízhatunk benne), Menet közben talált és javított hibák (a tesztkeretben), Mit oldottunk meg (mért hibák → mérés), P1 — Adatréteg és megbízhatóság (G16, G17) — bizonyítékok

### Community 40 - "Gyűrűsi Ménes — átnézés a megbízó szempontjai szerint (2026-09-13)"
Cohesion: 0.29
Nodes (6): Csiszolás és üzleti, Fontos, Gyűrűsi Ménes — átnézés a megbízó szempontjai szerint (2026-09-13), Kritikus, Rendben (mérve), Ütközés-ellenőrzés az ügyfél kéréseivel (C01–C15)

### Community 43 - "[lang]/page.tsx"
Cohesion: 0.14
Nodes (12): Params, revalidate, ContactDock(), ContactForm(), Footer(), I, tel(), Header() (+4 more)

### Community 45 - "HeroIntro.tsx"
Cohesion: 0.67
Nodes (3): gradient(), HeroIntro(), SWEEP

## Knowledge Gaps
- **247 isolated node(s):** `eslintConfig`, `config`, `nextConfig`, `name`, `version` (+242 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `readSite()` connect `readSite` to `records.ts`, `Sections.tsx`, `(panel)/page.tsx`, `store.ts`, `SubPage.tsx`, `[lang]/page.tsx`, `types.ts`, `t`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `blobsAvailable()` connect `records.ts` to `upload-complete/route.ts`, `google-reviews.ts`, `store.ts`, `admin-auth.ts`, `readSite`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `records.ts`, `Sections.tsx`, `(panel)/page.tsx`, `store.ts`, `SubPage.tsx`, `[lang]/page.tsx`, `readSite`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `config`, `nextConfig` to the rest of the system?**
  _247 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `upload-complete/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0845771144278607 - nodes in this community are weakly interconnected._
- **Should `Sections.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14624505928853754 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._