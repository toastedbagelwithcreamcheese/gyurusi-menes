# Gates: Gyűrűsi Ménes — 2. kör, az ügyfél 2026-09-12-i specifikációja

OWNS: **

Scope: Egyszerű főoldal + 5 aloldal (Huculösvény, Túrák, Oktatás, Táborok, Egyesület), Netlify Blobs-alapú admin (fájl-driver helyben), eseménynaptár kiemelt eseménnyel és jelentkezéssel (csak igényfelmérés, adminban látszik), egyesületi beszámolók (PDF-feltöltés), HU/EN/DE i18n automatikus felismeréssel és váltóval, a tulajdonos (Vörös József) mindig elöl, aloldalanként saját kapcsolati rész, galéria kivéve, hero és eseményképek szerkeszthetők, üzenetek az info@gyurusimenes.hu-ra (Resend, env-gated).

- [x] G1: A projekt hibátlanul buildel
  CHECK: npm run build
  EXPECT: Compiled successfully
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=35398c3c67c315a57e8fb7f85a29ff031ccf248e9ec96b9ab9e55761d7b1b997; output-bytes=1914

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
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=dae9e21613683db2ae16c00294ee55d17fde184a76d5449af6d8ef621e1de29a; output-bytes=75

- [x] G5: A tartalom (mindhárom nyelven: a mag, a szótárak, az llms.txt statikus szövege, a levélsablonok és az adatkezelési sablon, megjegyzések nélkül) nem tartalmaz kitalált tényt; a tulajdonos telefonszáma üresen marad, amíg nem kapjuk meg
  CHECK: node scripts/verify.mjs content-no-fabrication
  EXPECT: PASS: content-no-fabrication
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=79259f423b0252201cdb155872f88fec117c121dba3e8b2e09dbbf7d381a0b7f; output-bytes=29

- [x] G6: Minden L-mező (hu/en/de) kitöltött a tartalomban, az en/de szótár kulcsai azonosak a hu szótáréval
  CHECK: node scripts/verify.mjs i18n
  EXPECT: PASS: i18n
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=dd7d21050f659becd74a1ad238469ab77126116f887eedb6853333ddf5ff2df5; output-bytes=87

- [x] G7: Reduced-motion kezelve, nincs `transition: all`; az új CSS-blokkok osztályai ténylegesen a stíluslapban vannak (blokk-csere nem vágta le a fájl végét)
  CHECK: node scripts/verify.mjs css-motion
  EXPECT: PASS: css-motion
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=5b207450adfa37d2df7a05ddf90b9bbd89f073de9f89d037c116db3f51d08fa7; output-bytes=115

- [x] G8: Nincs galéria: sem /galeria útvonal, sem Lightbox-import az app alatt, sem id="galeria" a főoldalon
  CHECK: node scripts/verify.mjs no-gallery
  EXPECT: PASS: no-gallery
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=e12eafb02e74c3671b363d5dfb27321a0f49c13a7e131eafc019901a7d3a1bac; output-bytes=17

- [x] G9: Futó oldal (fájl-driver): / /en /de 200 helyes lang-attribútummal; /hu → 308 /; Accept-Language: de a gyökéren → 302 /de, robot UA → 200 magyar; mind az 5 aloldal ×3 nyelv 200; /esemenyek és egy esemény 200; admin lapok 200; /api/contact és /api/register validál és tárol; a tulajdonos neve minden lapon a kapcsolattartó előtt áll; minden aloldalon saját kapcsolati blokk; egy H1; robots/sitemap
  CHECK: node scripts/with-server.mjs node scripts/verify.mjs http
  EXPECT: PASS: http
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=4d8dd1e7ccbccd1153765fdb14ff561b2cc918da039f1a68d9f17f5b9eb27bf6; output-bytes=67

- [x] G10: Admin végigpróbálva Playwrighttal (fájl-driver): esemény létrehozás kiemeltként + jelentkezés nyitva → a főoldalon kiemelt blokkban jelenik meg; nyilvános jelentkezés → megjelenik az /admin/jelentkezesek listában a létszámmal; PDF-beszámoló feltöltés → megjelenik az /egyesulet lapon; hero-kép csere adminból → a főoldal új képet ad; takarítás után a tartalom visszaáll
  CHECK: node scripts/with-server.mjs node scripts/admin-flow.mjs
  EXPECT: ADMIN_FLOW_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=e472d3bb6ecf20e8e2bbc307602f7e93ddca62c4c721caf4af933698a3693a10; output-bytes=322

