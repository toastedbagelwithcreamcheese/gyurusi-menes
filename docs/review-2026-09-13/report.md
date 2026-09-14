# Gyűrűsi Ménes — átnézés a megbízó szempontjai szerint (2026-09-13)

39 szempont: rendben 20, részben 18, hiányzik 1; plusz 12 saját lelet.

## Kritikus
- **C12 — Hero-kép szerkeszthető; események képei szerkeszthetők** (részben)
  - Mérve: Kiválasztás a beépített 28 fotóból működik (G10: nyitókép-csere). Új, valós fotó feltöltése elbukik: local fotó 8.3 MB → POST [500] „hibaoldal” 60 s alatt; local PDF 2.6 MB → POST [500] „hibaoldal” 60 s alatt; live fotó 8.3 MB → POST [413] „hibaoldal” 71 s alatt; live PDF 2.6 MB → POST [504] „hibaoldal” 92 s alatt. A HEIC (iPhone-fotó Macről) a képfeldolgozóban nem is dekódolható (sharp heif bemenet: csak .avif).
  - Javaslat: Kritikus: a képet a böngésző méretezze és konvertálja feltöltés előtt (2000 px, JPEG/WebP, ~0,5 MB) — ez egyszerre oldja meg a méretkorlátot, a HEIC-et és a lassú mobilnetet; a szerver ezen felül adjon pontos üzenetet túl nagy fájlnál.
- **C03 — Egyesület oldal: beszámolók feltölthetők (jogi/támogatói követelmény)** (részben)
  - Mérve: A feltöltés működik kis fájllal (G10), de valós méretnél elbukik: local fotó 8.3 MB → POST [500] „hibaoldal” 60 s alatt; local PDF 2.6 MB → POST [500] „hibaoldal” 60 s alatt; live fotó 8.3 MB → POST [413] „hibaoldal” 71 s alatt; live PDF 2.6 MB → POST [504] „hibaoldal” 92 s alatt. A nyilvános Egyesület oldalon üres állapotban „Még nincs feltöltött beszámoló” áll.
  - Javaslat: Kritikus: a PDF-feltöltés ne a szerver-akción menjen át (Next alap 1 MB-os korlát, Netlify-függvény 6 MB) — közvetlen, darabolt feltöltés a tárba, vagy legalább a korlát emelése + előzetes méret-ellenőrzés érthető üzenettel. Amíg nincs beszámoló, a blokk ne látszódjon.
- **B20 — Admin: minden működik; hibánál részletesen elmondja a felhasználónak** (részben)
  - Mérve: A várt hibák (rossz fájltípus, dátum, hiányzó cím) a Flash-sávban részletesen jelennek meg (G15). A valós méretű feltöltés viszont általános „Váratlan hiba” lapot ad, élesben azonosító nélkül („Azonosító: —”), 60–92 s várakozás után: local fotó 8.3 MB → POST [500] „hibaoldal” 60 s alatt; local PDF 2.6 MB → POST [500] „hibaoldal” 60 s alatt; live fotó 8.3 MB → POST [413] „hibaoldal” 71 s alatt; live PDF 2.6 MB → POST [504] „hibaoldal” 92 s alatt.
  - Javaslat: A méret ellenőrzése még a böngészőben (pontos üzenet: „8,3 MB — legfeljebb 5 MB”), feltöltés közben folyamatjelző, és a szerver 413/504-e is a Flash-sávba kerüljön, ne a hibaoldalra.
- **C08 — Jelentkezés csak igényfelmérés; csak az adminban látszik, ki és hányan (Emese maga telefonál)** (részben)
  - Mérve: Élesben az admin jelszó nélkül nyílik: {'/admin': 200, '/admin/jelentkezesek': 200, '/admin/uzenetek': 200}, a láblécben „Admin” link: True — a jelentkezők neve és telefonszáma bárkinek látszik. Párhuzamos írás: 20 egyidejű jelentkezés (különböző IP): 10 kapott 200-at, 10 503-at, eltárolva 3.
  - Javaslat: Kritikus: admin jelszó azonnal (ADMIN_USER/ADMIN_PASSWORD a Netlify-on) és az „Admin” link ki a nyilvános láblécből. A jelentkezések és üzenetek külön kulcsokon tárolva (nem egy közös dokumentumban), hogy egyidejű beküldésnél se vesszen el egy sem.
