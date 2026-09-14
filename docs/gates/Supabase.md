# Supabase-átállás — 2026-09-14 este

A megbízó létrehozta a Supabase-projektet és a Resend-fiókot, a kulcsokat a `.env.local`-ba tette, és úgy döntött, hogy az adatréteg Netlify Blobs helyett Supabase legyen. Kérése: a `CONTACT_TO` és a `CONTACT_FROM` a helyes cím legyen (info@gyurusimenes.hu), az env a Netlify-ra kerüljön, és legyen deploy.

## 1. Beállítások

- **`.env.local`:**
  - `CONTACT_TO=info@gyurusimenes.hu` (a korábbi érték `info@example.hu` volt);
  - `CONTACT_FROM="Gyűrűsi Ménes <info@gyurusimenes.hu>"`.
- **Netlify env** (az értékek nincsenek kiírva):
  - minden kontextusban: `ADMIN_USER`, `ADMIN_PASSWORD` (a megbízó párosa), `CONTACT_TO`, `CONTACT_FROM`, `SUPABASE_URL`;
  - titkosként (production, deploy-preview, branch-deploy): `RESEND_API_KEY` és `SUPABASE_SERVICE_ROLE_KEY`.
- **Production deploy** `6aa84fc09ab5f5e256348eda`, még a Blobs-os kóddal, az új `scripts/deploy.mjs`-sel:
  - a függvénycsomagban nincs `.env` fájl;
  - hitelesítés nélkül 401, rossz jelszóval 401, a régi `admin` jelszóval 401, a megbízó párosával 200;
  - a nyilvános lapok 200-at adnak.
- **Talált hiba:** az előző deployok függvénycsomagjában ott volt a `.env.local` (`.netlify/functions-internal/___netlify-server-handler/.env.local`). Ezt javítja a `scripts/deploy.mjs`.
- **Resend:**
  - a kulcs csak küldésre jogosult (a domain-lista 401);
  - a Resend teszt-címére (`delivered@resend.dev`) küldött próba 403-at adott: „The gyurusimenes.hu domain is not verified”;
  - a domain névszerverén (whiszerver1.hu) nincs Resend DKIM- és `send`-rekord. **Levél addig nem megy ki**, amíg a megbízó fel nem veszi és hitelesíti a domaint a Resendben.

## 2. Supabase-projekt

- **Projekt:** `zitxhcqgrxaqpbugvdnr`.
- **Kulcsok:** az anon és a service_role kulcs is a projekthez tartozó JWT (a `role` és a `ref` mező ellenőrizve).
- **Régió:** a `db.<ref>.supabase.co` IPv6-címe a 2a05:d018::/35 tartományba esik. Az AWS hivatalos `ip-ranges.json`-ja szerint ez az **eu-west-1 (Írország)**.
- **Kiinduló állapot:** üres, nincs tábla és nincs tároló (PostgREST 200, üres séma).

## 3. Kód

| Fájl | Változás |
|---|---|
| `src/lib/supabase.ts` | PostgREST + Storage kliens `node:http(s)`-sel, keep-alive-val, 20 s-os időkorláttal, teendőt mondó hibákkal (hiányzó tábla, rossz kulcs). A Next `fetch`-ét szándékosan kerüli: ISR-render közben adat-gyorsítótárba tenné a lekérdezést, a `no-store` pedig dinamikussá tenné a lapot. |
| `src/lib/store.ts` | `site_content` sor, `version`-feltételes frissítés (legfeljebb 10 újrapróbálás). Üres táblába a mag kerül, de build közben (`NEXT_PHASE`) sosem. Netlify-on adatbázis nélkül érthető hiba. A régiszöveg-csere hash-e CRLF-független, és a Netlify-t adattárolóként említő szöveg is „régi alapérték”. |
| `src/lib/records.ts` | `registrations` / `messages` tábla, `ON CONFLICT DO NOTHING`, lapozott olvasás (1000 soronként), eseményhez tartozó törlés egy hívással |
| `src/lib/files.ts`, `chunks.ts` | a privát `files` és `upload-chunks` Storage-tároló; streamelt kiszolgálás Content-Length-szel |
| `src/lib/ratelimit.ts` | `rate_limits` tábla (version), a só a `kv` táblában; a lejártak egy DELETE-tel |
| `src/lib/maintenance.ts` | `backups` tábla, `kv` `maintenance/last-run` (feltételes lefoglalás) |
| `src/lib/google-reviews.ts` | `kv` `google/place-id`, `google/daily-calls` (version-feltételes számláló) |
| `(panel)/page.tsx` | az állapotpanelen adatbázis-csoport (Supabase / helyi fájl) |
| `supabase/migrations/20260914200000_adatreteg.sql` | 6 tábla, RLS szabály nélkül, `revoke` anon/authenticated, 2 privát tároló méret- és típuskorláttal. Idempotens. |

