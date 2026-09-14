# Gyűrűsi Ménes — weboldal + admin (demó)

Modern, fotóvezérelt bemutatkozó oldal a Gyűrűsi Ménesnek (hucul, gidrán, shagya arab — Gyűrűs, Zala), egyszerű, nem-technikai adminnal.

## Indítás
```bash
npm install
cp .env.example .env.local   # élesben az ADMIN_PASSWORD kötelező
npm run dev                  # http://localhost:3000
```
Admin: `/admin`. Ha az `ADMIN_PASSWORD` be van állítva, a `/admin/belepes` lapon kell belépni (az `ADMIN_USER` nem kötelező; ha megadod, felhasználónév is kell). Nélküle az admin nyitott (demó), és minden admin-lap tetején figyelmeztető sáv áll. Részletek: „Admin: belépés és használat” lent.

## Mi hol van
- `data/seed.json` (mag) + helyben `data/site.json` — a szerkeszthető tartalomdokumentum (nyitókép, tulajdonos, bemutatkozás, aloldalak, események, beszámolók, feltöltések, jogi szövegek). Az admin ezt írja; a jelentkezések és az üzenetek külön élnek (lásd „Adatszerkezet, karbantartás, mentés”).
- `src/content/photos.json` + `public/images/photos/` — a kurált, optimalizált fotók. Forrás: `scripts/images.config.mjs`, generálás: `node scripts/prep-images.mjs`.
- `src/app/page.tsx` — főoldal; `src/components/site/Sections.tsx` — szekciók.
- `src/app/[lang]/admin/` — admin: `belepes/` a belépő oldal, `(panel)/` a menüs lapok (főoldal és kapcsolat, aloldalak, túraútvonalak, események, jelentkezések, beszámolók, képek, üzenetek, jogi), `(panel)/actions.ts` a szerver-akciók, `auth-actions.ts` a belépés és kilépés.
- `src/app/api/contact/route.ts` — kapcsolati űrlap: menti az üzenetet és Resend-del e-mailt küld (`RESEND_API_KEY`, `CONTACT_TO`).
- `docs/RESEARCH.md` — forrásolt kutatás; `docs/PHOTOS.md` — fotóelemzés; `DESIGN.md` — design rendszer; `docs/verified-facts.json` — tiltott/kötelező tartalom-minták a `scripts/verify.mjs`-hez.

## Ellenőrzés
```bash
npm run lint && npx tsc --noEmit && npm run build
node scripts/verify.mjs images
node scripts/verify.mjs content-no-fabrication
node scripts/verify.mjs css-motion
ADMIN_USER=… ADMIN_PASSWORD=… BASE_URL=http://localhost:3000 node scripts/verify.mjs http   # futó szerver mellett
```

## Élesítés
Netlify (`netlify.toml`, `@netlify/plugin-nextjs`). A tartalomtár Netlify-on automatikusan a Netlify Blobs (a függvények fájlrendszere csak olvasható), helyben és saját VPS-en (`npm run build && npm start`) a `data/` könyvtár. A napi karbantartást a `netlify/functions/daily-maintenance.mts` ütemezett függvény végzi — ezt a Netlify a deployjal együtt magától ütemezi, beállítás nem kell hozzá.

## Ami szándékosan nincs benne
Árak, nyitvatartás, hektár- és lólétszám-adatok, díjak — a kutatás szerint nem igazoltak vagy ellentmondóak; egyeztetés után az adminban pótolhatók.

## Adatszerkezet, karbantartás, mentés

Két driver, egy felület (`src/lib/store.ts`, `src/lib/records.ts`): helyben fájlok a `data/` alatt, Netlify-on Netlify Blobs (magától, ha a futtatókörnyezet adja a Blobs-kontextust).

| Mi | Helyben (fájl-driver) | Netlify Blobs |
|---|---|---|
| Tartalomdokumentum | `data/site.json` | „site” tár, `site` kulcs |
| Jelentkezések, rekordonként | `data/registrations/<id>.json` | „site” tár, `registrations/<id>` |
| Üzenetek, rekordonként | `data/messages/<id>.json` | „site” tár, `messages/<id>` |
| Feltöltött képek, PDF-ek | `data/files/` | „files” tár |
| Darabolt PDF-feltöltés darabjai (ideiglenes) | `data/files/chunks/<uploadId>/` | „files” tár, `chunks/<uploadId>/` |
| Napi mentések | `data/backups/YYYY-MM-DD.json` | „backups” tár, `YYYY-MM-DD.json` |
| A karbantartás utolsó futása | `data/maintenance.json` | „site” tár, `maintenance/last-run` |
| Sebességkorlát (IP-hash) | memória | „ratelimit” tár |

