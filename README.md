# Gyűrűsi Ménes — weboldal + admin (demó)

Modern, fotóvezérelt bemutatkozó oldal a Gyűrűsi Ménesnek (hucul, gidrán, shagya arab — Gyűrűs, Zala), egyszerű, nem-technikai adminnal.

## Indítás
```bash
npm install
cp .env.example .env.local   # élesben az ADMIN_PASSWORD kötelező
npm run dev                  # http://localhost:3000
```
Admin: `/admin`. Ha az `ADMIN_PASSWORD` be van állítva, a `/admin/belepes` lapon kell belépni (az `ADMIN_USER` nem kötelező; ha megadod, felhasználónév is kell). Nélküle `npm run dev` alatt nyitott; production buildben (Netlify, `npm start`) **zárva** — a belépő oldal kiírja, mit kell beállítani —, kivéve ha `ADMIN_OPEN_DEMO=1` (tudatosan jelszó nélküli bemutató, figyelmeztető sávval). Részletek: „Admin: belépés és használat” lent.

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
node scripts/with-server.mjs node scripts/verify.mjs lighthouse   # G11: főoldal + minden nyilvános lap akadálymentessége (≥ 95, színkontraszt)
node scripts/with-server.mjs node scripts/shots.mjs              # G12: képek + vízszintes görgetés, konzolhiba, nyelvváltó (asztal és mobil)
ADMIN_USER=… ADMIN_PASSWORD=… BASE_URL=http://localhost:3000 node scripts/verify.mjs http   # futó szerver mellett
```

## Élesítés
Netlify (`netlify.toml`, `@netlify/plugin-nextjs`), adatbázis és fájltár: **Supabase** (lásd „Supabase” lent). A Netlify-függvények fájlrendszere csak olvasható, ezért élesben Supabase nélkül semmit nem lehet menteni; helyben, beállítás nélkül a `data/` könyvtár a tár. A napi karbantartást a `netlify/functions/daily-maintenance.mts` ütemezett függvény végzi — ezt a Netlify a deployjal együtt magától ütemezi, beállítás nem kell hozzá.

**Deploy:** `node scripts/deploy.mjs --prod` (draft: `node scripts/deploy.mjs`). Sima `netlify deploy --build` helyett ezt használd: a Netlify Next-pluginja a szerverfüggvénybe csomagolná a `.env.local`-t (a valódi kulcsokkal); a szkript a build idejére félreteszi, és utána ellenőrzi, hogy a csomagban nincs `.env` fájl.

Élesítés előtt a Netlify környezeti változói (Site configuration → Environment variables; módosítás után új deploy kell):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — **kötelező**: nélkülük az oldal a magot mutatja, és semmi nem menthető. A service_role kulcs titkos (`--secret`).
- `ADMIN_PASSWORD` — **kötelező**: nélküle az új kód adminja zárva marad. Tudatosan jelszó nélküli bemutatóhoz `ADMIN_OPEN_DEMO=1` (élesítéskor töröld).
- `NEXT_PUBLIC_SITE_URL` — a DNS-átállás után `https://gyurusimenes.hu`; build-idejű (lásd „Éles cím” lent).
- `RESEND_API_KEY` (+ a Resend DNS-rekordjai), `GOOGLE_PLACES_KEY` (+ napi keret) — ha kellenek; lásd „Integrációk”.
- **A régi Huculösvény-aldomain** (`huculosveny.gyurusimenes.hu`, ma a WordPress-oldal): a `next.config.ts` host-feltételes szabálya minden címét — a régi PDF-címeket is — 301-gyel a `https://gyurusimenes.hu/huculosveny` lapra küldi. Élesítéskor az aldomaint domain aliasként a Netlify-oldalhoz kell adni (Domain management), és a DNS-ben a Netlify-ra irányítani; addig a szabály nem kap kérést. Teszt: a p6-seo Host-fejléces kéréssel (kontroll: más hoszton nincs átirányítás).

## Supabase (adatbázis és fájltár)

1. **Séma:** Supabase → SQL Editor → a `supabase/migrations/20260914200000_adatreteg.sql` teljes tartalma → Run. Többször is futtatható. Létrehozza a 6 táblát (`site_content`, `registrations`, `messages`, `kv`, `rate_limits`, `backups`) sorszintű védelemmel (RLS, szabály nélkül: az anon kulcs semmihez nem fér hozzá), és a két privát Storage-tárolót (`files` ≤ 25 MB, `upload-chunks` ≤ 4 MB).
2. **Ellenőrzés:** `node scripts/supabase-import.mjs --check` — csak olvas: megvan-e minden tábla és tároló, és az anon kulcs tényleg nem olvas, nem ír.
3. **Adatátköltöztetés** a korábbi, Netlify Blobs-os élő oldalról (a Supabase-es kód élesítése ELŐTT): `node scripts/supabase-import.mjs --from-url https://gyurusi-menes-demo.netlify.app` (`--dry-run` előbb). Letöltött mentésből: `--from-file mentes.json --files-from <oldal>`. A dokumentumot üres táblába teszi, eltérő meglévőt csak `--force`-szal ír felül; a rekordokat és a fájlokat duplikáció nélkül viszi át, a végén bájtra visszaolvas.
4. **Netlify:** `netlify env:set SUPABASE_URL …`, `netlify env:set SUPABASE_SERVICE_ROLE_KEY … --secret --context production deploy-preview branch-deploy`, majd `node scripts/deploy.mjs --prod`.
5. **Helyi tesztkörnyezet:** `node scripts/supabase-local.mjs start | reset | env | stop` — Docker (Colima) kell; csak adatbázis, REST, Storage és átjáró fut, az 5435x portokon. A Colima a külső SSD-t nem csatolja, ezért a stack a `~/.cache/gyurusi-menes-supabase` alól indul (a repó `supabase/` mappája minden indításkor oda másolódik).