- [x] G11: Lighthouse mobil Performance ≥ 85 és Accessibility ≥ 95 a főoldalon (production build)
  CHECK: node scripts/with-server.mjs node scripts/verify.mjs lighthouse
  EXPECT: PASS: lighthouse
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=60180bcc1bfc2d7e8ba895cfd7f2333f09efd1880f840ddac1b3bd79b4354b64; output-bytes=63

- [ ] G12: Vizuális review desktop és mobil nézetben (Playwright-képek, scripts/shots.mjs): főoldal, egy aloldal, események, esemény-részletek jelentkezési űrlappal, admin; nincs vízszintes görgetés, a nyelvváltó a fejlécben mindkét nézetben elérhető, konzol hibamentes
  CHECK: node scripts/with-server.mjs node scripts/shots.mjs
  EXPECT: PASS: shots

- [ ] G13: Élesben (Netlify, Blobs-driver): deploy után /, /en, /de, /egyesulet 200; admin-flow ugyanezt a kört a Blobs ellen végigfutja (esemény létrehozás → látszik → törlés), bizonyítva, hogy a tartalom Netlify-on is megmarad
  CHECK: BASE_URL=https://gyurusi-menes-demo.netlify.app node scripts/admin-flow.mjs
  EXPECT: ADMIN_FLOW_OK
  EVIDENCE: pending

- [x] G15: Forgatókönyves böngésző-QA (helyi DB): kapcsolati űrlap mezőre mutató hibái 2 nyelven és sikeres tárolás az oldal-hivatkozással; jelentkezés hibái és sikere; lezárt esemény üzenete; 6 közelgő esemény rácsban, egyetlen kiemelt; esemény nélküli főoldal és naptár magyarázó szöveggel; admin: nem-PDF részletes hibája, mentés „mentve” visszajelzése, rossz záró dátum hibája — mind a Flash-sávban
  CHECK: node scripts/with-server.mjs node scripts/qa-flow.mjs
  EXPECT: QA_FLOW_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=5438089b52402a9ab1aaf25faedbdac12cc0038d5ba3b47d6b9f41326f0286c5; output-bytes=872

- [x] G14: Git commit + push, graphify frissítve, projektmemória frissítve a kör eredményével és a nyitott ügyféladatokkal (tulajdonos telefonszáma, DNS, Resend kulcs, admin jelszó)
  CHECK: git status --porcelain | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const l=s.split('\n').filter(x=>x.trim()&&!/GATES\.md$/.test(x));if(l.length){console.log('DIRTY',l.join(' | '));process.exit(1)}console.log('CLEAN_TREE')})"
  EXPECT: CLEAN_TREE
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=8cf979e8ed5c515aecd197784536d132b1aa9f4555c00da6fba4a83ae986d75f; output-bytes=11

---

# 5. kör — minden, ami ügyféladat nélkül megoldható (2026-09-14)

Forrás: docs/review-2026-09-13/ (átnézés, 39 szempont + 12 saját lelet). Az ügyfél kérései (criteria.json C01–C15) változtathatatlanok. Kulcsok, jelszó, DNS, adószám az ügyféltől jön — ezeket helyi mockkal/szimulációval ellenőrizzük, élesben csak be kell állítani. Minden ellenőrző szkript csak akkor ír `PASS: <név>`-et, ha minden állítása teljesült.

- [x] G16: Adatbiztonság egyidejű íráskor: 30 egyidejű jelentkezés és 10 üzenet a fájl-driverrel ÉS helyi Netlify Blobs-szimulátorral mind eltárolódik; 10 párhuzamos admin-mentés a tartalomdokumentumon nem vész el (feltételes írás / újrapróbálás); a régi, dokumentumba ágyazott jelentkezések és üzenetek migrálódnak
  CHECK: node scripts/checks/p1-data.mjs
  EXPECT: PASS: p1-data
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=d6922f6f576c14461e780aa8a16a566eead4a72c6621227a6be635ced5ec2a75; output-bytes=957