- **Egyidejű írás.** Egy jelentkezés vagy üzenet mindig új kulcsra kerül, sosem a közös dokumentumba, így az egyszerre érkező beküldések nem írják felül egymást. A tartalomdokumentumot (`writeSite`) Blobs-on ETag-feltételes írással mentjük (`onlyIfMatch`, illetve `onlyIfNew`, ha még nincs); ütközéskor újraolvasás, legfeljebb 10 kísérlet véletlen várakozással. Helyben folyamaton belüli sor + egyedi ideiglenes fájl + atomi átnevezés. A `writeSite` módosító függvénye ezért többször is lefuthat: csak a kapott dokumentumot módosítsa, mellékhatás nélkül.
- **Régi adatok.** Ha a tartalomdokumentumban még a korábbi `registrations` / `messages` tömbök állnak, az első listázás (admin) áthelyezi őket a saját kulcsaikra — duplikáció nélkül —, és utána kiveszi őket a dokumentumból.
- **Karbantartás** (`src/lib/maintenance.ts`):
  - a jelentkezések az esemény vége (`endDate`, ha nincs: `date`) után 30 nappal törlődnek; ha az esemény már nincs meg, a beérkezéstől számított 30 nap után;
  - a 365 napnál régebbi üzenetek törlődnek;
  - utána napi mentés készül (tartalomdokumentum + minden jelentkezés és üzenet) — a nap első mentése marad meg, és az utolsó 30 mentés;
  - a lejárt sebességkorlát-bejegyzések is törlődnek;
  - a 24 óránál régebben kezdett, félbemaradt PDF-feltöltések darabjai is törlődnek (`src/lib/chunks.ts`).
- **Mikor fut:** naponta a `netlify/functions/daily-maintenance.mts` ütemezett függvényből (`@daily` = 00:00 UTC); alkalmanként az admin *Jelentkezések* és *Üzenetek* lapjának betöltésekor (óránként legfeljebb egyszer); kézzel a `POST /api/admin/maintenance` hívással.
- **Mentés letöltése:** az admin kezdőlapján a „Mentés letöltése” gomb (`GET /api/admin/backup`) egy JSON-fájlt ad, ugyanazzal a szerkezettel, mint a napi mentés: `site` (a tartalomdokumentum), `registrations`, `messages`.
- **Az admin-API védelme:** minden `/api/admin/*` útvonal a `src/lib/admin-auth.ts` `requireAdmin()`-ját hívja (a proxy matchere az `/api`-t nem látja): belépési süti vagy Basic Auth nélkül 401 JSON. Az `/admin` lapokat a proxy ugyanezzel az ellenőrzéssel védi (a belépő oldalra irányít), az admin szerver-akciók pedig maguk is (`guard()`).
- **Sebességkorlát** (`src/lib/ratelimit.ts`): kapcsolati űrlap 15 s, jelentkezés 10 s IP-nként; a kulcs `sha256(só + IP)` első 24 hex jele, nyers IP nem tárolódik. A só a `RATELIMIT_SALT` környezeti változó, ha nincs, egy egyszer sorsolt, a „ratelimit” tárban őrzött érték. Általános forma: `hit(kulcs, ablakMs, max)`.
- **Tesztek:** a `DATA_DIR` környezeti változó a helyi adatkönyvtárat máshová teszi (a kapuk elszigetelt könyvtárban futnak). `node scripts/checks/p1-data.mjs` (G16: egyidejű írás mindkét driveren, migráció) és `node scripts/checks/p1-maintenance.mjs` (G17: karbantartás, mentés, ütemezett függvény, tartós sebességkorlát) — előtte `npm run build`. A Blobs-részt a `@netlify/blobs` helyi szimulátora futtatja (`scripts/checks/_p1-harness.mjs`).

## Feltöltések (képek, PDF-beszámolók)

A feltöltés NEM szerver-akción megy (annak törzse a Next-ben legfeljebb 1 MB, és a hibája általános hibalapot ad), hanem route handlereken, JSON-válasszal; minden hiba magyar, konkrét mondat a feltöltő alatt (Flash-sáv stílusban).

