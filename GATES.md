# Gates: Gyűrűsi Ménes weboldal + admin demo

OWNS: **

Scope: Modern, fotóvezérelt Gyűrűsi Ménes weboldal (Next.js) egyszerű adminnal, hiteles tartalommal, gyors és mobilbarát kivitelben, git repóban a többi weboldal mellett.

- [ ] G1: A projekt hibátlanul buildel
  CHECK: npm run build
  EXPECT: Compiled successfully
  EVIDENCE: pending

- [ ] G2: TypeScript hibamentes
  CHECK: npx tsc --noEmit && echo TSC_OK
  EXPECT: TSC_OK
  EVIDENCE: pending

- [ ] G3: ESLint hibamentes
  CHECK: npm run lint && echo LINT_OK
  EXPECT: LINT_OK
  EVIDENCE: pending

- [ ] G4: Kurált, optimalizált képkészlet alt szövegekkel, méretkorláton belül
  CHECK: node scripts/verify.mjs images
  EXPECT: PASS: images
  EVIDENCE: pending

- [ ] G5: A tartalom nem tartalmaz kitalált tényt (tiltott minták + kötelező igazolt adatok)
  CHECK: node scripts/verify.mjs content-no-fabrication
  EXPECT: PASS: content-no-fabrication
  EVIDENCE: pending

- [ ] G6: Futó oldal: SEO-alapok, egy H1, robots/sitemap, admin 401 hitelesítés nélkül és 200 vele, kapcsolati API validál és tárol
  CHECK: node scripts/verify.mjs http
  EXPECT: PASS: http
  EVIDENCE: pending

- [ ] G7: Reduced-motion kezelve, nincs `transition: all`
  CHECK: node scripts/verify.mjs css-motion
  EXPECT: PASS: css-motion
  EVIDENCE: pending

- [ ] G8: Vizuális review böngészőben desktop (1440) és mobil (390) nézetben: hero-crop nem vágja le a témát, nincs vízszintes görgetés, konzol hibamentes
  EVIDENCE: pending

- [ ] G9: Admin végigpróbálva: esemény létrehozás → megjelenik a főoldalon; kép feltöltés → galériába tehető; közzététel/elrejtés működik
  EVIDENCE: pending

- [ ] G10: Git repo inicializálva a /Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes alatt, első commit elkészült
  CHECK: git log --oneline | head -1 && echo GIT_OK
  EXPECT: GIT_OK
  EVIDENCE: pending
