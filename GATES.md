# Gates: Gyűrűsi Ménes — 2. kör, az ügyfél 2026-09-12-i specifikációja

OWNS: **

Scope: Egyszerű főoldal + 5 aloldal (Huculösvény, Túrák, Oktatás, Táborok, Egyesület), Netlify Blobs-alapú admin (fájl-driver helyben), eseménynaptár kiemelt eseménnyel és jelentkezéssel (csak igényfelmérés, adminban látszik), egyesületi beszámolók (PDF-feltöltés), HU/EN/DE i18n automatikus felismeréssel és váltóval, a tulajdonos (Vörös József) mindig elöl, aloldalanként saját kapcsolati rész, galéria kivéve, hero és eseményképek szerkeszthetők, üzenetek az info@gyurusimenes.hu-ra (Resend, env-gated).

- [ ] G1: A projekt hibátlanul buildel
  CHECK: npm run build
  EXPECT: Compiled successfully

- [ ] G2: TypeScript hibamentes
  CHECK: npx tsc --noEmit && echo TSC_OK
  EXPECT: TSC_OK

- [ ] G3: ESLint hibamentes
  CHECK: npm run lint && echo LINT_OK
  EXPECT: LINT_OK

- [ ] G4: Kurált, optimalizált képkészlet alt szövegekkel, méretkorláton belül
  CHECK: node scripts/verify.mjs images
  EXPECT: PASS: images

- [ ] G5: A tartalom (mindhárom nyelven) nem tartalmaz kitalált tényt; a tulajdonos telefonszáma üresen marad, amíg nem kapjuk meg
  CHECK: node scripts/verify.mjs content-no-fabrication
  EXPECT: PASS: content-no-fabrication

- [ ] G6: Minden L-mező (hu/en/de) kitöltött a tartalomban, az en/de szótár kulcsai azonosak a hu szótáréval
  CHECK: node scripts/verify.mjs i18n
  EXPECT: PASS: i18n

- [ ] G7: Reduced-motion kezelve, nincs `transition: all`; az új CSS-blokkok osztályai ténylegesen a stíluslapban vannak (blokk-csere nem vágta le a fájl végét)
  CHECK: node scripts/verify.mjs css-motion
  EXPECT: PASS: css-motion

- [ ] G8: Nincs galéria: sem /galeria útvonal, sem Lightbox-import az app alatt, sem id="galeria" a főoldalon
  CHECK: node scripts/verify.mjs no-gallery
  EXPECT: PASS: no-gallery

- [ ] G9: Futó oldal (fájl-driver): / /en /de 200 helyes lang-attribútummal; /hu → 308 /; Accept-Language: de a gyökéren → 302 /de, robot UA → 200 magyar; mind az 5 aloldal ×3 nyelv 200; /esemenyek és egy esemény 200; admin lapok 200; /api/contact és /api/register validál és tárol; a tulajdonos neve minden lapon a kapcsolattartó előtt áll; minden aloldalon saját kapcsolati blokk; egy H1; robots/sitemap
  CHECK: node scripts/with-server.mjs node scripts/verify.mjs http
  EXPECT: PASS: http

- [ ] G10: Admin végigpróbálva Playwrighttal (fájl-driver): esemény létrehozás kiemeltként + jelentkezés nyitva → a főoldalon kiemelt blokkban jelenik meg; nyilvános jelentkezés → megjelenik az /admin/jelentkezesek listában a létszámmal; PDF-beszámoló feltöltés → megjelenik az /egyesulet lapon; hero-kép csere adminból → a főoldal új képet ad; takarítás után a tartalom visszaáll
  CHECK: node scripts/with-server.mjs node scripts/admin-flow.mjs
  EXPECT: ADMIN_FLOW_OK

- [ ] G11: Lighthouse mobil Performance ≥ 85 és Accessibility ≥ 95 a főoldalon (production build)
  CHECK: node scripts/with-server.mjs node scripts/verify.mjs lighthouse
  EXPECT: PASS: lighthouse

- [ ] G12: Vizuális review desktop és mobil nézetben (Playwright-képek, scripts/shots.mjs): főoldal, egy aloldal, események, esemény-részletek jelentkezési űrlappal, admin; nincs vízszintes görgetés, a nyelvváltó a fejlécben mindkét nézetben elérhető, konzol hibamentes

- [ ] G13: Élesben (Netlify, Blobs-driver): deploy után /, /en, /de, /egyesulet 200; admin-flow ugyanezt a kört a Blobs ellen végigfutja (esemény létrehozás → látszik → törlés), bizonyítva, hogy a tartalom Netlify-on is megmarad
  CHECK: BASE_URL=https://gyurusi-menes-demo.netlify.app node scripts/admin-flow.mjs
  EXPECT: ADMIN_FLOW_OK

- [ ] G14: Git commit + push, graphify frissítve, projektmemória frissítve a kör eredményével és a nyitott ügyféladatokkal (tulajdonos telefonszáma, DNS, Resend kulcs, admin jelszó)
  CHECK: git status --porcelain | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const l=s.split('\n').filter(x=>x.trim()&&!/GATES\.md$/.test(x));if(l.length){console.log('DIRTY',l.join(' | '));process.exit(1)}console.log('CLEAN_TREE')})"
  EXPECT: CLEAN_TREE