## Ami szándékosan nincs benne
Árak, nyitvatartás, hektár- és lólétszám-adatok, díjak — a kutatás szerint nem igazoltak vagy ellentmondóak; egyeztetés után az adminban pótolhatók.

## Adatszerkezet, karbantartás, mentés

Két driver, egy felület (`src/lib/store.ts`, `src/lib/records.ts`, a kapcsolat: `src/lib/supabase.ts`): **Supabase**, ha a `SUPABASE_URL` és a `SUPABASE_SERVICE_ROLE_KEY` be van állítva (és a `STORE_DRIVER` nem `file`); különben fájlok a `data/` alatt. A Supabase-t csak a szerver éri el, a service_role kulccsal, SDK nélkül (`node:http(s)` — a Next becsomagolt `fetch`-e egy ISR-lap renderelésekor adat-gyorsítótárba tenné a lekérdezést).

| Mi | Helyben (fájl-driver) | Supabase |
|---|---|---|
| Tartalomdokumentum | `data/site.json` | `site_content` tábla, `id = 'site'` sor (`data` jsonb + `version`) |
| Jelentkezések, soronként | `data/registrations/<id>.json` | `registrations` tábla |
| Üzenetek, soronként | `data/messages/<id>.json` | `messages` tábla |
| Feltöltött képek, PDF-ek | `data/files/` | „files” Storage-tároló (privát) |
| Darabolt PDF-feltöltés darabjai (ideiglenes) | `data/files/chunks/<uploadId>/` | „upload-chunks” tároló, `<uploadId>/` |
| Napi mentések | `data/backups/YYYY-MM-DD.json` | `backups` tábla |
| A karbantartás utolsó futása | `data/maintenance.json` | `kv` tábla, `maintenance/last-run` |
| Sebességkorlát (IP-hash) | memória | `rate_limits` tábla (a só: `kv`, `ratelimit/salt`) |
| Google place ID, napi hívásszámláló | `data/google/` | `kv` tábla, `google/place-id`, `google/daily-calls` |

- **Egyidejű írás.** Egy jelentkezés vagy üzenet mindig új kulcsra kerül, sosem a közös dokumentumba, így az egyszerre érkező beküldések nem írják felül egymást. A tartalomdokumentumot (`writeSite`) Supabase-en feltételes frissítéssel mentjük (`PATCH … version=eq.<beolvasott>`, a verzió léptetésével; ha még nincs sor, `ON CONFLICT DO NOTHING` beszúrás); ha a feltétel közben megszűnt (üres válasz), újraolvasás, legfeljebb 10 kísérlet véletlen várakozással. Helyben folyamaton belüli sor + egyedi ideiglenes fájl + atomi átnevezés. A `writeSite` módosító függvénye ezért többször is lefuthat: csak a kapott dokumentumot módosítsa, mellékhatás nélkül.
- **Régi adatok.** Ha a tartalomdokumentumban még a korábbi `registrations` / `messages` tömbök állnak, az első listázás (admin) áthelyezi őket a saját kulcsaikra — duplikáció nélkül —, és utána kiveszi őket a dokumentumból.
- **Karbantartás** (`src/lib/maintenance.ts`):
  - a jelentkezések az esemény vége (`endDate`, ha nincs: `date`) után 30 nappal törlődnek; ha az esemény már nincs meg, a beérkezéstől számított 30 nap után;
  - a 365 napnál régebbi üzenetek törlődnek;
  - utána napi mentés készül (tartalomdokumentum + minden jelentkezés és üzenet) — a nap első mentése marad meg, és az utolsó 30 mentés;
  - a lejárt sebességkorlát-bejegyzések is törlődnek;
  - a 24 óránál régebben kezdett, félbemaradt PDF-feltöltések darabjai is törlődnek (`src/lib/chunks.ts`).