- [x] G17: Automatikus karbantartás: az esemény vége után 30 nappal a jelentkezések törlődnek (a frissebbek maradnak), 365 napnál régebbi üzenetek törlődnek; napi mentés készül (utolsó 30 megmarad), az admin letölthető mentést ad; a napi ütemezett függvény konfigurálva; a sebességkorlát tartós tárban él
  CHECK: node scripts/checks/p1-maintenance.mjs
  EXPECT: PASS: p1-maintenance
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=943535af2780b49c62a0cc028d136656753f2e8d57d06bdf0ccf63eacf433621; output-bytes=1490

- [x] G18: Valós méretű feltöltés: legalább 8 MB-os JPEG a böngészőben méretezve sikeresen feltöltődik; HEIC-fájlra magyar nyelvű, teendőt mondó üzenet; 2,6 MB-os és 12 MB-os PDF darabolva feltöltődik és bájtra egyezően letölthető; 25 MB-os PDF-re pontos méret-üzenet; feltöltés közben folyamatjelző; az esemény- és aloldal-szerkesztőből is lehet új képet feltölteni
  CHECK: node scripts/with-server.mjs node scripts/checks/p2-uploads.mjs
  EXPECT: PASS: p2-uploads
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=8a6638f2db2e5fa3fd30b675e2ea5ab4f3fdf66b0e20bd7048c5445759bff8ee; output-bytes=2074

