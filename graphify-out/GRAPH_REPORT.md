# Graph Report - gyurusi-menes  (2026-09-14)

## Corpus Check
- 114 files · ~293,638 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 710 nodes · 1757 edges · 45 communities (35 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ab45cc03`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- blobsAvailable
- store.ts
- compilerOptions
- actions.ts
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
- ImageUpload.tsx
- P1 — Adatréteg és megbízhatóság (G16, G17) — bizonyítékok
- Gyűrűsi Ménes — átnézés a megbízó szempontjai szerint (2026-09-13)
- paths.ts
- r9-google-policy.md
- [lang]/page.tsx

## God Nodes (most connected - your core abstractions)
1. `readSite()` - 51 edges
2. `t()` - 36 edges
3. `langPath()` - 33 edges
4. `isLang()` - 32 edges
5. `blobsAvailable()` - 31 edges
6. `writeSite()` - 27 edges
7. `getDict()` - 24 edges
8. `resolveImage()` - 19 edges
9. `POST()` - 18 edges
10. `Lang` - 17 edges

## Surprising Connections (you probably didn't know these)
- `dailyMaintenance()` --calls--> `runMaintenance()`  [EXTRACTED]
  netlify/functions/daily-maintenance.mts → src/lib/maintenance.ts
- `LegalAdmin()` --calls--> `readSite()`  [EXTRACTED]
  src/app/[lang]/admin/jogi/page.tsx → src/lib/store.ts
- `RootLayout()` --calls--> `isLang()`  [EXTRACTED]
  src/app/[lang]/layout.tsx → src/content/types.ts
- `dir()` --calls--> `dataDir()`  [EXTRACTED]
  src/lib/files.ts → src/lib/store.ts
- `noisyJpeg()` --calls--> `CheckError`  [EXTRACTED]
  scripts/checks/p2-uploads.mjs → scripts/checks/_p1-harness.mjs

## Import Cycles
- None detected.

## Communities (45 total, 10 thin omitted)

### Community 0 - "blobsAvailable"
Cohesion: 0.13
Nodes (40): dynamic, POST(), dynamic, POST(), dynamic, FORMATS, POST(), TYPES (+32 more)

### Community 1 - "store.ts"
Cohesion: 0.05
Nodes (75): AdminNav(), ITEMS, EventsAdmin(), Flash(), PickerImage, Thumb(), persons(), RegistrationsAdmin() (+67 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 3 - "actions.ts"
Cohesion: 0.15
Nodes (34): b(), back(), deleteEvent(), deleteMessage(), deleteRegistration(), deleteReport(), deleteUpload(), errMsg() (+26 more)

### Community 4 - "devDependencies"
Cohesion: 0.04
Nodes (44): eslint, eslint-config-next, gsap, @netlify/blobs, @netlify/plugin-nextjs, next, dependencies, gsap (+36 more)

### Community 5 - "Gyűrűsi Ménes — online kutatási jelentés"
Cohesion: 0.06
Nodes (31): 0. Összefoglaló, egy bekezdésben, 10.1 huculosveny.gyurusimenes.hu [ÉLŐ, letöltve 2026-08-30], 10.2 gyurusimenes.hu [ARCHÍV 2024-07-18; ma 403], 10.3 gidrangyurus.hu (régi, 2018–2022) [ARCHÍV], 10. A jelenlegi weboldal(ak) menüszerkezete és szövegei — SZÓ SZERINT, 11. Képek témái a régi/mostani oldalakon, 12. Nem igazolt / nem található (összefoglaló lista), 13. Ellentmondások (+23 more)

### Community 6 - "SubPage.tsx"
Cohesion: 0.15
Nodes (14): Footer(), I, tel(), Fact, Related, tel(), Ctx, Labels (+6 more)

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
Cohesion: 0.20
Nodes (9): Adatszerkezet, karbantartás, mentés, Ami szándékosan nincs benne, Ellenőrzés, Feltöltések (képek, PDF-beszámolók), Gyűrűsi Ménes — weboldal + admin (demó), Helyi adatbázis és tesztelés, Indítás, Mi hol van (+1 more)

### Community 13 - "types.ts"
Cohesion: 0.31
Nodes (7): State, State, de, en, hu, Dictionary, Lang

### Community 17 - "admin-flow.mjs"
Cohesion: 0.43
Nodes (6): BASE, errors, fail(), fetchText(), go(), purge()

### Community 18 - "shots.mjs"
Cohesion: 0.50
Nodes (3): exe, pages, report

### Community 27 - "register/route.ts"
Cohesion: 0.16
Nodes (22): POST(), POST(), CONFIRM, Result, send(), sendContactMail(), sendRegistrationConfirmation(), sendRegistrationMail() (+14 more)

### Community 28 - "sharp-linux.mjs"
Cohesion: 0.33
Nodes (4): PKGS, ROOT, sharpPkg, SIDE

### Community 29 - "with-server.mjs"
Cohesion: 0.40
Nodes (4): [cmd, ...args], ROOT, run, srv

### Community 31 - "langPath"
Cohesion: 0.23
Nodes (19): generateMetadata(), P, PrivacyPage(), generateMetadata(), P, generateMetadata(), ImprintPage(), P (+11 more)

### Community 32 - "records.ts"
Cohesion: 0.07
Nodes (59): config, dailyMaintenance(), dynamic, GET(), dynamic, POST(), decodeBase64Utf8(), requireAdmin() (+51 more)

### Community 33 - "p1-maintenance.mjs"
Cohesion: 0.09
Nodes (43): cleanups, initialDoc(), log(), lostUpdateControl(), migration(), PAGE_KEYS, parallelSaves(), RUN (+35 more)

### Community 34 - "proxy.ts"
Cohesion: 0.48
Nodes (5): DEFAULT_LANG, isBot(), negotiate(), config, proxy()

### Community 35 - "[slug]/page.tsx"
Cohesion: 0.29
Nodes (6): P, Reveal(), CONTOURS, FORESTS, RouteMap(), ROUTES

### Community 36 - "qa-flow.mjs"
Cohesion: 0.20
Nodes (6): BASE, DB, errors, fail(), go(), ROOT

### Community 37 - "[lang]/layout.tsx"
Cohesion: 0.25
Nodes (6): fraunces, instrument, Params, RootLayout(), ScrollTop(), DICTS

### Community 38 - "ImageUpload.tsx"
Cohesion: 0.10
Nodes (41): ATTEMPTS, decode(), Decoded, heicMessage(), ImageUpload(), start(), isHeic(), prepareImage() (+33 more)

### Community 39 - "P1 — Adatréteg és megbízhatóság (G16, G17) — bizonyítékok"
Cohesion: 0.29
Nodes (6): Amit ez a fázis NEM bizonyít, Futtatott parancsok és eredményük, Hogyan mér a két kapu (és miért bízhatunk benne), Menet közben talált és javított hibák (a tesztkeretben), Mit oldottunk meg (mért hibák → mérés), P1 — Adatréteg és megbízhatóság (G16, G17) — bizonyítékok

### Community 40 - "Gyűrűsi Ménes — átnézés a megbízó szempontjai szerint (2026-09-13)"
Cohesion: 0.29
Nodes (6): Csiszolás és üzleti, Fontos, Gyűrűsi Ménes — átnézés a megbízó szempontjai szerint (2026-09-13), Kritikus, Rendben (mérve), Ütközés-ellenőrzés az ügyfél kéréseivel (C01–C15)

### Community 41 - "paths.ts"
Cohesion: 0.19
Nodes (11): sitemap(), Photo(), PhotoKey, PHOTOS, KEYS, LangSwitch(), remember(), LANGS (+3 more)

### Community 43 - "[lang]/page.tsx"
Cohesion: 0.22
Nodes (6): Params, revalidate, ContactDock(), ContactForm(), Header(), Sheen()

## Knowledge Gaps
- **226 isolated node(s):** `eslintConfig`, `config`, `nextConfig`, `name`, `version` (+221 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `readSite()` connect `store.ts` to `records.ts`, `blobsAvailable`, `actions.ts`, `[slug]/page.tsx`, `paths.ts`, `[lang]/page.tsx`, `register/route.ts`, `langPath`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `blobsAvailable()` connect `blobsAvailable` to `records.ts`, `store.ts`, `register/route.ts`, `actions.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `isLang()` connect `langPath` to `store.ts`, `proxy.ts`, `[slug]/page.tsx`, `[lang]/layout.tsx`, `[lang]/page.tsx`, `types.ts`, `register/route.ts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `config`, `nextConfig` to the rest of the system?**
  _226 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `blobsAvailable` be split into smaller, more focused modules?**
  _Cohesion score 0.1332099907493062 - nodes in this community are weakly interconnected._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.050042955326460484 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._