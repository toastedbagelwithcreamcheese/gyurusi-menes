# Graph Report - gyurusi-menes  (2026-09-13)

## Corpus Check
- 85 files · ~262,446 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 448 nodes · 1037 edges · 32 communities (23 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c939b334`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Sections.tsx
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

## God Nodes (most connected - your core abstractions)
1. `readSite()` - 49 edges
2. `t()` - 36 edges
3. `langPath()` - 33 edges
4. `isLang()` - 30 edges
5. `writeSite()` - 25 edges
6. `getDict()` - 22 edges
7. `resolveImage()` - 19 edges
8. `s()` - 18 edges
9. `compilerOptions` - 16 edges
10. `Gyűrűsi Ménes — online kutatási jelentés` - 16 edges

## Surprising Connections (you probably didn't know these)
- `RootLayout()` --calls--> `isLang()`  [EXTRACTED]
  src/app/[lang]/layout.tsx → src/content/types.ts
- `generateMetadata()` --calls--> `resolveImage()`  [EXTRACTED]
  src/app/[lang]/[slug]/page.tsx → src/lib/images.ts
- `generateMetadata()` --calls--> `isPageKey()`  [EXTRACTED]
  src/app/[lang]/[slug]/page.tsx → src/lib/store.ts
- `generateMetadata()` --calls--> `readSite()`  [EXTRACTED]
  src/app/[lang]/[slug]/page.tsx → src/lib/store.ts
- `generateMetadata()` --calls--> `t()`  [EXTRACTED]
  src/app/[lang]/[slug]/page.tsx → src/lib/store.ts

## Import Cycles
- None detected.

## Communities (32 total, 9 thin omitted)

### Community 0 - "Sections.tsx"
Cohesion: 0.09
Nodes (38): EventsAdmin(), RegistrationsAdmin(), AdminHome(), EventPage(), generateMetadata(), P, ContentPage(), fmtSize() (+30 more)

### Community 1 - "store.ts"
Cohesion: 0.09
Nodes (36): AdminNav(), ITEMS, EventEdit(), ImagePicker(), Thumb(), LegalAdmin(), ImagesAdmin(), AdminLayout() (+28 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 3 - "actions.ts"
Cohesion: 0.16
Nodes (34): GET(), b(), deleteEvent(), deleteMessage(), deleteRegistration(), deleteReport(), deleteUpload(), lf() (+26 more)

### Community 4 - "devDependencies"
Cohesion: 0.04
Nodes (44): eslint, eslint-config-next, gsap, @netlify/blobs, @netlify/plugin-nextjs, next, dependencies, gsap (+36 more)

### Community 5 - "Gyűrűsi Ménes — online kutatási jelentés"
Cohesion: 0.06
Nodes (31): 0. Összefoglaló, egy bekezdésben, 10.1 huculosveny.gyurusimenes.hu [ÉLŐ, letöltve 2026-08-30], 10.2 gyurusimenes.hu [ARCHÍV 2024-07-18; ma 403], 10.3 gidrangyurus.hu (régi, 2018–2022) [ARCHÍV], 10. A jelenlegi weboldal(ak) menüszerkezete és szövegei — SZÓ SZERINT, 11. Képek témái a régi/mostani oldalakon, 12. Nem igazolt / nem található (összefoglaló lista), 13. Ellentmondások (+23 more)

### Community 6 - "SubPage.tsx"
Cohesion: 0.12
Nodes (15): ContactDock(), ContactForm(), Footer(), I, tel(), Fact, Related, tel() (+7 more)

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
Cohesion: 0.25
Nodes (7): Ami szándékosan nincs benne, Ellenőrzés, Gyűrűsi Ménes — weboldal + admin (demó), Helyi adatbázis és tesztelés, Indítás, Mi hol van, Élesítés

### Community 13 - "types.ts"
Cohesion: 0.09
Nodes (29): fraunces, instrument, Params, RootLayout(), Photo(), PhotoKey, PHOTOS, ScrollTop() (+21 more)

### Community 17 - "admin-flow.mjs"
Cohesion: 0.43
Nodes (6): BASE, errors, fail(), fetchText(), go(), purge()

### Community 18 - "shots.mjs"
Cohesion: 0.50
Nodes (3): exe, pages, report

### Community 27 - "register/route.ts"
Cohesion: 0.27
Nodes (11): last, POST(), last, POST(), CONFIRM, Result, send(), sendContactMail() (+3 more)

### Community 28 - "sharp-linux.mjs"
Cohesion: 0.33
Nodes (4): PKGS, ROOT, sharpPkg, SIDE

### Community 29 - "with-server.mjs"
Cohesion: 0.40
Nodes (4): [cmd, ...args], ROOT, run, srv

### Community 31 - "langPath"
Cohesion: 0.16
Nodes (26): generateMetadata(), P, PrivacyPage(), EventsPage(), generateMetadata(), P, generateMetadata(), ImprintPage() (+18 more)

## Knowledge Gaps
- **165 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+160 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `readSite()` connect `store.ts` to `actions.ts`, `Sections.tsx`, `register/route.ts`, `langPath`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `isLang()` connect `langPath` to `Sections.tsx`, `register/route.ts`, `types.ts`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `writeSite()` connect `actions.ts` to `store.ts`, `register/route.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _165 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Sections.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09490196078431372 - nodes in this community are weakly interconnected._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08653061224489796 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._