- **B19 — Visszaigazolások és hibajelzések minden űrlapon; sok/nulla esemény állapot rendben** (részben)
  - Mérve: G15 QA: minden űrlap mezőre mutató, háromnyelvű hibát ad és visszaigazol. De: 20 egyidejű jelentkezés (különböző IP): 10 kapott 200-at, 10 503-at, eltárolva 3 — a visszaigazolt jelentkezések egy része elvész. Az űrlapoknál nincs link az adatkezelési tájékoztatóra.
  - Javaslat: Egyidejű beküldésnél se vesszen el adat (külön kulcsos tárolás, lásd C08), és az űrlap alá egy sor: „A küldéssel elfogadod az adatkezelési tájékoztatót” linkkel.
- **B14 — Asztali elrendezés rendezett; semmi nem lóg ki a navbarból; nincs „gagyi” elem (pl. elmosott sáv)** (részben)
  - Mérve: Vízszintes túlcsordulás 10 nézetben: a főoldal mobilon oldalra görgethető — 390 px-en +57 px, 320 px-en +127 px — a térkép-blokk miatt (.map: min-height 320 px × aspect-ratio 4/3 = 427 px széles; mérve); 768 px-en +2 px; németül 320 px-en a „Veranstaltungskalender” cím 342 px egy 280 px-es dobozban. Hibás kép: 0, H1-hiba: 0.
  - Javaslat: Kritikus mobilon: a térkép-blokk min-height helyett max-width: 100% + aspect-ratio (mobilon 4/3, min. magasság nélkül) — ez a főoldal oldalirányú „lötyögését” szünteti meg. A hosszú német szavakra a címeknél hyphens: auto (lang="de").
- **C09 — Konkrét üzenet az info@gyurusimenes.hu címre érkezzen; a DNS-t ők állítják be** (hiányzik)
  - Mérve: Netlify env: RESEND_API_KEY=nincs, CONTACT_TO=nincs → üzenet és jelentkezés csak az adminba kerül, e-mail nem megy. DNS: gyurusimenes.hu → 185.192.252.154 (a régi tárhely).
  - Javaslat: Ügyféltől: Resend-fiók (vagy más SMTP) és a gyurusimenes.hu SPF/DKIM rekordjai; nálunk CONTACT_TO=info@gyurusimenes.hu + kulcs. Addig az admin „Üzenetek” lapja az egyetlen csatorna — ezt élesítés előtt ki kell mondani nekik.
- **B23 — Visszaigazoló e-mail a jelentkezőnek (a megbízó javaslata)** (részben)
  - Mérve: A visszaigazoló e-mail kódja kész, háromnyelvű (sendRegistrationConfirmation), de élesben nem megy ki: RESEND_API_KEY=nincs.
  - Javaslat: Ugyanaz a teendő, mint C09-nél: e-mail-szolgáltató + DNS; élesítés után egy próbajelentkezéssel ellenőrizni, hogy megérkezik, és nem spam.
- **B22 — Google-értékelések az oldalon** (részben)
  - Mérve: Élesben 4,9★ / 43 / 5 vélemény. A Google Places szabályai (r9-google-policy.md, hivatalos oldalról idézve) szerint: a vélemények és az értékelés nem tárolhatók (csak a place ID) — nálunk 24 órás Blobs-cache + a főoldal revalidate=86400; a jelzés „Google Maps” logó vagy szöveg kell — nálunk „· Google”; a szerző avatarja is kell — nálunk nincs.
  - Javaslat: Megfelelővé tenni, különben a kulcsot a Google letilthatja: „Google Maps” jelzés a blokkon, szerzői avatar (photoUri), és a tárolás kiváltása — a vélemények lekérése a lap generálásakor, rövid CDN-élettartammal és költségplafonnal (Google Cloud kvóta: napi max. kérésszám).
- **B01 — Semmi kitalált tény az oldalon (árak, létszámok, díjak, vállalások); ellentmondásnál jelölni** (részben)
  - Mérve: Ellenőrizetlen vagy általam írt állítások az élő oldalon: két KITALÁLT közelgő esemény nyitott jelentkezéssel (őszi lovastúra 09-19 „reggel 9 órakor”, „félnapos”; őszi szüneti tábor 10-26–30 „ötnapos napközis”); a túratérkép jelmagyarázata („kezdőknek, rövid”, „egész délelőtt”); Táborok: „egy hétre”; adatkezelés: „A jelentkezéseket az esemény után töröljük” — ilyen kód nincs; az egyesület neve megerősítetlen.
  - Javaslat: Élesítés előtt: a két példaesemény ki az élő tárból (helyben maradhat), a térkép-jelmagyarázat semleges („1. útvonal”…) vagy az ügyfél mondatai, a tábor-hossz és az egyesület neve az ügyféltől; az adatkezelési ígéret vagy megvalósul (automatikus törlés), vagy kikerül.