- **Mikor fut:** naponta a `netlify/functions/daily-maintenance.mts` ütemezett függvényből (`@daily` = 00:00 UTC); alkalmanként az admin *Jelentkezések* és *Üzenetek* lapjának betöltésekor (óránként legfeljebb egyszer); kézzel a `POST /api/admin/maintenance` hívással.
- **Mentés letöltése:** az admin kezdőlapján a „Mentés letöltése” gomb (`GET /api/admin/backup`) egy JSON-fájlt ad, ugyanazzal a szerkezettel, mint a napi mentés: `site` (a tartalomdokumentum), `registrations`, `messages`.
- **Az admin-API védelme:** minden `/api/admin/*` útvonal a `src/lib/admin-auth.ts` `requireAdmin()`-ját hívja (a proxy matchere az `/api`-t nem látja): belépési süti vagy Basic Auth nélkül 401 JSON (jelszó nélküli éles futásban 503, a teendővel). Az `/admin` lapokat a proxy ugyanezzel az ellenőrzéssel védi (a belépő oldalra irányít), az admin szerver-akciók pedig maguk is (`guard()`).
- **Sebességkorlát** (`src/lib/ratelimit.ts`): kapcsolati űrlap 15 s, jelentkezés 10 s IP-nként; a kulcs `sha256(só + IP)` első 24 hex jele, nyers IP nem tárolódik. A só a `RATELIMIT_SALT` környezeti változó, ha nincs, egy egyszer sorsolt, a `kv` táblában őrzött érték. Általános forma: `hit(kulcs, ablakMs, max)`.
- **Tesztek:** a `DATA_DIR` környezeti változó a helyi adatkönyvtárat máshová teszi (a kapuk elszigetelt könyvtárban futnak). `node scripts/checks/p1-data.mjs` (G16: egyidejű írás mindkét driveren, migráció) és `node scripts/checks/p1-maintenance.mjs` (G17: karbantartás, mentés, ütemezett függvény, tartós sebességkorlát) — előtte `npm run build`. A Supabase-részt a **helyi** Supabase futtatja (`scripts/supabase-local.mjs`, nem az éles projekt), elé egy mérő előtéttel, amely a feltételes írásokat és az ütközéseket számolja (`scripts/checks/_p1-harness.mjs`).

## Feltöltések (képek, PDF-beszámolók)

A feltöltés NEM szerver-akción megy (annak törzse a Next-ben legfeljebb 1 MB, és a hibája általános hibalapot ad), hanem route handlereken, JSON-válasszal; minden hiba magyar, konkrét mondat a feltöltő alatt (Flash-sáv stílusban).

| | Böngésző | Szerver |
|---|---|---|
| **Kép** (`ImageUpload.tsx`: Képek lap + minden képválasztó alatt „Új kép feltöltése”) | dekódolás (`createImageBitmap`, tartalék `<img>`), hosszabb oldal 2400 px, WebP (tartalék JPEG) ~0,85 minőséggel, cél ≤ 1,5 MB; ha nem nyitható meg (pl. HEIC Chrome-ban): teendőt mondó üzenet | `POST /api/admin/upload-image` — típus, ≤ 4 MB, valódi képformátum; sharp → 2000 px WebP + elmosott előnézet + domináns szín |
| **PDF** (`ReportUpload.tsx`: Beszámolók lap) | típus, `%PDF-` az elején, méret ≤ 18 MB — pontos üzenet MB-ban, kérés nélkül; 3,5 MB-os darabok, darabonként egy újrapróbálás | `POST /api/admin/upload-chunk` (darab a tárba: `<uploadId>/<index>`), `POST /api/admin/upload-complete` (összefűzés, ellenőrzés, beszámoló-rekord, darabok törlése) |

- **Miért ezek a korlátok** (`src/lib/upload-limits.ts`): a Netlify-függvény kérése legfeljebb 6 MB, és a bináris törzs base64-ben utazik (+33%) — ezért 4 MB a kép és 3,5 MB egy darab. A streamelt függvényválasz legfeljebb 20 MB és 60 s (docs.netlify.com/build/functions/api) — a `/files/<kulcs>` ezen át adja ki a PDF-et, ezért a PDF-korlát 18 MB (tartalékkal).
- **Kiszolgálás:** a `/files/<kulcs>` streamel (Supabase Storage-ból a service_role kulccsal, helyben a lemezről), pontos `Content-Length`-szel, `Content-Type`-pal és `Content-Disposition: inline`-nal. A tárolók privátak: a fájl csak ezen az útvonalon érhető el.
- **Félbemaradt feltöltés:** a darabok mellé egy leíró kerül a kezdés idejével; a napi karbantartás a 24 óránál régebbieket törli.
- **Teszt:** `node scripts/with-server.mjs node scripts/checks/p2-uploads.mjs` (G18: 8 MB-os JPEG, HEIC-üzenet, 2,6 / 12 MB-os PDF bájtra egyező letöltéssel, 25 MB-os méret-üzenet, folyamatjelző, szerkesztők képválasztója, szerveroldali korlátok, darab-takarítás, és ugyanez a helyi Supabase-zel).

## Helyi adatbázis és tesztelés

Az oldal helyben **fájl-alapú adatbázissal** fut, adatbázis-szerver nélkül:

