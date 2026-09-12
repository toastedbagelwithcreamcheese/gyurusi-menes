# Graph Report - gyurusi-menes  (2026-09-12)

## Corpus Check
- 76 files · ~257,100 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 403 nodes · 924 edges · 27 communities (19 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `61430922`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Sections.tsx
- store.ts
- compilerOptions
- actions.ts
- devDependencies
- Gyűrűsi Ménes — online kutatási jelentés
- images.ts
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

## God Nodes (most connected - your core abstractions)
1. `readSite()` - 42 edges
2. `t()` - 33 edges
3. `langPath()` - 30 edges
4. `isLang()` - 24 edges
5. `writeSite()` - 24 edges
6. `resolveImage()` - 18 edges
7. `s()` - 17 edges
8. `getDict()` - 16 edges
9. `compilerOptions` - 16 edges
10. `Gyűrűsi Ménes — online kutatási jelentés` - 16 edges

## Surprising Connections (you probably didn't know these)
- `generateMetadata()` --calls--> `isLang()`  [EXTRACTED]
  src/app/[lang]/[slug]/page.tsx → src/content/types.ts
- `generateMetadata()` --calls--> `isPageKey()`  [EXTRACTED]
  src/app/[lang]/[slug]/page.tsx → src/lib/store.ts
- `generateMetadata()` --calls--> `readSite()`  [EXTRACTED]
  src/app/[lang]/[slug]/page.tsx → src/lib/store.ts
- `generateMetadata()` --calls--> `t()`  [EXTRACTED]
  src/app/[lang]/[slug]/page.tsx → src/lib/store.ts
- `ContentPage()` --calls--> `isLang()`  [EXTRACTED]
  src/app/[lang]/[slug]/page.tsx → src/content/types.ts

## Import Cycles
- None detected.

## Communities (27 total, 8 thin omitted)

### Community 0 - "Sections.tsx"
Cohesion: 0.08
Nodes (45): generateMetadata(), EventsPage(), generateMetadata(), P, generateMetadata(), Params, fmtSize(), generateMetadata() (+37 more)

### Community 1 - "store.ts"
Cohesion: 0.09
Nodes (44): last, POST(), AdminNav(), ITEMS, EventsAdmin(), Thumb(), RegistrationsAdmin(), AdminLayout() (+36 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 3 - "actions.ts"
Cohesion: 0.14
Nodes (37): last, POST(), GET(), b(), deleteEvent(), deleteMessage(), deleteRegistration(), deleteReport() (+29 more)

### Community 4 - "devDependencies"
Cohesion: 0.05
Nodes (42): eslint, eslint-config-next, gsap, @netlify/blobs, @netlify/plugin-nextjs, next, dependencies, gsap (+34 more)

### Community 5 - "Gyűrűsi Ménes — online kutatási jelentés"
Cohesion: 0.06
Nodes (31): 0. Összefoglaló, egy bekezdésben, 10.1 huculosveny.gyurusimenes.hu [ÉLŐ, letöltve 2026-08-30], 10.2 gyurusimenes.hu [ARCHÍV 2024-07-18; ma 403], 10.3 gidrangyurus.hu (régi, 2018–2022) [ARCHÍV], 10. A jelenlegi weboldal(ak) menüszerkezete és szövegei — SZÓ SZERINT, 11. Képek témái a régi/mostani oldalakon, 12. Nem igazolt / nem található (összefoglaló lista), 13. Ellentmondások (+23 more)

### Community 6 - "images.ts"
Cohesion: 0.19
Nodes (13): EventEdit(), ImagePicker(), ImagesAdmin(), LField(), PageEdit(), ContentAdmin(), Photo(), PhotoKey (+5 more)

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
Cohesion: 0.29
Nodes (6): Ami szándékosan nincs benne, Ellenőrzés, Gyűrűsi Ménes — weboldal + admin (demó), Indítás, Mi hol van, Élesítés

### Community 13 - "types.ts"
Cohesion: 0.10
Nodes (29): fraunces, generateMetadata(), instrument, Params, RootLayout(), NotFound(), ContactForm(), State (+21 more)

### Community 17 - "admin-flow.mjs"
Cohesion: 0.47
Nodes (5): BASE, errors, fail(), fetchText(), go()

### Community 18 - "shots.mjs"
Cohesion: 0.50
Nodes (3): exe, pages, report

## Knowledge Gaps
- **143 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+138 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `readSite()` connect `store.ts` to `Sections.tsx`, `actions.ts`, `images.ts`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `writeSite()` connect `actions.ts` to `store.ts`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `isLang()` connect `types.ts` to `Sections.tsx`, `store.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _143 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Sections.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07540983606557378 - nodes in this community are weakly interconnected._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08506493506493507 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._