- **X1 — Az adatkezelési tájékoztató nem teljes, és valótlant ígér**
  - Mérve: Nincs benne az adatkezelő neve/elérhetősége, a jogalap, a megőrzési idő, a NAIH-panaszjog; a „jelentkezéseket az esemény után töröljük” mondat mögött nincs kód. Jelentkezésnél telefonszámot gyűjtünk.
  - Javaslat: Szakember (jogász / adatvédelmi sablon) nézze át; a törlési ígéretet vagy megvalósítjuk (napi automatikus törlés az esemény után X nappal), vagy kivesszük.

## Fontos
- **C06 — Túrák: képek a túraútvonalakról és az útvonalakon történtekről; addig meglévő képek kitöltőnek** (részben)
  - Mérve: A /turak lapon illusztratív SVG-térkép (RouteMap.tsx, kódba égetve) + 3 általános kép az aloldal-képsávban. Útvonalanként nincs hely a képeknek, és az adminból nem szerkeszthető sem az útvonal, sem a hozzá tartozó kép.
  - Javaslat: Az ügyfél útvonal-képeket ÉS útvonalon készült képeket ígért: útvonalak az adminban (név, rövid leírás, térképkép vagy GPX, 2–4 fotó útvonalanként), a Túrák lapon útvonal-kártyákkal; az illusztráció csak addig, amíg nincs egy sem.
- **C04 — Főoldalon a ménesről pár infó, de a tulajdonos (Emese apukája) az előtérben** (részben)
  - Mérve: A tulajdonos-blokk közvetlenül a hero után áll (G9: data-owner a főoldalon), de a képe egy fekete mén („fekete-men”), nem a tulajdonos, és telefonszám nincs mellette (owner.phone üres, nem igazolt adat).
  - Javaslat: Portré Vörös Józsefről (te fotós vagy — egy rövid fotózás a ménesen), és a telefonszáma az ügyféltől. A portrétól lesz valóban „előtérben” a tulajdonos.
- **C10 — Az oldal alján az általános kapcsolati űrlap marad; ott is a tulajdonos és az ő telefonszáma, mindig ő elöl** (részben)
  - Mérve: A főoldal alján az általános űrlap megvan, a tulajdonos kártyája elöl (G9); a láblécben is elöl. A tulajdonos telefonszáma sehol nem látszik, mert nincs igazolt szám (owner.phone üres).
  - Javaslat: Vörös József telefonszáma (és ha van, e-mailje) az ügyféltől; beírva az adminban azonnal megjelenik a kártyán, a láblécben és a fejléc hívás-gombján is.
- **B05 — Navigációs sáv prémium, mindig látszik, olvasható, nem villog/nem marad le** (részben)
  - Mérve: Fejléc-túlcsordulás a 252 nézetből 11 esetben: német nyelven 1024 px-en minden lapon ~74–78 px-t lóg ki a pillből (a hívás-gomb levágva, képernyőkép nav-de-1024.png), magyarul 1024-en 3 px. 1280-tól mindhárom nyelv elfér. Mindig látszik, kompakt pill görgetésre.
  - Javaslat: A fejléc 1024–1180 px között (álló tablet, kis laptop) a hosszabb német menüpontokkal ne lógjon ki: ebben a sávban a nyelvkódok kerüljenek a hívás-gomb mellé egy lenyílóba, vagy a menüpontok betűköze/rése szűküljön; a gomb maradjon teljes.
- **C15 — Angol és német nyelv, automatikus nyelvválasztás és nyelvválasztó** (részben)
  - Mérve: HU/EN/DE lapok 200, Accept-Language: de → 302 /de, süti, robot → magyar (G9). De: a nem magyar/német böngésző (pl. lengyel, szlovák — a hucul-közösség!) magyar oldalt kap (proxy: negotiate(...) ?? DEFAULT_LANG). A 28 fotó alt-szövege csak magyar. Az adminban üresen hagyott EN/DE mező csendben magyarul jelenik meg az angol lapon. Fordítás-példák: „for riders who sit securely”, „a dead-end village”.
  - Javaslat: Ismeretlen nyelvű böngészőnek angol; képleírások három nyelven; az adminban jól látható jelzés, ha egy esemény angol/német szövege hiányzik (és opcionálisan „Fordítás” gomb); anyanyelvi lektor az EN/DE szövegekre.