- `data/seed.json` — a **mag**: ez van a gitben; egy üres Supabase-adatbázisba az első olvasás ezt teszi be (a build sosem ír az adatbázisba).
- `data/site.json` — a **helyi adatbázis** (gitignore-olva): ezt írja az admin, ha helyben futtatod. Ha nincs, a mag jön.
- `data/registrations/`, `data/messages/` — a helyben beérkezett jelentkezések és üzenetek, `data/backups/` — a helyi napi mentések (mind gitignore-olva).
- `data/files/` — a helyben feltöltött képek és PDF-ek (gitignore-olva); élesben ugyanez a Supabase „files” tárolója.
- **Figyelem:** ha a `.env.local`-ban be van állítva a `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, a helyi `npm run dev` az **éles** adatbázist írja. Csak a fájl-driverhez: `STORE_DRIVER=file npm run dev`. A tesztkapuk a kulcsokat üres értékkel kizárják.

```bash
npm run db:reset   # helyi adatbázis vissza a magra (data/site.json ← data/seed.json; feltöltések, jelentkezések, üzenetek, mentések törölve)
npm run db:demo    # + két példaesemény a helyi adatbázisba (közelgő túra kiemelve, tábor), jelentkezés nyitva — a dátumok a mai naphoz igazodnak
npm run dev        # http://localhost:3000 — admin: http://localhost:3000/admin (helyben jelszó nélkül)
```

Amit az adminban helyben felviszel, az csak a gépeden van. Ha valamit a magba akarsz tenni (hogy élesbe is menjen a következő deployjal), másold a `data/site.json` tartalmát a `data/seed.json`-ba, és commitold — a példaeseményeket (`pelda-lovastura`, `pelda-lovastabor`) előbb vedd ki: kitalált időpontot és programot tartalmaznak, a `node scripts/verify.mjs content-no-fabrication` meg is fogja őket.

**A mag nem tartalmaz kitalált eseményt.** A korábbi két példaesemény (őszi lovastúra, őszi szüneti tábor) és a Táborok „egy hétre” kitétele kikerült; a már feltöltött tárakból (Netlify Blobs → Supabase, régi `site.json`) a `store.ts` `migrateLegacyContent`-je olvasáskor kiveszi a két régi eseményt (csak ha az azonosítója és a magyar címe is a régi), és a szó szerint változatlan régi adatkezelési szöveget az újra cseréli.

## Nyilvános lapok: nyelv, adatkezelés, mobil

- **Nyelvválasztás** (`src/lib/negotiate.ts` `preferredLang`, `src/proxy.ts`): a süti dönt; ha nincs, az `Accept-Language` első támogatott nyelve (hu/en/de); ha a böngésző csak más nyelvet kér (pl. pl, sk, cs, fr, it), **angol**; üres vagy `*` fejlécre és robotnak magyar.
- **Képleírások** nyelvenként: `src/content/photos.json` `alt` / `alt_en` / `alt_de` (forrás: `scripts/images.config.mjs`); `resolveImage(id, site, lang)`, `<Photo lang>`. A feltöltött képeké háromnyelvű (`Upload.alt: { hu, en, de }`): a feltöltőben a magyar kötelező (nélküle a szerver is 400-zal utasítja el), az angol és a német a „Fordítások” alatt, utólag a Képek lap „Feltöltött képek leírása” részében, hiányjelzéssel; hiányzó fordításnál a magyar jelenik meg. A fájlnév sosem lesz leírás: a régi, egynyelvű tárolt leírást a `store.ts` olvasáskor alakítja át, a fájlnévnek látszót (pl. `IMG_1234.jpg`) üresre.
- **Adatkezelési tájékoztató** (`src/lib/privacy.ts`): a `legal.privacy` szöveg sablon — `## ` = alcím, `- ` = felsorolás; `{{controller}}` = az impresszum kitöltött mezői, `{{contactEmail}}`, és `{{registrationDays}}` / `{{messageDays}}` / `{{backupDays}}` a `src/lib/maintenance.ts` állandóiból, így a számok mindig azok, amelyekkel a karbantartás töröl. A külső adatok (NAIH, Netlify, Supabase, Resend, Google) forrása: `docs/RESEARCH.md` 15. pont. Az `/admin/jogi` lap jogi átnézést javasol.
- **Mobil és fejléc:** a 900–1240 px-es sávban a nyelvkódok lenyílóba kerülnek (`LangMenu`); mobilon minden önálló érintési cél legalább 44 px; a főoldali bemutatkozás törzsszövege „Tovább olvasom” lenyitással; a korábbi események évenként (a legutóbbi két év nyitva); az Egyesület beszámoló-blokkja csak közzétett beszámolóval jelenik meg; mindkét űrlap alatt link az adatkezelési tájékoztatóra.
- **Színkontraszt:** a korábbi események sora színnel halványul, nem átlátszósággal (a 0,78-as opacity a dátumot és a meta-sort 3,39:1-re vitte). A G11 (`verify.mjs lighthouse`) minden nyilvános lapon, egy korábbi és egy közelgő próbaeseménnyel méri az akadálymentességet.
- **Sitemap `lastmod`:** a valódi módosítás napja — a `writeSite` minden tartalmi mentéskor `updatedAt`-ot ír a dokumentumba, az esemény mentése az eseménybe is; az eseménylapoké az eseményé, a többi lapé a dokumentumé. Amíg nem volt mentés (a mag), nincs `lastmod` (a generálás napja nem módosítási idő). A régi rekordok áthelyezése nem számít módosításnak (`writeSite(..., { touch: false })`).
- **Tesztek:** `node scripts/with-server.mjs node scripts/checks/p4-public.mjs` (G25: 11 lap × 3 nyelv × 7 szélesség túlcsordulás, fejléc, érintési célok, nyelvválasztás, űrlapok, seed) és `node scripts/checks/p4-privacy.mjs` (G26: saját szerverrel; kötelező részek, impresszumból kitöltött adatkezelő, a megőrzési számok a kód állandóiból) — előtte `npm run build`.

## Admin: belépés és használat

