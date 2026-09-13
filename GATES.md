# Gates: Gyűrűsi Ménes — 2. kör, az ügyfél 2026-09-12-i specifikációja

OWNS: **

Scope: Egyszerű főoldal + 5 aloldal (Huculösvény, Túrák, Oktatás, Táborok, Egyesület), Netlify Blobs-alapú admin (fájl-driver helyben), eseménynaptár kiemelt eseménnyel és jelentkezéssel (csak igényfelmérés, adminban látszik), egyesületi beszámolók (PDF-feltöltés), HU/EN/DE i18n automatikus felismeréssel és váltóval, a tulajdonos (Vörös József) mindig elöl, aloldalanként saját kapcsolati rész, galéria kivéve, hero és eseményképek szerkeszthetők, üzenetek az info@gyurusimenes.hu-ra (Resend, env-gated).

- [x] G1: A projekt hibátlanul buildel
  CHECK: npm run build
  EXPECT: Compiled successfully
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=34ed90c806e702eb10fd36199efc6cb8b1f9a551c4e3283b97fb09dbc9d5d1e5; output-bytes=2086

- [x] G2: TypeScript hibamentes
  CHECK: npx tsc --noEmit && echo TSC_OK
  EXPECT: TSC_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=d018f66bb24b65f8f3c86936c97cc0c033c796f2f7b335753a186d3d2c5818a4; output-bytes=7

- [x] G3: ESLint hibamentes
  CHECK: npm run lint && echo LINT_OK
  EXPECT: LINT_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=fef1998fdb610a910f5d80fa66c0bb36f27e7937385d20f502b3148773c9ae42; output-bytes=46

- [x] G4: Kurált, optimalizált képkészlet alt szövegekkel, méretkorláton belül
  CHECK: node scripts/verify.mjs images
  EXPECT: PASS: images
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=74de88918b67b9116502865cc0d59604d11c954ec0343819b84ba0776f5ea801; output-bytes=75

- [x] G5: A tartalom (mindhárom nyelven) nem tartalmaz kitalált tényt; a tulajdonos telefonszáma üresen marad, amíg nem kapjuk meg
  CHECK: node scripts/verify.mjs content-no-fabrication
  EXPECT: PASS: content-no-fabrication
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=79259f423b0252201cdb155872f88fec117c121dba3e8b2e09dbbf7d381a0b7f; output-bytes=29

- [x] G6: Minden L-mező (hu/en/de) kitöltött a tartalomban, az en/de szótár kulcsai azonosak a hu szótáréval
  CHECK: node scripts/verify.mjs i18n
  EXPECT: PASS: i18n
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=433ca6ca1b97a36c25c9aad716622bce376d6ff68c046026b3299a89dcdbb922; output-bytes=87

- [x] G7: Reduced-motion kezelve, nincs `transition: all`; az új CSS-blokkok osztályai ténylegesen a stíluslapban vannak (blokk-csere nem vágta le a fájl végét)
  CHECK: node scripts/verify.mjs css-motion
  EXPECT: PASS: css-motion
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=9a13a5337a84683974db8fd64bb705638bb972cc82a92231791de451614256d2; output-bytes=74

- [x] G8: Nincs galéria: sem /galeria útvonal, sem Lightbox-import az app alatt, sem id="galeria" a főoldalon
  CHECK: node scripts/verify.mjs no-gallery
  EXPECT: PASS: no-gallery
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=e12eafb02e74c3671b363d5dfb27321a0f49c13a7e131eafc019901a7d3a1bac; output-bytes=17

- [x] G9: Futó oldal (fájl-driver): / /en /de 200 helyes lang-attribútummal; /hu → 308 /; Accept-Language: de a gyökéren → 302 /de, robot UA → 200 magyar; mind az 5 aloldal ×3 nyelv 200; /esemenyek és egy esemény 200; admin lapok 200; /api/contact és /api/register validál és tárol; a tulajdonos neve minden lapon a kapcsolattartó előtt áll; minden aloldalon saját kapcsolati blokk; egy H1; robots/sitemap
  CHECK: node scripts/with-server.mjs node scripts/verify.mjs http
  EXPECT: PASS: http
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=7a14731f1c6ef747ab50fcc74f37ab4cf023d6dadb12ba1612e2e66dc62efb70; output-bytes=292