## 4. Helyi ellenőrzés (helyi Supabase, nem az éles projekt)

- **Séma a helyi stacken** (`supabase start`, a migráció lefutott):
  - az anon kulcs mind a 6 táblán olvasva 401, írva 401;
  - a `files` tároló listázása anonként 400/403;
  - a service_role mindet eléri.
- **Kapuk a Supabase-es kóddal:**

| Kapu | Eredmény | Supabase-specifikus mérés |
|---|---|---|
| G1 build, G2 tsc, G3 lint | PASS | — |
| G9 `verify http` | PASS | — |
| G10 admin-flow | ADMIN_FLOW_OK | — |
| G15 qa-flow | QA_FLOW_OK | — |
| G16 p1-data | PASS | két szerverpéldány: 40/40 beküldés tárolva; 10 párhuzamos admin-mentés mind megmaradt — 11 feltételes írás, ebből 1 ütközés újrapróbálva, feltétel nélküli írás 0; kontroll: feltétel nélkül 10-ből 4 maradt |
| G17 p1-maintenance | PASS | a napi függvény Next nélkül a Supabase ellen: 4+2 törlés, mai mentés a `backups` táblában, 30 megtartva, lejárt korlát törölve; tartós korlát újraindítás után 429, a táblában csak IP-hash |
| G18 p2-uploads | PASS | kép és 12 MB-os PDF 4 darabban a Storage-ba, streamelt letöltés bájtra egyezik; félbemaradt darabok takarítása |
| G19 p3-auth | PASS | — |
| G20 p3-admin-ux | PASS | — |
| G21 p5-mail | PASS | — |
| G22 p5-reviews | PASS | place ID és napi számláló a `kv` táblában; vélemény, szerző és darabszám sehol az adatbázisban (kontroll: a place ID megtalálható) |
| G25 p4-public | PASS | — |
| G26 p4-privacy | PASS | a tájékoztatóban a Supabase Pte. Ltd. mint adatfeldolgozó |
| G4–G8 (statikus tartalom) | PASS | — |

- **Nem futtattam újra** (az adatréteget nem érintik): G11 lighthouse, G12 shots, G23 p6-seo, G24 p6-geo, G27 p7-speed (ismert LCP-korlát).
- **Ez előtt a teljes kapusor kétszer leállt memóriahiány miatt** (lásd `Ellenorzes.md` 6. pont), ezért a kapuk egyenként futottak.

## 5. Élesítés — a megbízó SQL-futtatására vár

1. **Előfeltétel:** a megbízó lefuttatja a `supabase/migrations/20260914200000_adatreteg.sql`-t a Supabase SQL Editorban. A `node scripts/supabase-import.mjs --check` (G29) az utolsó futáskor még 8 hibát adott: a 6 tábla és a 2 tároló hiányzik.
2. `node scripts/supabase-import.mjs --from-url https://gyurusi-menes-demo.netlify.app --dry-run`, majd ugyanez `--dry-run` nélkül. Ennek még a Blobs-os élő kód idején kell futnia. Az élő tartalom 4 esemény, feltöltés, beszámoló, jelentkezés és üzenet nincs; mentés a scratchpadban.
3. `node scripts/deploy.mjs` (draft), majd a draft ellen `ADMIN_PASSWORD=… node scripts/checks/final-live.mjs` (G28) és `BASE_URL=<draft> node scripts/checks/supabase-live.mjs` (G30). Ha a draft kontextusában hiányzik a titkos kulcs, ez itt kiderül.
4. `node scripts/deploy.mjs --prod`, majd G13 (`admin-flow` élesben) és G30 (`supabase-live`).