- [x] G19: Admin-belépés: ADMIN_PASSWORD mellett az /admin lapjai a belépő oldalra visznek, az /api/admin/* 401-et ad; rossz jelszóra magyar hibaüzenet, sorozatos rossz próbára átmeneti tiltás; jó jelszóval belép, kilépés működik; jelszó nélkül az adminban figyelmeztető sáv; a nyilvános láblécben nincs admin-link
  CHECK: node scripts/checks/p3-auth.mjs
  EXPECT: PASS: p3-auth
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=da0d800b2e0c5c7ff01249f7d4b2c2d8592c7bc64d370d6bcf30e9574a237ea5; output-bytes=2322

- [x] G20: Admin-használhatóság: minden törlés kétlépcsős megerősítéssel; az angol/német mezők lenyithatók és a hiányuk jelölve (az eseménylistán is); a tartalom-lap szekciónként menthető; túraútvonalak felvehetők/szerkeszthetők/törölhetők képekkel, a publikált útvonal a Túrák lapon kártyaként nagyítható képekkel jelenik meg, útvonal nélkül az illusztráció semleges jelmagyarázattal; az admin kezdőlapján e-mail- és Google-állapotpanel próba-e-mail gombbal
  CHECK: node scripts/with-server.mjs node scripts/checks/p3-admin-ux.mjs
  EXPECT: PASS: p3-admin-ux
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=f25aff62a1a554f4dac5eafdafbc83538ac6e61516ce35a62f91b6bdcf3bc7d1; output-bytes=1986

- [x] G21: E-mail szimulációval (helyi Resend-mock): kapcsolati üzenet az info@gyurusimenes.hu címre megy CONTACT_TO nélkül is, válaszcím a küldő; jelentkezésre értesítő a ménesnek és visszaigazolás a jelentkező nyelvén (hu, en, de); a szolgáltató hibájánál az adat megmarad és a látogató sikeres választ kap
  CHECK: node scripts/checks/p5-mail.mjs
  EXPECT: PASS: p5-mail
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=0e7e4f587a25a385acd4468e9107c2c56b228734f67e196874212701ac0744d0; output-bytes=866

- [x] G22: Google-értékelések a Google szabályai szerint (helyi Places-mock): csak a blokk közelébe görgetve kér adatot; vélemény és értékelés sehol nem tárolódik (csak a place ID és egy napi számláló); „Google Maps” jelzés, szerzői avatar, név és profil-link; a napi plafon felett és kulcs nélkül nincs blokk és nincs hívás; a strukturált adatban nincs aggregateRating
  CHECK: node scripts/checks/p5-reviews.mjs
  EXPECT: PASS: p5-reviews
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=2e55293369b28be70e4d1a0f617a1e874e675ad8714654a5f404d40bf5290fc5; output-bytes=1216

- [x] G23: SEO: minden nyilvános lap mindhárom nyelven egyedi, legfeljebb 60 karakteres title és 70–160 karakteres description, abszolút canonical, kölcsönös hreflang + x-default, pontosan egy H1, lapfüggő 1200×630-as OG-kép, lokalizált képleírások; a 404-es lap noindex és saját címet kap; a sitemap minden nyilvános URL-t tartalmaz nyelvi alternatívákkal; a régi WordPress-címek 301-gyel a megfelelő új lapra visznek
  CHECK: node scripts/with-server.mjs node scripts/checks/p6-seo.mjs
  EXPECT: PASS: p6-seo
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=d6abef383070f48e4bf9ae762971f50445e5b65ca6bacc690ca49a3890c25364; output-bytes=117

- [x] G24: Strukturált adat és GEO: érvényes JSON-LD csak igazolt adatokkal (LocalBusiness + SportsActivityLocation, a tulajdonos Personként, WebSite, BreadcrumbList az aloldalakon, Event az eseménylapokon, ItemList a naptárban); a robots.txt engedi a keresőket és az AI-keresőket, tiltja az admint és az API-t; az /llms.txt és /llms-full.txt csak igazolt tényeket tartalmaz; saját favicon és apple-icon (nem a Next.js sablon ikonja)
  CHECK: node scripts/with-server.mjs node scripts/checks/p6-geo.mjs
  EXPECT: PASS: p6-geo
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=38fcf5a97da2954beafaa848d708b694796cbda6d15de5c90b55040648f114db; output-bytes=149

- [x] G25: Nyilvános javítások: a 320–1920 px közötti 7 szélességen, 3 nyelven, az összes nyilvános lapon nincs vízszintes és fejléc-túlcsordulás; mobilon minden önálló érintési cél legalább 44 px; ismeretlen böngészőnyelvre angol oldal; üres beszámoló-blokk nem látszik; az űrlapok alatt adatkezelési link; a seedben nincs kitalált tartalom (a példaesemények csak `npm run db:demo`-val kerülnek a helyi adatbázisba)
  CHECK: node scripts/with-server.mjs node scripts/checks/p4-public.mjs
  EXPECT: PASS: p4-public
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=ff785b6496abd5ea895fe0fc533c916bbfb0d9f8dd7ef5c1d9e608ccc75a6c33; output-bytes=1450

- [x] G26: Teljes adatkezelési tájékoztató mindhárom nyelven: adatkezelő az impresszum mezőiből, adatkörönkénti cél és jogalap, megőrzési idők (egyeznek a G17 automatikus törlésével), érintetti jogok és NAIH-panaszjog, adatfeldolgozók (Netlify, Resend, Google)
  CHECK: node scripts/checks/p4-privacy.mjs
  EXPECT: PASS: p4-privacy
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Volumes/Samsung 1TB SSD/Weboldalak/gyurusi-menes; path=400472ccf252/24 entries; EXPECT=matched; output-sha256=6df41f01abcdd594b7d52590712490bbf70ce411fbcbed4bcbc99467457cf5eb; output-bytes=1121

- [ ] G27: Mobil sebesség: Lighthouse mobil (szimulált lassítás) a főoldalon, egy aloldalon, a naptárban, egy eseménylapon, valamint egy angol és egy német lapon Performance legalább 95, LCP legfeljebb 2,5 s, TBT legfeljebb 100 ms, CLS legfeljebb 0,05; a nyilvános lapok gyorsítótárból (statikusan vagy ISR-rel) szolgálódnak ki; mobilon a GSAP nem töltődik le
  CHECK: node scripts/with-server.mjs node scripts/checks/p7-speed.mjs
  EXPECT: PASS: p7-speed

- [ ] G28: Élő-szerű ellenőrzés Netlify draft deployon (valódi Blobs, CDN, függvénykorlátok): 20 egyidejű jelentkezés mind tárolva; 8 MB-os fotó és 12 MB-os PDF feltöltése és letöltése; admin-mentés után a nyilvános lap legfeljebb 15 s alatt frissül; gyorsítótár-találatnál TTFB legfeljebb 250 ms; Lighthouse mobil Performance legalább 95 a draft URL-en; a próbaadatok utána eltávolítva
  CHECK: node scripts/checks/final-live.mjs
  EXPECT: PASS: final-live