- **B03 — Az admin nagyon egyszerű, nem fejlesztői admin** (részben)
  - Mérve: Az admin „Főoldal és kapcsolat” lapja 5131 px asztalon és 7267 px mobilon; minden szöveg háromszor (HU/EN/DE) beírandó; a képválasztó 28 bélyegképből áll, kereső nélkül; törlés (esemény a jelentkezéseivel, beszámoló, kép) megerősítés nélkül, egy kattintásra.
  - Javaslat: Az admin maradjon Emese-szintű: a magyar mező elöl, az EN/DE lenyitható „Fordítások” alatt; a hosszú lap fülekre bontva (Nyitókép · Tulajdonos · Bemutatkozás · Kapcsolat); minden törlés előtt „Biztosan törlöd?”; feltöltés közben folyamatjelző.
- **B04 — Prémium hatás: az olcsó ár mellett is profi, prémium megoldásokkal győzzön meg** (részben)
  - Mérve: A design prémium, de a böngészőfülön és a Google-találatban a Next.js sablon alapértelmezett favicon-ja látszik (src/app/favicon.ico = a create-next-app sablon fájlja, első commit), iOS kezdőképernyő-ikon (apple-icon) nincs; a megosztási kép (OG) csak magyar felirattal, minden lapon ugyanaz.
  - Javaslat: Saját favicon és apple-icon a lógóból (erdőzöld kör, fehér ló); lapfüggő OG-kép (aloldal fejléckép + cím, nyelvenként). Ez az a részlet, amit az ügyfél először lát, amikor elküldi valakinek a linket.
- **C02 — Főoldal egyszerű, letisztult, informatív; a jelenlegi design tetszik, ennél zsúfoltabb nem kell** (részben)
  - Mérve: Főoldal magassága: mobil (390) 10727 px, asztali (1440) 7812 px; szekciók: hero, tulajdonos, bemutatkozás (3 bekezdés + fajta-sáv), események, 5 csempe, 5 Google-vélemény, kapcsolat (2 kártya + űrlap), térkép. A megbeszélés óta a vélemények és a térkép került fel.
  - Javaslat: A főoldal ne nőjön tovább: a bemutatkozásból csak a kiemelt bekezdés + fajta-sáv maradjon a főoldalon, a 3 bekezdés „Tovább olvasom” lenyitással; a véleményekből mobilon 2–3 kártya vízszintes lapozóval. Tartalom nem vész el, csak rövidebb a görgetés.
- **B16 — Mobilon nagyon erős, kényelmes, egyszerű; nyelvválasztó rövid (HU/EN/DE vagy zászló), középre igazított** (részben)
  - Mérve: Mobilon a főoldal oldalirányban görgethető (lásd B14). Érintési célok (390 px, HU, 12 lap): 44 px alatti 260 db — főleg a lábléc linkjei (27 px magasak) és a közösségi ikonok (40×40); 24 px alatti (WCAG 2.2 AA célméret): 25 db — a lábléc jogi linkjei (22 px) és a főoldali kapcsolati kártya telefon/e-mail/térkép linkjei (20 px). Menü-nyelvváltó: HU/EN/DE, középre igazítva, de három teljes szélességű sorban (m-menu3).
  - Javaslat: A térkép-túlcsordulás javítása (B14); a lábléc és a kapcsolati kártya linkjei legalább 44 px magas sorral (padding-block), a közösségi ikonok 44×44; a mobil menüben a HU/EN/DE egy sorban, három egyforma gombként — kevesebb görgetés a menü alján.
- **X2 — Impresszum: hiányzó kötelező adatok**
  - Mérve: Adószám és nyilvántartási szám üres (legal.imprint.taxId/regNo); szolgáltatói adatként ezek kellenek.
  - Javaslat: Az ügyféltől bekérni, az /admin/jogi lapon beírni.
- **X3 — DNS-átállás és a régi címek**
  - Mérve: gyurusimenes.hu → 185.192.252.154 (régi WordPress); a régi oldalon ma 200: /kapcsolat/ és /egyesulet/, a huculosveny aldomain is él.
  - Javaslat: Átálláskor 301-es átirányítások: /kapcsolat → /#kapcsolat, /gyerektaborok → /taborok, /egyeni-oktatas és /oktatas/ → /oktatas, /menes → /, /bertartas → /; a huculosveny aldomain → /huculosveny; utána NEXT_PUBLIC_SITE_URL, Google Cégprofil weboldal-link, Search Console.