- **Belépés** (`src/lib/admin-auth.ts` — a védelem egyetlen helye): ha az `ADMIN_PASSWORD` be van állítva, az `/admin` lapok a `/admin/belepes` oldalra visznek (`?next=` a kért lappal), az `/api/admin/*` 401 JSON-t ad. Belépés után `gm_admin` süti: HMAC-SHA256-tal aláírt (Web Crypto, így a proxyban is ellenőrizhető), 30 napos, HttpOnly, Secure, SameSite=Lax. Az aláíró kulcs a jelszóból (+ `ADMIN_USER`, + az opcionális `ADMIN_SESSION_SECRET`) származik, ezért jelszócsere után minden korábbi belépés érvénytelen. A süti állapotmentes: a „Kilépés” a böngészőből törli, de egy korábban lemásolt süti a lejáratáig érvényes maradna — ilyenkor a jelszó (vagy az `ADMIN_SESSION_SECRET`) cseréje segít. A Basic Auth fejléc (szkriptekhez) továbbra is elfogadott.
- **Rossz jelszó:** magyar hibaüzenet a hátralévő próbák számával; 5 sikertelen próba 15 percen belül → 15 perc tiltás IP-nként (a P1 tartós korlátjával: `hit`, `peek`, `resetHits`). A tiltás alatt a helyes jelszó sem enged be; az üzenet megmondja, hány perc múlva lehet újra.
- **Proxy és szerver-akciók:** a proxy matchere az admin címeit kiterjesztéstől és nyelvi előtagtól függetlenül lefedi (korábban a `.png`/`.txt`/`.xml`-végű admin-címek kimaradtak, és egy admin szerver-akció így a proxy megkerülésével is elérhető volt). Ezen felül minden admin szerver-akció első sora `await guard()`.
- **Jelszó nélkül** production buildben (Netlify, saját szerver, `npm start`) az admin **zárva** (fail-closed): az `/admin` lapjai a belépő oldalra visznek, ami űrlap helyett kiírja, hogy az `ADMIN_PASSWORD`-öt kell beállítani (bemutatóhoz az `ADMIN_OPEN_DEMO=1`-et), az `/api/admin/*` 503-at ad, senki sem léphet be, és egy admin szerver-akció sem fut le. Nyitott — minden admin-lap tetején figyelmeztető sávval — csak `npm run dev` alatt vagy `ADMIN_OPEN_DEMO=1` mellett; a helyi kapuk szerverindítói (`scripts/with-server.mjs`, `_p1-harness.mjs`, `_p5-harness.mjs`) ezt kérik. A kérés Host fejlécéből szándékosan nem döntünk (azt a kliens írja). A nyilvános láblécben nincs admin-link.
- **Kétlépcsős törlés** (`(panel)/ConfirmButton.tsx`): az első kattintás „Biztosan törlöd? Igen, törlöm / Mégse”, 6 s után visszaáll; natív `confirm()` nincs. Esemény, jelentkezés, üzenet, kép, beszámoló, útvonal.
- **Fordítások:** az `LField`-ben a magyar mező elöl, az angol és a német a lenyitható „Fordítások (angol, német)” részben; a címke mutatja a hiányt („Hiányzik: EN, DE” / „Kész”). Az esemény- és az útvonal-listán jelvény, ha egy közzétett elem angol vagy német szövege hiányzik (`src/lib/translations.ts`).
- **Főoldal és kapcsolat:** négy külön mentett rész (Nyitókép · Tulajdonos · Bemutatkozás · Kapcsolat), felül ugró-fülekkel; a `saveHero`, `saveOwner`, `saveIntro`, `saveContact` akció csak a saját részét írja.
- **Aloldali kiegészítők** (`src/components/site/PageExtras.tsx`, `(panel)/FaqEditor.tsx`): az aloldal-szerkesztőben *Külső link a szöveg alatt* (`pages.<kulcs>.link = { url, label }`, csak http(s), új lapon nyílik — pl. a Huculösvény saját oldala) és *Gyakori kérdések / tudnivalók* (`faq: [{ q, a }]`, legfeljebb 12, háromnyelvű, sorrendezhető; a nyilvános lapon lenyitható sorok + `FAQPage` JSON-LD, az `llms-full.txt`-ben is). Az esemény-szerkesztőben *Melyik aloldalon jelenjen meg* (`events[].pages`): a lap alján a *Kapcsolódó események* blokk a hozzárendelt, közzétett, közelgő eseményeket mutatja. Üresen egyik blokk sem jelenik meg. Teszt: `node scripts/with-server.mjs node scripts/checks/p8-extras.mjs` (G31).
- **Túraútvonalak:** a tartalomdokumentum `routes` tömbje — `{ id, name, summary, mapImage?, photos (legfeljebb 4), published, order }` —, a magban üres (útvonalat nem találunk ki). Admin: `/admin/utvonalak` (sorrend, közzététel) és `/admin/utvonalak/[id]` (képválasztó, több képes fotóválasztó, a P2 feltöltője). A Túrák lapon a közzétett útvonalak kártyaként jelennek meg, nagyítható képekkel; ha nincs ilyen, az illusztrált térkép marad, a jelmagyarázatban csak a körök neveivel.
- **Állapotpanel** az admin kezdőlapján: adatbázis (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase vagy helyi fájl), e-mail (`RESEND_API_KEY`, `CONTACT_TO` — alapértelmezés: `info@gyurusimenes.hu` —, `CONTACT_FROM`), Google (`GOOGLE_PLACES_KEY`, `GOOGLE_PLACE_ID`), admin (`ADMIN_PASSWORD`, `ADMIN_USER`, `ADMIN_OPEN_DEMO`). Kulcsot és jelszót nem mutat, csak azt, hogy be van-e állítva. A „Próba e-mail küldése” a `src/lib/mail.ts` küldőjével megy a valódi címzettnek.
- **Tesztek:** `node scripts/checks/p3-auth.mjs` (G19; maga indítja a szervereket: jelszóval, felhasználónévvel, nyitott bemutatóként és zártan) és `node scripts/with-server.mjs node scripts/checks/p3-admin-ux.mjs` (G20; a próba e-mail sikerét helyi Resend-mockkal méri, a `RESEND_API_URL` változón át) — előtte `npm run build`.

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
| `RESEND_API_URL` | a teljes küldési végpont (helyi mockhoz, a `RESEND_API_BASE` helyett) | `<RESEND_API_BASE>/emails` |
| `NEXT_PUBLIC_SITE_URL` | az éles cím (canonical, hreflang, OG, sitemap, robots) — **build-idejű** | Netlify `URL`, helyben `http://localhost:3000` |
| `ADMIN_OPEN_DEMO` | `1`: jelszó nélküli, nyitott bemutató-admin | nincs → jelszó nélkül zárva |
| `RATELIMIT_SALT` | az IP-hash sója | egyszer sorsolt, a tárban őrzött érték |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | adatbázis és fájltár (Supabase) | nincs → helyben `data/`, Netlify-on nem menthető |
| `SUPABASE_ANON_KEY` | csak a `scripts/supabase-import.mjs --check` próbájához (az anon kulcs tényleg nem fér hozzá) | — |
| `STORE_DRIVER` | `file`: a Supabase-kulcsok mellett is a helyi `data/` | nincs → Supabase, ha be van állítva |

