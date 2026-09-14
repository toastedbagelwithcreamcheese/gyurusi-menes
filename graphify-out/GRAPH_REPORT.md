# Graph Report - gyurusi-menes  (2026-09-14)

## Corpus Check
- 104 files · ~285,052 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 620 nodes · 1488 edges · 43 communities (33 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `67aaf1fd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Sections.tsx
- store.ts
- compilerOptions
- actions.ts
- devDependencies
- Gyűrűsi Ménes — online kutatási jelentés
- [lang]/page.tsx
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
- register/route.ts
- sharp-linux.mjs
- with-server.mjs
- db-reset.mjs
- langPath
- records.ts
- p1-maintenance.mjs
- proxy.ts
- [slug]/page.tsx
- qa-flow.mjs
- [lang]/layout.tsx
- google-reviews.ts
- P1 — Adatréteg és megbízhatóság (G16, G17) — bizonyítékok
- Gyűrűsi Ménes — átnézés a megbízó szempontjai szerint (2026-09-13)
- HeroIntro.tsx
- r9-google-policy.md

## God Nodes (most connected - your core abstractions)
1. `readSite()` - 51 edges
2. `t()` - 36 edges
3. `langPath()` - 33 edges
4. `isLang()` - 32 edges
5. `blobsAvailable()` - 25 edges
6. `writeSite()` - 25 edges
7. `getDict()` - 24 edges
8. `resolveImage()` - 19 edges
9. `s()` - 18 edges
10. `Lang` - 17 edges

## Surprising Connections (you probably didn't know these)
- `dailyMaintenance()` --calls--> `runMaintenance()`  [EXTRACTED]
  netlify/functions/daily-maintenance.mts → src/lib/maintenance.ts
- `RootLayout()` --calls--> `isLang()`  [EXTRACTED]
  src/app/[lang]/layout.tsx → src/content/types.ts
- `load()` --calls--> `assert()`  [EXTRACTED]
  scripts/checks/p1-maintenance.mjs → scripts/checks/_p1-harness.mjs
- `generateMetadata()` --calls--> `resolveImage()`  [EXTRACTED]
  src/app/[lang]/[slug]/page.tsx → src/lib/images.ts
- `generateMetadata()` --calls--> `isPageKey()`  [EXTRACTED]
  src/app/[lang]/[slug]/page.tsx → src/lib/store.ts

## Import Cycles
- None detected.

## Communities (43 total, 10 thin omitted)

### Community 0 - "Sections.tsx"
Cohesion: 0.16
Nodes (20): EventPage(), P, ContentPage(), HeroParallax(), Labels, MapEmbed(), ContactBlock(), EventCard() (+12 more)

### Community 1 - "store.ts"
Cohesion: 0.07
Nodes (52): AdminNav(), ITEMS, EventEdit(), EventsAdmin(), Flash(), ImagePicker(), Thumb(), persons() (+44 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 3 - "actions.ts"
Cohesion: 0.17
Nodes (36): GET(), b(), back(), deleteEvent(), deleteMessage(), deleteRegistration(), deleteReport(), deleteUpload() (+28 more)

### Community 4 - "devDependencies"
Cohesion: 0.04
Nodes (44): eslint, eslint-config-next, gsap, @netlify/blobs, @netlify/plugin-nextjs, next, dependencies, gsap (+36 more)

### Community 5 - "Gyűrűsi Ménes — online kutatási jelentés"
Cohesion: 0.06
Nodes (31): 0. Összefoglaló, egy bekezdésben, 10.1 huculosveny.gyurusimenes.hu [ÉLŐ, letöltve 2026-08-30], 10.2 gyurusimenes.hu [ARCHÍV 2024-07-18; ma 403], 10.3 gidrangyurus.hu (régi, 2018–2022) [ARCHÍV], 10. A jelenlegi weboldal(ak) menüszerkezete és szövegei — SZÓ SZERINT, 11. Képek témái a régi/mostani oldalakon, 12. Nem igazolt / nem található (összefoglaló lista), 13. Ellentmondások (+23 more)

### Community 6 - "[lang]/page.tsx"
Cohesion: 0.10
Nodes (20): Params, revalidate, ContactDock(), ContactForm(), Footer(), I, tel(), Header() (+12 more)

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
Cohesion: 0.22
Nodes (8): Adatszerkezet, karbantartás, mentés, Ami szándékosan nincs benne, Ellenőrzés, Gyűrűsi Ménes — weboldal + admin (demó), Helyi adatbázis és tesztelés, Indítás, Mi hol van, Élesítés

### Community 13 - "types.ts"
Cohesion: 0.17
Nodes (15): State, KEYS, LangSwitch(), remember(), RegistrationForm(), State, de, en (+7 more)

### Community 17 - "admin-flow.mjs"
Cohesion: 0.43
Nodes (6): BASE, errors, fail(), fetchText(), go(), purge()

### Community 18 - "shots.mjs"
Cohesion: 0.50
Nodes (3): exe, pages, report

### Community 27 - "register/route.ts"
Cohesion: 0.30
Nodes (11): POST(), POST(), CONFIRM, Result, send(), sendContactMail(), sendRegistrationConfirmation(), sendRegistrationMail() (+3 more)

### Community 28 - "sharp-linux.mjs"
Cohesion: 0.33
Nodes (4): PKGS, ROOT, sharpPkg, SIDE

### Community 29 - "with-server.mjs"
Cohesion: 0.40
Nodes (4): [cmd, ...args], ROOT, run, srv

### Community 31 - "langPath"
Cohesion: 0.22
Nodes (21): generateMetadata(), PrivacyPage(), generateMetadata(), EventsPage(), generateMetadata(), P, generateMetadata(), ImprintPage() (+13 more)

### Community 32 - "records.ts"
Cohesion: 0.07
Nodes (66): config, dailyMaintenance(), dynamic, GET(), Backup, backupDir(), BACKUPS_KEPT, backupStore() (+58 more)

### Community 33 - "p1-maintenance.mjs"
Cohesion: 0.11
Nodes (38): cleanups, initialDoc(), log(), lostUpdateControl(), migration(), PAGE_KEYS, parallelSaves(), RUN (+30 more)

### Community 34 - "proxy.ts"
Cohesion: 0.25
Nodes (9): dynamic, POST(), decodeBase64Utf8(), requireAdmin(), safeEqual(), isBot(), negotiate(), config (+1 more)

### Community 35 - "[slug]/page.tsx"
Cohesion: 0.21
Nodes (9): P, fmtSize(), P, Reveal(), CONTOURS, FORESTS, RouteMap(), ROUTES (+1 more)

### Community 36 - "qa-flow.mjs"
Cohesion: 0.20
Nodes (6): BASE, DB, errors, fail(), go(), ROOT

### Community 37 - "[lang]/layout.tsx"
Cohesion: 0.22
Nodes (7): fraunces, generateMetadata(), instrument, Params, RootLayout(), ScrollTop(), DICTS

### Community 38 - "google-reviews.ts"
Cohesion: 0.43
Nodes (7): cacheGet(), cacheSet(), DIR, findPlaceId(), getGoogleReviews(), GoogleReview, GoogleReviews

### Community 39 - "P1 — Adatréteg és megbízhatóság (G16, G17) — bizonyítékok"
Cohesion: 0.29
Nodes (6): Amit ez a fázis NEM bizonyít, Futtatott parancsok és eredményük, Hogyan mér a két kapu (és miért bízhatunk benne), Menet közben talált és javított hibák (a tesztkeretben), Mit oldottunk meg (mért hibák → mérés), P1 — Adatréteg és megbízhatóság (G16, G17) — bizonyítékok

### Community 40 - "Gyűrűsi Ménes — átnézés a megbízó szempontjai szerint (2026-09-13)"
Cohesion: 0.29
Nodes (6): Csiszolás és üzleti, Fontos, Gyűrűsi Ménes — átnézés a megbízó szempontjai szerint (2026-09-13), Kritikus, Rendben (mérve), Ütközés-ellenőrzés az ügyfél kéréseivel (C01–C15)

### Community 41 - "HeroIntro.tsx"
Cohesion: 0.67
Nodes (3): gradient(), HeroIntro(), SWEEP

## Knowledge Gaps
- **206 isolated node(s):** `eslintConfig`, `config`, `nextConfig`, `name`, `version` (+201 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `readSite()` connect `store.ts` to `Sections.tsx`, `records.ts`, `actions.ts`, `[slug]/page.tsx`, `[lang]/page.tsx`, `register/route.ts`, `langPath`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `blobsAvailable()` connect `records.ts` to `store.ts`, `actions.ts`, `google-reviews.ts`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `isLang()` connect `langPath` to `Sections.tsx`, `proxy.ts`, `[slug]/page.tsx`, `[lang]/layout.tsx`, `[lang]/page.tsx`, `types.ts`, `register/route.ts`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `config`, `nextConfig` to the rest of the system?**
  _206 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06690140845070422 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._