| | Böngésző | Szerver |
|---|---|---|
| **Kép** (`ImageUpload.tsx`: Képek lap + minden képválasztó alatt „Új kép feltöltése”) | dekódolás (`createImageBitmap`, tartalék `<img>`), hosszabb oldal 2400 px, WebP (tartalék JPEG) ~0,85 minőséggel, cél ≤ 1,5 MB; ha nem nyitható meg (pl. HEIC Chrome-ban): teendőt mondó üzenet | `POST /api/admin/upload-image` — típus, ≤ 4 MB, valódi képformátum; sharp → 2000 px WebP + elmosott előnézet + domináns szín |
| **PDF** (`ReportUpload.tsx`: Beszámolók lap) | típus, `%PDF-` az elején, méret ≤ 18 MB — pontos üzenet MB-ban, kérés nélkül; 3,5 MB-os darabok, darabonként egy újrapróbálás | `POST /api/admin/upload-chunk` (darab a tárba: `chunks/<uploadId>/<index>`), `POST /api/admin/upload-complete` (összefűzés, ellenőrzés, beszámoló-rekord, darabok törlése) |

- **Miért ezek a korlátok** (`src/lib/upload-limits.ts`): a Netlify-függvény kérése legfeljebb 6 MB, és a bináris törzs base64-ben utazik (+33%) — ezért 4 MB a kép és 3,5 MB egy darab. A streamelt függvényválasz legfeljebb 20 MB és 60 s (docs.netlify.com/build/functions/api) — a `/files/<kulcs>` ezen át adja ki a PDF-et, ezért a PDF-korlát 18 MB (tartalékkal).
- **Kiszolgálás:** a `/files/<kulcs>` streamel (Blobs: `get(..., { type: "stream" })`, helyben a lemezről), pontos `Content-Length`-szel (Blobs-on a feltöltéskor mentett `size` metaadatból), `Content-Type`-pal és `Content-Disposition: inline`-nal.
- **Félbemaradt feltöltés:** a darabok mellé egy leíró kerül a kezdés idejével; a napi karbantartás a 24 óránál régebbieket törli.
- **Teszt:** `node scripts/with-server.mjs node scripts/checks/p2-uploads.mjs` (G18: 8 MB-os JPEG, HEIC-üzenet, 2,6 / 12 MB-os PDF bájtra egyező letöltéssel, 25 MB-os méret-üzenet, folyamatjelző, szerkesztők képválasztója, szerveroldali korlátok, darab-takarítás, és ugyanez a Blobs-szimulátorral).

## Helyi adatbázis és tesztelés

Az oldal helyben **fájl-alapú adatbázissal** fut, adatbázis-szerver nélkül:

- `data/seed.json` — a **mag**: ez van a gitben, ebből indul az éles oldal Netlify Blobs-tára is az első futáskor.
- `data/site.json` — a **helyi adatbázis** (gitignore-olva): ezt írja az admin, ha helyben futtatod. Ha nincs, a mag jön.
- `data/registrations/`, `data/messages/` — a helyben beérkezett jelentkezések és üzenetek, `data/backups/` — a helyi napi mentések (mind gitignore-olva).
- `data/files/` — a helyben feltöltött képek és PDF-ek (gitignore-olva); élesben ugyanez a Netlify Blobs „files” tára.

```bash
npm run db:reset   # helyi adatbázis vissza a magra (data/site.json ← data/seed.json; feltöltések, jelentkezések, üzenetek, mentések törölve)
npm run db:demo    # + két példaesemény a helyi adatbázisba (közelgő túra kiemelve, tábor), jelentkezés nyitva — a dátumok a mai naphoz igazodnak
npm run dev        # http://localhost:3000 — admin: http://localhost:3000/admin (helyben jelszó nélkül)
```

Amit az adminban helyben felviszel, az csak a gépeden van. Ha valamit a magba akarsz tenni (hogy élesbe is menjen a következő deployjal), másold a `data/site.json` tartalmát a `data/seed.json`-ba, és commitold — a példaeseményeket (`pelda-lovastura`, `pelda-lovastabor`) előbb vedd ki: kitalált időpontot és programot tartalmaznak, a `node scripts/verify.mjs content-no-fabrication` meg is fogja őket.

**A mag nem tartalmaz kitalált eseményt.** A korábbi két példaesemény (őszi lovastúra, őszi szüneti tábor) és a Táborok „egy hétre” kitétele kikerült; a már feltöltött tárakból (Netlify Blobs, régi `site.json`) a `store.ts` `migrateLegacyContent`-je olvasáskor kiveszi a két régi eseményt (csak ha az azonosítója és a magyar címe is a régi), és a szó szerint változatlan régi adatkezelési szöveget az újra cseréli.

## Nyilvános lapok: nyelv, adatkezelés, mobil