- [x] G10: Admin végigpróbálva Playwrighttal (fájl-driver): esemény létrehozás kiemeltként + jelentkezés nyitva → a főoldalon kiemelt blokkban jelenik meg; nyilvános jelentkezés → megjelenik az /admin/jelentkezesek listában a létszámmal; PDF-beszámoló feltöltés → megjelenik az /egyesulet lapon; hero-kép csere adminból → a főoldal új képet ad; takarítás után a tartalom visszaáll
  CHECK: node scripts/with-server.mjs node scripts/admin-flow.mjs
  EXPECT: ADMIN_FLOW_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=cfe58c22c90edd829aea7a26052dfe6bc8120a08f9c3e5d7e9792a1ee8adbde1; output-bytes=547

- [x] G11: Lighthouse mobil Performance ≥ 85 és Accessibility ≥ 95 a főoldalon (production build)
  CHECK: node scripts/with-server.mjs node scripts/verify.mjs lighthouse
  EXPECT: PASS: lighthouse
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=4e70484fc2e960b31ba1a6ce30e3daace1bc1ac7f7e1913937444dc466a3ee03; output-bytes=289

- [x] G12: Vizuális review desktop és mobil nézetben (Playwright-képek, scripts/shots.mjs): főoldal, egy aloldal, események, esemény-részletek jelentkezési űrlappal, admin; nincs vízszintes görgetés, a nyelvváltó a fejlécben mindkét nézetben elérhető, konzol hibamentes
  EVIDENCE: scripts/shots.mjs → scratchpad/shots (17 kép, 1440×900 és 390×844): d-/m-home, turak, egyesulet, esemenyek, esemeny, home-en, admin, admin-oldal, m-menu. scrollWidth = innerWidth minden lapon mindkét nézetben (1440/1440, 390/390); konzol-hiba: 0 / 0. Megnézve: főoldal (hero, tulajdonos-blokk, bemutatkozás + fajta-sáv, kiemelt/legutóbbi esemény, 5 csempe, kapcsolat tulajdonos-kártyával elöl), Túrák (képfej, szöveg, képsáv, saját kapcsolat, kapcsolódó), Egyesület (beszámoló-blokk üres állapota), Eseménynaptár, eseményoldal (tények + kapcsolat + kapcsolódó), admin áttekintés, mobil menü a Magyar/English/Deutsch pillekkel (az első képen a menü-stílus rácsúszott a nyelvváltóra — javítva, újra ellenőrizve). A jelentkezési űrlapot a G10/G13 admin-körút tölti ki és küldi el (data-registration blokk, [role=status] visszajelzés).

- [x] G13: Élesben (Netlify, Blobs-driver): deploy után /, /en, /de, /egyesulet 200; admin-flow ugyanezt a kört a Blobs ellen végigfutja (esemény létrehozás → látszik → törlés), bizonyítva, hogy a tartalom Netlify-on is megmarad
  CHECK: BASE_URL=https://gyurusi-menes-demo.netlify.app node scripts/admin-flow.mjs
  EXPECT: ADMIN_FLOW_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=f09a4a5e5af28d66d7a3eed4da9f910dd872ff1ff573ae4d336bd547c0e8f747; output-bytes=388

- [x] G15: Forgatókönyves böngésző-QA (helyi DB): kapcsolati űrlap mezőre mutató hibái 2 nyelven és sikeres tárolás az oldal-hivatkozással; jelentkezés hibái és sikere; lezárt esemény üzenete; 6 közelgő esemény rácsban, egyetlen kiemelt; esemény nélküli főoldal és naptár magyarázó szöveggel; admin: nem-PDF részletes hibája, mentés „mentve” visszajelzése, rossz záró dátum hibája — mind a Flash-sávban
  CHECK: node scripts/with-server.mjs node scripts/qa-flow.mjs
  EXPECT: QA_FLOW_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=5e5570cef8dc367ce5ae3468b83dfc10e5a71f47d2fadf1e24b75cc14787707c; output-bytes=1008

- [x] G14: Git commit + push, graphify frissítve, projektmemória frissítve a kör eredményével és a nyitott ügyféladatokkal (tulajdonos telefonszáma, DNS, Resend kulcs, admin jelszó)
  CHECK: git status --porcelain | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const l=s.split('\n').filter(x=>x.trim()&&!/GATES\.md$/.test(x));if(l.length){console.log('DIRTY',l.join(' | '));process.exit(1)}console.log('CLEAN_TREE')})"
  EXPECT: CLEAN_TREE
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=8cf979e8ed5c515aecd197784536d132b1aa9f4555c00da6fba4a83ae986d75f; output-bytes=11