A Google szabályai szerint a vélemény és az értékelés **nem tárolható** (se adatbázis, se ISR): a főoldal csak egy üres vázat ad, a böngésző a blokk közelében (600 px) kéri a `GET /api/reviews`-t, ami élőben kérdez (`Cache-Control: no-store`). Tárolva csak a place ID és a napi számláló van (Supabase `kv` tábla, helyben `data/google/`). A `GOOGLE_PLACES_KEY` a build idején is legyen beállítva (a váz a lap renderelésekor dől el).

### Google-értékelések: keret és költség
- **Mi számít hívásnak:** minden kiszolgált blokk-betöltés (a látogató a blokk közelébe görget) egy élő Place Details (New) kérés a `rating,userRatingCount,googleMapsUri,reviews` mezőkkel. A legmagasabb érintett SKU a `reviews` miatt a **Place Details Enterprise + Atmosphere** ([mezők és SKU-k](https://developers.google.com/maps/documentation/places/web-service/data-fields)). A hely azonosítójának egyszeri keresése (Text Search, csak `places.id`) a **Text Search Essentials (IDs Only)** SKU: ingyenes, korlátlan.
- **Ár** ([Google Maps Platform árlista](https://developers.google.com/maps/billing-and-pricing/pricing), lekérve 2026-09-14): Place Details Enterprise + Atmosphere — havonta **1000 hívás ingyenes**, felette **25,00 USD / 1000 hívás** (0–100 000-es sáv). Az ingyenes keret SKU-nként, a számlázási fiókra havonta él.
- **Napi keret** (`GOOGLE_REVIEWS_DAILY_CAP`, alap **30**; a nap Europe/Budapest szerint): havonta legfeljebb 31 × 30 = **930 hívás**, az ingyenes 1000 alatt → **0 USD**, ha ugyanazon a számlázási fiókon más nem használja ezt a SKU-t. Általában a havi legnagyobb költség ≈ max(0; 31 × keret − 1000) × 0,025 USD — pl. keret 50: 1550 hívás → 550 × 0,025 = **13,75 USD**; keret 100: 3100 hívás → **52,50 USD**.
- **A keret felett** aznap az `/api/reviews` 429-et ad, és a blokk minden látogatónál eltűnik (másnap visszajön). A számláló a Supabase `kv` táblájában (`google/daily-calls`, helyben `data/google/daily-calls.json`) él, vélemény nélkül.
- **IP-korlát:** egy IP-cím 24 óra alatt legfeljebb **5** élő betöltést kap (`src/app/api/reviews/route.ts`, tartós IP-hash a `rate_limits` táblában); a 6. kérés 429, Google-hívás nélkül. Így egy ismételgető robot nem éli fel reggel a közös napi keretet (a p5-reviews A6 lépése méri, kontrollal). Ára: egy NAT mögötti sok látogató (pl. egy iroda) egymás keretét is fogyasztja — egy kis oldalnál ez elfogadható.
- Költségvédelemként a Google Cloud Console-ban a Places API (New) napi kvótája is a keret közelébe állítható.

### Éles cím: `NEXT_PUBLIC_SITE_URL`
- **Mire kell:** ebből épül minden abszolút cím — canonical, hreflang, `og:url`, `og:image`, a `sitemap.xml` címei, a `robots.txt` `Sitemap:` sora, a JSON-LD és az `llms.txt` hivatkozásai (`src/lib/seo.ts` `SITE_URL`).
- **Build-idejű:** a `NEXT_PUBLIC_` előtag miatt a Next a buildbe égeti; a futó szerver környezete már nem számít. Netlify-on a módosítás után **új deploy** kell (addig a régi cím marad), helyben új `npm run build`.
- **Ha nincs beállítva:** Netlify-on a Netlify saját `URL` változója — az oldal elsődleges címe (ma `https://gyurusi-menes-demo.netlify.app`; draft deployon is ez, nem a draft saját címe) —, helyben `http://localhost:3000`.
- **A DNS-átállás után:** a Netlify production környezetében `NEXT_PUBLIC_SITE_URL=https://gyurusimenes.hu` (perjel nélkül), majd új deploy. Ha a Netlify-on a `gyurusimenes.hu` lesz az elsődleges domain, a tartalék (`URL`) is azt adná — a kifejezett beállítás mégis biztosabb.
- **Teszt:** a p6-seo (G23) külön könyvtárba (`NEXT_DIST_DIR=.next-seo`) `NEXT_PUBLIC_SITE_URL=https://gyurusimenes.hu`-val buildel, a szervert a változó **nélkül** indítja (tehát a beégetett értéket méri), és ellenőrzi a canonical, hreflang, `og:url`, `og:image`, sitemap és `robots.txt` címét; kontroll: a fő build canonical-ja más domain. Utána a `.next-seo` törlődik, a `tsconfig.json` és a `next-env.d.ts` visszaáll.

```bash
node scripts/mock-resend.mjs --port 4010   # RESEND_API_KEY=teszt RESEND_API_BASE=http://127.0.0.1:4010
node scripts/mock-places.mjs --port 4020   # GOOGLE_PLACES_KEY=teszt GOOGLE_PLACES_API_BASE=http://127.0.0.1:4020 GOOGLE_PLACE_ID=p5-mock-place-id
node scripts/checks/p5-mail.mjs            # G21 (saját build + next start a 3041-es porton; egyedi CONTACT_TO/CONTACT_FROM is)
node scripts/checks/p5-reviews.mjs         # G22 (két build: kulccsal és nélküle; helyi Supabase-zel is)
```

## Sebesség és gyorsítótár (P7)

- **A nyilvános lapok ISR-en futnak.** A `[lang]` alatti nyilvános lapok (`/`, az öt aloldal, `/esemenyek`, `/esemenyek/[id]`, `/adatkezeles`, `/impresszum`) `revalidate = 3600`-at és **üres** `generateStaticParams`-t exportálnak. A build egyiket sem rendereli előre (a build kimenetében ●, a `.next/prerender-manifest.json` `routes`-ában nincsenek) — így a mag nem sül bele a deployba, és egy új deploy nem mutathat régi tartalmat a tárban lévő, admin által szerkesztett helyett. Az első kérés a tárból renderel, utána gyorsítótárból megy (`x-nextjs-cache: HIT`, élesben a Netlify CDN-je). Az admin lapjai dinamikusak (ƒ).
- **Frissülés:** az admin minden mentése `revalidatePath("/", "layout")`-ot hív (`(panel)/actions.ts` `refresh()`, a feltöltéseknél `src/lib/admin-api.ts` `revalidateSite()`) — minden nyelv minden lapja a következő kérésnél újraépül. Az óránkénti újragenerálás a dátumfüggő részeket (közelgő / korábbi esemény) frissíti.
- **Ha a tár az adminon kívül változik** (helyben a `data/site.json` kézi szerkesztése, élesben egy mentés visszaállítása): `POST /api/admin/revalidate` (admin-jogosultsággal), parancssorból `BASE_URL=http://localhost:3000 node scripts/revalidate.mjs`. Az `npm run db:reset` és `db:demo` ezt magától megteszi, ha a `BASE_URL` be van állítva; a tesztszerverek (`scripts/with-server.mjs`, a kapuk saját szerverindítói) induláskor is. `npm run dev` alatt nincs gyorsítótár.
- **Csapdák:** a `[lang]/not-found.tsx`-ben nem lehet `headers()` / `cookies()` / `connection()` (minden nyilvános lapot dinamikussá tenne — a nyelvet a `NotFoundBody` az útvonal-paraméterből veszi); a `[lang]` layoutra nem kerülhet `generateStaticParams` (a három főoldalt előre renderelné) és `dynamicParams = false` sem. Szándékosan **nincs** `experimental.isrFlushToDisk: false` sem: az a képoptimalizáló lemez-gyorsítótárát is kikapcsolná. Az ismeretlen címek (`[...rest]`), a `sitemap.xml` és az `llms*.txt` kérésenként renderelnek.
- **JS:** a GSAP csak asztalon (≥ 640 px, mozgás-csökkentés nélkül) töltődik le, dinamikus importtal, a betöltés után (`HeroParallax.tsx`). A hero-cím fénysávja, a fejléc belépője és a `Reveal trigger="mount"` fejlécek CSS-animációk (`globals.css` P7-blokk): a hajtás feletti tartalom nem vár a JS-re, telefonon az első festéskor már látszik (csak emelkedik). A görgetésre induló `Reveal` sima szerveroldali elem (`data-in="false"`); egyetlen `RevealObserver` a gyökér-layoutban kapcsolja be (korábban minden példány külön kliens-komponens volt). Mindkét betű (Instrument Sans, Fraunces) előtöltött: előtöltés nélkül a HTML → CSS → betű lánc a Lighthouse mobil szimulációjában ~450 ms-mal később adta az első festést. A zárt mobil menü linkjei nem töltik elő a lapjukat.
- **Képek:** az LCP-kép (aloldali és eseménylapi képfej, a naptár kiemelt képe) `preload` + `fetchPriority="high"`, minden más lusta. Az LCP-kép `decoding="sync"`: az első festésben jelenik meg, nem a következő képkockán (a hidratáló JS után). A főoldali hero-kép `loading="eager"` + `fetchPriority="low"`, nem előtöltött (az alacsony prioritás nélkül a React 19 szerveroldali renderelése magától előtöltené): a teljes képernyős képet a Chrome háttérnek tekinti, a főoldal LCP-je a címsor; a kapcsolódó kártyák bélyegképe `sizes="96px"`. Helyőrző: domináns szín + apró WebP-előnézet CSS-háttérként (`src/lib/placeholder.ts`), nem a next/image SVG-szűrős blur-je. A mobil menü fotója csak az első nyitás után töltődik. A fixált szemcse-réteg (`.grain`) 900 px alatt nem fut.
- **Képek előmelegítése deploy után:** `BASE_URL=https://gyurusi-menes-demo.netlify.app node scripts/warm-images.mjs` — a lapok előtöltött képeit 640 / 750 / 828 / 1080 / 1200 px szélességben, AVIF- és WebP-Accept-fejléccel előre lekéri, hogy a Netlify képszolgáltatásának első (lassú) átalakítását ne a látogató várja ki. Változók: `WIDTHS`, `PATHS`, `CONCURRENCY`, `REPEAT=1` (második kör: gyorsítótárból jön-e).
- **Teszt:** `node scripts/with-server.mjs node scripts/checks/p7-speed.mjs` (G27) — build-kimenet, második kérésre HIT (10 lap × 3 nyelv), egy előtöltött LCP-kép, nincs blur-SVG, warm-images, mobilon nincs GSAP (1440 px-en van), JS nélkül is látszik a hajtás feletti tartalom, Lighthouse 13 mobil a főoldalon, a Túrák lapon, a naptárban és egy eseménylapon (Performance ≥ 95, LCP ≤ 2,5 s, TBT ≤ 100 ms, CLS ≤ 0,05; ha kell, 3 futás mediánja), végül admin-mentés után azonnal friss lap. Előtte `npm run build`.
- **Böngésző-gyorsítótár:** a `next.config.ts` `expireTime` = 3600 (Netlify-on kívül): e nélkül a Next `stale-while-revalidate=31532400`-at küld az ISR-lapokra, a böngésző a korábban látott nyilvános lapot és RSC-előtöltést elavultan a saját gyorsítótárából adta (admin-mentés után is), a háttérben újrakért kérések pedig a Chromiumban beragadtak (6 kapcsolat → a kliens-oldali navigáció megállt; a G10/G15/G20 így bukott). Netlify-on (`NETLIFY=true` a buildben) marad az alapérték: ott a plugin a böngészőnek `public, max-age=0, must-revalidate`-et ad, a CDN-nek 1 éves SWR-t.
- **Ismert korlát (G27):** a helyi Lighthouse-mérés LCP-je versenyhelyzet: ha az LCP-festés visszajelzését a React-chunk ~13 ms-os futása megelőzi, a Lantern a teljes JS-t (~150 KB) az LCP feltételének számolja (≈ 2,9–3,2 s); ha nem, ≈ 2,3–2,5 s. Részletek és mérések: `docs/gates/P7.md`, „Folytatás” szakasz. A javítókörben (2026-09-14) újramérve, laponként 3 futás mediánja: `/` 2,98 s · `/turak` 2,48 s · `/esemenyek` 2,99 s · eseménylap 2,91 s · `/en` 2,57 s · `/de/turak` 2,48 s (Performance 95–98, TBT 0, CLS 0). Kipróbálva és elvetve: `experimental.inlineCss` (2,91–3,13 s, Performance 94) és a betű-előtöltés kikapcsolása (FCP 0,90 → 1,66 s, Performance 88–96). A G27 LCP-feltétele helyben nem teljesül; a küszöb változatlan.

## Élő-szerű ellenőrzés (G28, Netlify draft deploy)

- `scripts/checks/final-live.mjs` egy futó példány ellen: a cél a `BASE_URL`, különben a `.netlify/draft-url.txt` első sora. Jelszavas adminnál `ADMIN_USER` / `ADMIN_PASSWORD` környezeti változóval lép be (böngészőben süti, API-n Basic Auth). Lépések: FINAL-LIVE jelölésű próbaesemény (közzétett, jelentkezéssel, nem kiemelt) → 20 egyidejű jelentkezés, a tár szerint (GET `/api/admin/backup`) és az admin listájában is 20 → 8 MB-os fotó és 12 MB-os PDF (nem közzétett) feltöltése az admin felületén, a PDF bájtra egyező letöltése → a próbaesemény címének módosítása, a nyilvános lap ≤ 15 s alatt az új címet adja → a főoldal és a `/turak` második kérése gyorsítótár-találat, TTFB ≤ 250 ms → Lighthouse mobil Performance ≥ 95 a főoldalon → takarítás (hiba esetén is) és ellenőrzése. Csak a FINAL-LIVE jelölésű tételekhez nyúl.
- **A jelentkezés sebességkorlátja** (IP-nként 10 s) alól csak a **belépett** admin kivétel, és csak ha van `ADMIN_PASSWORD` (`src/app/api/register/route.ts`); az `x-gm-probe: final-live` fejlécű admin-kérés nem küld e-mailt. Jelszó nélküli célon a final-live az elején megáll (a 20 kérésből 19 kapna 429-et — ezt a `FINAL_LIVE_CONTROL=noauth` kontroll mutatja).
- Helyi próba: `npm run build && ADMIN_PASSWORD=valami node scripts/with-server.mjs node scripts/checks/final-live.mjs`.