- **Nyelvválasztás** (`src/lib/negotiate.ts` `preferredLang`, `src/proxy.ts`): a süti dönt; ha nincs, az `Accept-Language` első támogatott nyelve (hu/en/de); ha a böngésző csak más nyelvet kér (pl. pl, sk, cs, fr, it), **angol**; üres vagy `*` fejlécre és robotnak magyar.
- **Képleírások** nyelvenként: `src/content/photos.json` `alt` / `alt_en` / `alt_de` (forrás: `scripts/images.config.mjs`); `resolveImage(id, site, lang)`, `<Photo lang>`. A feltöltött képek leírása egynyelvű (amit a feltöltő megad).
- **Adatkezelési tájékoztató** (`src/lib/privacy.ts`): a `legal.privacy` szöveg sablon — `## ` = alcím, `- ` = felsorolás; `{{controller}}` = az impresszum kitöltött mezői, `{{contactEmail}}`, és `{{registrationDays}}` / `{{messageDays}}` / `{{backupDays}}` a `src/lib/maintenance.ts` állandóiból, így a számok mindig azok, amelyekkel a karbantartás töröl. A külső adatok (NAIH, Netlify, Resend, Google) forrása: `docs/RESEARCH.md` 15. pont. Az `/admin/jogi` lap jogi átnézést javasol.
- **Mobil és fejléc:** a 900–1240 px-es sávban a nyelvkódok lenyílóba kerülnek (`LangMenu`); mobilon minden önálló érintési cél legalább 44 px; a főoldali bemutatkozás törzsszövege „Tovább olvasom” lenyitással; a korábbi események évenként (a legutóbbi két év nyitva); az Egyesület beszámoló-blokkja csak közzétett beszámolóval jelenik meg; mindkét űrlap alatt link az adatkezelési tájékoztatóra.
- **Tesztek:** `node scripts/with-server.mjs node scripts/checks/p4-public.mjs` (G25: 11 lap × 3 nyelv × 7 szélesség túlcsordulás, fejléc, érintési célok, nyelvválasztás, űrlapok, seed) és `node scripts/checks/p4-privacy.mjs` (G26: saját szerverrel; kötelező részek, impresszumból kitöltött adatkezelő, a megőrzési számok a kód állandóiból) — előtte `npm run build`.

## Admin: belépés és használat

- **Belépés** (`src/lib/admin-auth.ts` — a védelem egyetlen helye): ha az `ADMIN_PASSWORD` be van állítva, az `/admin` lapok a `/admin/belepes` oldalra visznek (`?next=` a kért lappal), az `/api/admin/*` 401 JSON-t ad. Belépés után `gm_admin` süti: HMAC-SHA256-tal aláírt (Web Crypto, így a proxyban is ellenőrizhető), 30 napos, HttpOnly, Secure, SameSite=Lax. Az aláíró kulcs a jelszóból (+ `ADMIN_USER`, + az opcionális `ADMIN_SESSION_SECRET`) származik, ezért jelszócsere után minden korábbi belépés érvénytelen. A süti állapotmentes: a „Kilépés” a böngészőből törli, de egy korábban lemásolt süti a lejáratáig érvényes maradna — ilyenkor a jelszó (vagy az `ADMIN_SESSION_SECRET`) cseréje segít. A Basic Auth fejléc (szkriptekhez) továbbra is elfogadott.
- **Rossz jelszó:** magyar hibaüzenet a hátralévő próbák számával; 5 sikertelen próba 15 percen belül → 15 perc tiltás IP-nként (a P1 tartós korlátjával: `hit`, `peek`, `resetHits`). A tiltás alatt a helyes jelszó sem enged be; az üzenet megmondja, hány perc múlva lehet újra.
- **Proxy és szerver-akciók:** a proxy matchere az admin címeit kiterjesztéstől és nyelvi előtagtól függetlenül lefedi (korábban a `.png`/`.txt`/`.xml`-végű admin-címek kimaradtak, és egy admin szerver-akció így a proxy megkerülésével is elérhető volt). Ezen felül minden admin szerver-akció első sora `await guard()`.
- **Jelszó nélkül** (demó) az admin nyitott, és minden admin-lap tetején figyelmeztető sáv áll. A nyilvános láblécben nincs admin-link.
- **Kétlépcsős törlés** (`(panel)/ConfirmButton.tsx`): az első kattintás „Biztosan törlöd? Igen, törlöm / Mégse”, 6 s után visszaáll; natív `confirm()` nincs. Esemény, jelentkezés, üzenet, kép, beszámoló, útvonal.
- **Fordítások:** az `LField`-ben a magyar mező elöl, az angol és a német a lenyitható „Fordítások (angol, német)” részben; a címke mutatja a hiányt („Hiányzik: EN, DE” / „Kész”). Az esemény- és az útvonal-listán jelvény, ha egy közzétett elem angol vagy német szövege hiányzik (`src/lib/translations.ts`).
- **Főoldal és kapcsolat:** négy külön mentett rész (Nyitókép · Tulajdonos · Bemutatkozás · Kapcsolat), felül ugró-fülekkel; a `saveHero`, `saveOwner`, `saveIntro`, `saveContact` akció csak a saját részét írja.
- **Túraútvonalak:** a tartalomdokumentum `routes` tömbje — `{ id, name, summary, mapImage?, photos (legfeljebb 4), published, order }` —, a magban üres (útvonalat nem találunk ki). Admin: `/admin/utvonalak` (sorrend, közzététel) és `/admin/utvonalak/[id]` (képválasztó, több képes fotóválasztó, a P2 feltöltője). A Túrák lapon a közzétett útvonalak kártyaként jelennek meg, nagyítható képekkel; ha nincs ilyen, az illusztrált térkép marad, a jelmagyarázatban csak a körök neveivel.
- **Állapotpanel** az admin kezdőlapján: e-mail (`RESEND_API_KEY`, `CONTACT_TO` — alapértelmezés: `info@gyurusimenes.hu` —, `CONTACT_FROM`), Google (`GOOGLE_PLACES_KEY`, `GOOGLE_PLACE_ID`), admin (`ADMIN_PASSWORD`, `ADMIN_USER`). Kulcsot és jelszót nem mutat, csak azt, hogy be van-e állítva. A „Próba e-mail küldése” a `src/lib/mail.ts` küldőjével megy a valódi címzettnek.
- **Tesztek:** `node scripts/checks/p3-auth.mjs` (G19; maga indítja a szervereket) és `node scripts/with-server.mjs node scripts/checks/p3-admin-ux.mjs` (G20; a próba e-mail sikerét helyi Resend-mockkal méri, a `RESEND_API_URL` változón át) — előtte `npm run build`.

