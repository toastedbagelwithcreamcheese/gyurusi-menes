# Gates: Gyűrűsi Ménes — 2. kör, az ügyfél 2026-09-12-i specifikációja

OWNS: **

Scope: Egyszerű főoldal + 5 aloldal (Huculösvény, Túrák, Oktatás, Táborok, Egyesület), Netlify Blobs-alapú admin (fájl-driver helyben), eseménynaptár kiemelt eseménnyel és jelentkezéssel (csak igényfelmérés, adminban látszik), egyesületi beszámolók (PDF-feltöltés), HU/EN/DE i18n automatikus felismeréssel és váltóval, a tulajdonos (Vörös József) mindig elöl, aloldalanként saját kapcsolati rész, galéria kivéve, hero és eseményképek szerkeszthetők, üzenetek az info@gyurusimenes.hu-ra (Resend, env-gated).

- [x] G1: A projekt hibátlanul buildel
  CHECK: npm run build
  EXPECT: Compiled successfully
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=f7316115a57264f83f2a483837509fc12e421e97754ae6ad61a3f8fe7b7324fa; output-bytes=2005

- [x] G2: TypeScript hibamentes
  CHECK: npx tsc --noEmit && echo TSC_OK
  EXPECT: TSC_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=d018f66bb24b65f8f3c86936c97cc0c033c796f2f7b335753a186d3d2c5818a4; output-bytes=7

- [ ] G3: ESLint hibamentes
  CHECK: npm run lint && echo LINT_OK
  EXPECT: LINT_OK

- [x] G4: Kurált, optimalizált képkészlet alt szövegekkel, méretkorláton belül
  CHECK: node scripts/verify.mjs images
  EXPECT: PASS: images
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=dae9e21613683db2ae16c00294ee55d17fde184a76d5449af6d8ef621e1de29a; output-bytes=75

- [x] G5: A tartalom (mindhárom nyelven) nem tartalmaz kitalált tényt; a tulajdonos telefonszáma üresen marad, amíg nem kapjuk meg
  CHECK: node scripts/verify.mjs content-no-fabrication
  EXPECT: PASS: content-no-fabrication
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=79259f423b0252201cdb155872f88fec117c121dba3e8b2e09dbbf7d381a0b7f; output-bytes=29

- [x] G6: Minden L-mező (hu/en/de) kitöltött a tartalomban, az en/de szótár kulcsai azonosak a hu szótáréval
  CHECK: node scripts/verify.mjs i18n
  EXPECT: PASS: i18n
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=f1ff71615fc7a4accecb9e53754b1318b415c740adfaca8c97fce1db5cd69d7e; output-bytes=87

- [x] G7: Reduced-motion kezelve, nincs `transition: all`; az új CSS-blokkok osztályai ténylegesen a stíluslapban vannak (blokk-csere nem vágta le a fájl végét)
  CHECK: node scripts/verify.mjs css-motion
  EXPECT: PASS: css-motion
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=7d9901da136bbfcf899b03d3d22852994c996e27a23b88b054045aa0f8eabea2; output-bytes=74

- [x] G8: Nincs galéria: sem /galeria útvonal, sem Lightbox-import az app alatt, sem id="galeria" a főoldalon
  CHECK: node scripts/verify.mjs no-gallery
  EXPECT: PASS: no-gallery
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=e12eafb02e74c3671b363d5dfb27321a0f49c13a7e131eafc019901a7d3a1bac; output-bytes=17

- [ ] G9: Futó oldal (fájl-driver): / /en /de 200 helyes lang-attribútummal; /hu → 308 /; Accept-Language: de a gyökéren → 302 /de, robot UA → 200 magyar; mind az 5 aloldal ×3 nyelv 200; /esemenyek és egy esemény 200; admin lapok 200; /api/contact és /api/register validál és tárol; a tulajdonos neve minden lapon a kapcsolattartó előtt áll; minden aloldalon saját kapcsolati blokk; egy H1; robots/sitemap
  CHECK: node scripts/with-server.mjs node scripts/verify.mjs http
  EXPECT: PASS: http

- [ ] G10: Admin végigpróbálva Playwrighttal (fájl-driver): esemény létrehozás kiemeltként + jelentkezés nyitva → a főoldalon kiemelt blokkban jelenik meg; nyilvános jelentkezés → megjelenik az /admin/jelentkezesek listában a létszámmal; PDF-beszámoló feltöltés → megjelenik az /egyesulet lapon; hero-kép csere adminból → a főoldal új képet ad; takarítás után a tartalom visszaáll
  CHECK: node scripts/with-server.mjs node scripts/admin-flow.mjs
  EXPECT: ADMIN_FLOW_OK

- [ ] G11: Lighthouse mobil Performance ≥ 85 és Accessibility ≥ 95 a főoldalon (production build)
  CHECK: node scripts/with-server.mjs node scripts/verify.mjs lighthouse
  EXPECT: PASS: lighthouse

- [x] G12: Vizuális review desktop és mobil nézetben (Playwright-képek, scripts/shots.mjs): főoldal, egy aloldal, események, esemény-részletek jelentkezési űrlappal, admin; nincs vízszintes görgetés, a nyelvváltó a fejlécben mindkét nézetben elérhető, konzol hibamentes
  EVIDENCE: scripts/shots.mjs → scratchpad/shots (17 kép, 1440×900 és 390×844): d-/m-home, turak, egyesulet, esemenyek, esemeny, home-en, admin, admin-oldal, m-menu. scrollWidth = innerWidth minden lapon mindkét nézetben (1440/1440, 390/390); konzol-hiba: 0 / 0. Megnézve: főoldal (hero, tulajdonos-blokk, bemutatkozás + fajta-sáv, kiemelt/legutóbbi esemény, 5 csempe, kapcsolat tulajdonos-kártyával elöl), Túrák (képfej, szöveg, képsáv, saját kapcsolat, kapcsolódó), Egyesület (beszámoló-blokk üres állapota), Eseménynaptár, eseményoldal (tények + kapcsolat + kapcsolódó), admin áttekintés, mobil menü a Magyar/English/Deutsch pillekkel (az első képen a menü-stílus rácsúszott a nyelvváltóra — javítva, újra ellenőrizve). A jelentkezési űrlapot a G10/G13 admin-körút tölti ki és küldi el (data-registration blokk, [role=status] visszajelzés).

- [x] G13: Élesben (Netlify, Blobs-driver): deploy után /, /en, /de, /egyesulet 200; admin-flow ugyanezt a kört a Blobs ellen végigfutja (esemény létrehozás → látszik → törlés), bizonyítva, hogy a tartalom Netlify-on is megmarad
  CHECK: BASE_URL=https://gyurusi-menes-demo.netlify.app node scripts/admin-flow.mjs
  EXPECT: ADMIN_FLOW_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=0cf6c1639279d5a2414a5c95b9ada58586712a007b464db1738a1b6d760b4ea5; output-bytes=443

- [ ] G14: Git commit + push, graphify frissítve, projektmemória frissítve a kör eredményével és a nyitott ügyféladatokkal (tulajdonos telefonszáma, DNS, Resend kulcs, admin jelszó)
  CHECK: git status --porcelain | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const l=s.split('\n').filter(x=>x.trim()&&!/GATES\.md$/.test(x));if(l.length){console.log('DIRTY',l.join(' | '));process.exit(1)}console.log('CLEAN_TREE')})"
  EXPECT: CLEAN_TREE