- **X4 — Nincs mentés a tartalomról**
  - Mérve: Az egész tartalom egyetlen Blobs-dokumentum; egy rossz mentés vagy törlés visszafordíthatatlan, verziózás nincs.
  - Javaslat: Napi automatikus másolat (utolsó 30 nap) és egy „Mentés letöltése” gomb az adminban.
- **X5 — Google Places-kulcs**
  - Mérve: A kulcs a beszélgetésben is elhangzott; a te („Ilona”) projektedben fut.
  - Javaslat: API-korlátozás csak Places API (New)-ra, napi kvóta-plafon a Cloud Console-ban; átadáskor új kulcs az ügyfél projektjében, a régi visszavonása.

## Csiszolás és üzleti
- **X6 — Kiemelt esemény: dupla címke** (csiszolás): Szekciócím maradjon „Események”, a kártyán a címke jelölje a kiemelést.
- **X7 — Korábbi események listája korlát nélkül nő** (csiszolás): Évenként csoportosítva, az utolsó 2 év nyitva.
- **X8 — Sebességkorlát memóriában** (csiszolás): A honeypot mellé egy könnyű ellenőrzés a tárban (utolsó beküldés ideje IP-hash szerint).
- **X10 — LCP 3,1–3,8 s (Lighthouse mobil, lassított hálózat)** (csiszolás): A fejlécképek mobilra kisebb forrásból (sizes + 1200 px-es felső határ), a hero-kép fetchPriority mellé preload; cél 2,5 s alatt.
- **X11 — Címsor-sorrend az eseménynaptárban** (csiszolás): Az eseménykártyák címe H2 legyen ezen a lapon (a látvány marad).
- **X12 — A 404-lap címe a főoldalé** (csiszolás): A 404-es lapnak saját címe: „Az oldal nem található · Gyűrűsi Ménes” (nyelvenként).
- **X9 — Az árlista és a megépült extrák** (üzleti): Döntsd el, mi „ajándék” és mi tétel — ha ajándék, az árlistán nevesítve mutasd meg (erősíti a prémium érzetet), ha tétel, egyeztesd előre.

