# Gyűrűsi Ménes — weboldal + admin (demó)

Modern, fotóvezérelt bemutatkozó oldal a Gyűrűsi Ménesnek (hucul, gidrán, shagya arab — Gyűrűs, Zala), egyszerű, nem-technikai adminnal.

## Indítás
```bash
npm install
cp .env.example .env.local   # ADMIN_USER / ADMIN_PASSWORD kötelező
npm run dev                  # http://localhost:3000
```
Admin: `/admin`. Jelszó csak akkor kell, ha az `ADMIN_USER` + `ADMIN_PASSWORD` be van állítva — a demón nincs.

## Mi hol van
- `data/seed.json` (mag) + helyben `data/site.json` — a szerkeszthető tartalomdokumentum (nyitókép, tulajdonos, bemutatkozás, aloldalak, események, beszámolók, feltöltések, jogi szövegek). Az admin ezt írja; a jelentkezések és az üzenetek külön élnek (lásd „Adatszerkezet, karbantartás, mentés”).
- `src/content/photos.json` + `public/images/photos/` — a kurált, optimalizált fotók. Forrás: `scripts/images.config.mjs`, generálás: `node scripts/prep-images.mjs`.
- `src/app/page.tsx` — főoldal; `src/components/site/Sections.tsx` — szekciók.
- `src/app/admin/` — admin (eseménye, hírek, programok, képek, szövegek/kapcsolat, üzenetek); `actions.ts` a server actionök.
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
- **Az admin-API védelme:** minden `/api/admin/*` útvonal a `src/lib/admin-auth.ts` `requireAdmin()`-ját hívja (a proxy matchere az `/api`-t nem látja); az `/admin` lapokat a proxy ugyanezzel a függvénnyel védi.
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
npm run dev        # http://localhost:3000 — admin: http://localhost:3000/admin (helyben jelszó nélkül)
```

Amit az adminban helyben felviszel, az csak a gépeden van. Ha valamit a magba akarsz tenni (hogy élesbe is menjen a következő deployjal), másold a `data/site.json` tartalmát a `data/seed.json`-ba, és commitold.
