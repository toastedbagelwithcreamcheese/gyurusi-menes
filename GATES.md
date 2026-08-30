# Gates: Gyűrűsi Ménes weboldal + admin demo

OWNS: **

Scope: Modern, fotóvezérelt Gyűrűsi Ménes weboldal (Next.js) egyszerű adminnal, hiteles tartalommal, gyors és mobilbarát kivitelben, git repóban a többi weboldal mellett.

- [x] G1: A projekt hibátlanul buildel
  CHECK: npm run build
  EXPECT: Compiled successfully
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=90cc8f65e301/24 entries; EXPECT=matched; output-sha256=332254825ff9399b1f421724c787917e4d13c7f3f30bcf38ee00f4100f2540cd; output-bytes=1550

- [x] G2: TypeScript hibamentes
  CHECK: npx tsc --noEmit && echo TSC_OK
  EXPECT: TSC_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=90cc8f65e301/24 entries; EXPECT=matched; output-sha256=d018f66bb24b65f8f3c86936c97cc0c033c796f2f7b335753a186d3d2c5818a4; output-bytes=7

- [x] G3: ESLint hibamentes
  CHECK: npm run lint && echo LINT_OK
  EXPECT: LINT_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=90cc8f65e301/24 entries; EXPECT=matched; output-sha256=fef1998fdb610a910f5d80fa66c0bb36f27e7937385d20f502b3148773c9ae42; output-bytes=46

- [x] G4: Kurált, optimalizált képkészlet alt szövegekkel, méretkorláton belül
  CHECK: node scripts/verify.mjs images
  EXPECT: PASS: images
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=90cc8f65e301/24 entries; EXPECT=matched; output-sha256=d1bf6267f5a52a51b93c23a8e134c3c225ced30da38fa5014ec0757b1d2bc14e; output-bytes=48

- [x] G5: A tartalom nem tartalmaz kitalált tényt (tiltott minták + kötelező igazolt adatok)
  CHECK: node scripts/verify.mjs content-no-fabrication
  EXPECT: PASS: content-no-fabrication
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=90cc8f65e301/24 entries; EXPECT=matched; output-sha256=79259f423b0252201cdb155872f88fec117c121dba3e8b2e09dbbf7d381a0b7f; output-bytes=29

- [x] G6: Futó oldal: SEO-alapok, egy H1, robots/sitemap, admin 401 hitelesítés nélkül és 200 vele, kapcsolati API validál és tárol
  CHECK: ADMIN_USER=admin ADMIN_PASSWORD=valtoztasd-meg BASE_URL=http://localhost:3012 node scripts/verify.mjs http
  EXPECT: PASS: http
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=90cc8f65e301/24 entries; EXPECT=matched; output-sha256=b37f425154827d75a4edd24ce30b88792d74769225ef39282273f84e24450405; output-bytes=11

- [x] G7: Reduced-motion kezelve, nincs `transition: all`
  CHECK: node scripts/verify.mjs css-motion
  EXPECT: PASS: css-motion
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=90cc8f65e301/24 entries; EXPECT=matched; output-sha256=96f4deedfbeca393ad92640f80877a615835629813920934eae6e0ddb356e2c7; output-bytes=17

- [x] G8: Vizuális review böngészőben desktop (1440) és mobil (390) nézetben: hero-crop nem vágja le a témát, nincs vízszintes görgetés, konzol hibamentes
  EVIDENCE: Chrome 1440×900 végiggörgetve (hero, tények, programok, bemutatkozás, huculösvény, fajták, események, galéria, lightbox, kapcsolat, lábléc); Playwright 390×844: scrollWidth 390 = innerWidth, hero V-alakzat a mobil cropban is látszik (scratchpad/pw/shots/m-hero.png, m-full.png, m-menu.png); konzol: nincs hiba/figyelmeztetés.

- [x] G9: Admin végigpróbálva: esemény létrehozás → megjelenik a főoldalon; kép feltöltés → galériába tehető; közzététel/elrejtés működik
  EVIDENCE: Playwright admin-flow.mjs: „upload tiles: 1 / event on home: true | upload in gallery: true / after hide, event on home: false / cleanup done" — esemény létrehozva, kép feltöltve (public/uploads/u-*.webp), galériába téve, elrejtve, majd törölve; site.json visszaállt (events 4, uploads 0, gallery 16).

- [x] G10: Git repo inicializálva a /Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes alatt, első commit elkészült
  CHECK: git log --oneline | head -1 && echo GIT_OK
  EXPECT: GIT_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=90cc8f65e301/24 entries; EXPECT=matched; output-sha256=ee2e61ce5ffc8c089d9d960776eb04d7904974af2838aeedf336b1afe66ad17f; output-bytes=72