## Integrációk (környezeti változók) és helyi szimuláció

Kulcs nélkül minden integráció csendben kikapcsol — az oldal és az admin ugyanúgy működik.

| Változó | Mire | Alap |
|---|---|---|
| `RESEND_API_KEY` | e-mail küldés (kapcsolati üzenet, jelentkezési értesítő + visszaigazolás) | nincs → nem küld, csak az adminban látszik |
| `CONTACT_TO` | a ménes címzett-címe | `info@gyurusimenes.hu` |
| `CONTACT_FROM` | feladó (a domaint a Resendben hitelesíteni kell: SPF/DKIM) | `Gyűrűsi Ménes <weboldal@gyurusimenes.hu>` |
| `RESEND_API_BASE` | a szolgáltató címe (helyi mockhoz) | `https://api.resend.com` |
| `GOOGLE_PLACES_KEY` | Google-értékelések a főoldalon (Places API New) | nincs → se blokk, se hívás |
| `GOOGLE_PLACE_ID` | a cégprofil azonosítója | nincs → egyszeri keresés, az azonosító eltárolva |
| `GOOGLE_REVIEWS_DAILY_CAP` | napi betöltési keret (felette 429, a blokk eltűnik) | `30` |
| `GOOGLE_PLACES_API_BASE` | a Places címe (helyi mockhoz) | `https://places.googleapis.com` |

A Google szabályai szerint a vélemény és az értékelés **nem tárolható** (se Blobs, se ISR): a főoldal csak egy üres vázat ad, a böngésző a blokk közelében (600 px) kéri a `GET /api/reviews`-t, ami élőben kérdez (`Cache-Control: no-store`). Tárolva csak a place ID és a napi számláló van (Blobs „google”, helyben `data/google/`). A `GOOGLE_PLACES_KEY` a build idején is legyen beállítva (a váz a lap renderelésekor dől el).

```bash
node scripts/mock-resend.mjs --port 4010   # RESEND_API_KEY=teszt RESEND_API_BASE=http://127.0.0.1:4010
node scripts/mock-places.mjs --port 4020   # GOOGLE_PLACES_KEY=teszt GOOGLE_PLACES_API_BASE=http://127.0.0.1:4020 GOOGLE_PLACE_ID=p5-mock-place-id
node scripts/checks/p5-mail.mjs            # G21 (saját build + next start a 3041-es porton)
node scripts/checks/p5-reviews.mjs         # G22 (két build: kulccsal és nélküle; Blobs-szimulátorral is)
```
