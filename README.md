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
- `data/site.json` — a szerkeszthető tartalom (hero, bemutatkozás, programok, események, hírek, galéria, kapcsolat, feltöltések, üzenetek). Az admin ezt írja.
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
Netlify (`netlify.toml`, `@netlify/plugin-nextjs`). **Fontos:** az admin fájlba ír (`data/site.json`, `public/uploads`) — ez lokálisan és saját VPS-en (`npm run build && npm start`) működik; Netlify/Vercel read-only fájlrendszerén az admin írásaihoz a `src/lib/store.ts` egyetlen fájlját kell Netlify Blobs-ra vagy Supabase-re cserélni. A demóhoz szándékosan nem építettünk adatbázist.

## Ami szándékosan nincs benne
Árak, nyitvatartás, hektár- és lólétszám-adatok, díjak — a kutatás szerint nem igazoltak vagy ellentmondóak; egyeztetés után az adminban pótolhatók.

## Helyi adatbázis és tesztelés

Az oldal helyben **fájl-alapú adatbázissal** fut, adatbázis-szerver nélkül:

- `data/seed.json` — a **mag**: ez van a gitben, ebből indul az éles oldal Netlify Blobs-tára is az első futáskor.
- `data/site.json` — a **helyi adatbázis** (gitignore-olva): ezt írja az admin, ha helyben futtatod. Ha nincs, a mag jön.
- `data/files/` — a helyben feltöltött képek és PDF-ek (gitignore-olva); élesben ugyanez a Netlify Blobs „files” tára.

```bash
npm run db:reset   # helyi adatbázis vissza a magra (data/site.json ← data/seed.json, data/files kiürítve)
npm run dev        # http://localhost:3000 — admin: http://localhost:3000/admin (helyben jelszó nélkül)
```

Amit az adminban helyben felviszel, az csak a gépeden van. Ha valamit a magba akarsz tenni (hogy élesbe is menjen a következő deployjal), másold a `data/site.json` tartalmát a `data/seed.json`-ba, és commitold.

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