## Rendben (mérve)
- C01 — Minden fontos résznek külön aloldal: Huculösvény, Túrák, Oktatás, Táborok, Egyesület: Az öt aloldal mindhárom nyelven 200 (G9 http-kapu), belső linkbejárás: 52 link, 0 hibás.
- C05 — Kiírva: a ménessel kapcsolatos ügyekben és lovak adásvételében a tulajdonost kell keresni: A mondat mindhárom nyelven a tulajdonos-blokkban, a kapcsolati kártyán és a láblécben (owner.note; G9 szerint a tulajdonos minden lapon a kapcsolattartó előtt).
- C07 — Eseménynaptár: modern, közelgő események, jelentkezés lehetséges: G15 forgatókönyves QA: jelentkezés hibái mezőre mutatnak, sikeres jelentkezés tárolva, lezárt eseményre „nem lehet jelentkezni”; 6 esemény rácsban, 0 eseménynél magyarázó szöveg.
- C11 — Minden aloldalon külön, az oldalhoz illő kapcsolati rész: Mind az 5 aloldalon data-page-contact blokk és saját űrlap (data-contact-form=<oldal>), a táboroknál a tábor saját e-mailje (G9).
- C13 — Kiemelt esemény: egy esemény nagyban, fókuszban: G15: pontosan egy kiemelt esemény a főoldalon és a naptárban, 6 közelgőnél is. Apróság: a szekció címe és a kártya címkéje ugyanaz („Kiemelt esemény”).
- C14 — Nincs galéria, a főoldalon sem; aloldalanként pár kép, nem sok: G8 no-gallery kapu: nincs galéria-útvonal, Lightbox-import, id=galeria; aloldalanként legfeljebb 3 kép (savePage), a nagyító csak ezekre.
- B02 — Valódi helyszíni fotók a design alapja; ne legyen generikus/AI-hatású, lovas-klisés: 28 saját, helyszíni fotó (G4 images-kapu: 5,9 MB összesen, minden alt megvan, minden tartalmi hivatkozás érvényes); stock- és AI-kép nincs.
- B06 — Aloldalak tudatosan felépítve; az oktatásnál a _42A4658.jpg kép: Az oktatás fejlécképe az osveny-ugras-gyerek = _42A4658.jpg (images.config.mjs 12. sor; seed pages.oktatas.images[0]); aloldal-keret: képfej címmel, szöveg + ragadós kapcsolat, képsáv, saját űrlap, kapcsolódó kártyák.
- B07 — Aloldalakon kapcsolati rész ÉS űrlap: Mind az 5 aloldal × 3 nyelv: data-page-contact + data-page-form + data-contact-form (G9).
- B08 — Túrák oldalon a képek nagyban megnézhetők; a fő hero-képek NEM: A képsáv képein data-zoom (G9: data-zoom="0" minden aloldalon), a hero-nagyító eltávolítva (SubPage.tsx: zoomItems = strip).
- B09 — Lábléc és a „készítette” rész a megbízó többi oldalának mintájára: Lábléc ftr2: nagy mondat + CTA, 3 ikonos oszlop, jogi sor, © + „Készült szenvedéllyel Zalaegerszegen”, „Weboldalt tervezte és fejlesztette Kovács Bálint · +36 30 872 3777” (G9: data-footer, data-credit, telefonszám a főoldalon).
- B10 — Látványos túraútvonal-grafika, mobilon is jól látható: SVG-térkép viewBox 20 90 940 450 + meet, mobilon kifutó, 26 px-es feliratok, a jobb szélső címke befelé (képernyőkép m-route2).
- B11 — „Mit találsz nálunk” egységes, egyforma méretű elemek: Csempék: 5 oszlop, 4:3 kép, háromsoros clamp, egyforma kártyák (tiles.png képernyőkép); mobilon 1 oszlop.
- B12 — Eseménynaptár feltöltve pár közelgő eseménnyel (túra a hétvégén, őszi tábor): A magban két közelgő példaesemény (őszi túra, őszi tábor) — tesztelésre, lásd B01 élesítési figyelmeztetését.
- B13 — Helyi adatbázis az egyszerű teszteléshez: data/seed.json a mag, data/site.json a helyi DB (gitignore), npm run db:reset; README „Helyi adatbázis és tesztelés” fejezet.
- B15 — Logó/név kattintásra azonnal a főoldalra: Élesben mérve: logó → főoldal 296–659 ms, scrollY 0 (ScrollTop + config-rewrite; a proxy RSC-hurok megszűnt).
- B17 — A navbar nem lóg bele a címekbe (eseménynaptár): Mérve: /esemenyek és /adatkezeles — fejléc alja 70 px, H1 teteje 178/172 px.
- B18 — Mobil menü bezáró ikonja, logója és felirata jól észrevehető: Nyitott menüben tömör, világos pill a fotó fölött, sötét X gomb, olvasható logó és felirat (m-menu3 képernyőkép).
- B21 — Google Maps a főoldali kapcsolatnál, nem csak link: Kattintásra betöltődő Google-térkép (MapEmbed), G9: data-map=idle és nincs iframe kattintás nélkül; G15: a gombra betöltődik; az adatkezelési szöveg kiegészítve.
- B24 — Technikai minőség: gyors, akadálymentes, SEO, mobilbarát: Lighthouse mobil: / P90/A100/BP100/SEO100 LCP 3.7 s, 442 KB; /turak P89/A100/BP100/SEO100 LCP 3.81 s, 469 KB; /esemenyek P92/A98/BP100/SEO100 LCP 3.43 s, 398 KB; /esemenyek/oszi-lovastura-2026-09-19 P94/A100/BP100/SEO100 LCP 3.07 s, 435 KB. Konzolhiba a rács-szkenben: 1 féle

## Ütközés-ellenőrzés az ügyfél kéréseivel (C01–C15)
- Galéria nem kerül vissza sehova (C14); a főoldal nem nő, a javaslat rövidít (C02).
- A jelentkezések továbbra is csak az adminban látszanak — a javaslat éppen ezt teszi valóban igazzá (jelszó) (C08).
- A tulajdonos elöl marad, portréval és telefonszámmal erősödik (C04, C10).
- Minden aloldal saját kapcsolata marad (C11); a kiemelt esemény egyetlen marad (C13); a három nyelv és az automatikus felismerés marad, csak ismeretlen nyelvre angol (C15).
- A túraútvonal-javaslat az ügyfél saját ígéretét (útvonal-képek + útvonalon készült képek) valósítja meg (C06).
