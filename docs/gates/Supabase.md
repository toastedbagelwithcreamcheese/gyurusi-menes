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

## 5. Élesítés (2026-09-14, 22:00–23:10)

1. **Séma:** a megbízó lefuttatta az SQL-t. **G29** `node scripts/supabase-import.mjs --check` → PASS: mind a 6 tábla és a 2 privát tároló megvan, az anon kulcs nem olvas és nem ír.
2. **Adatátvitel** a még Blobs-os élő oldalról (`--from-url`), előtte próbafutással:
   - átkerült a tartalomdokumentum (4 esemény; feltöltés, beszámoló, jelentkezés és üzenet nem volt);
   - az első visszaolvasás hamis riasztást adott, mert a jsonb átrendezi a kulcsokat. A szkript azóta kulcssorrendtől függetlenül vet össze, és kiírja az első eltérést; újrafuttatva PASS.
3. **Draft 1** (`6aa85e9d`):
   - G30 PASS: az állapotpanel Supabase, a tartalom egyezik, a karbantartás a kv és a backups táblába írt; a titkos kulcs tehát a draft kontextusában is elérhető;
   - G28 FAIL a 4. lépésben: a képfeltöltés a függvényben „sharp.libvipsVersion is not a function” hibával állt meg. Ok: az `npm uninstall @netlify/blobs` kitörölte a node_modules-ból az `npm pack`-kel bemásolt sharp Linux-binárisokat;
   - a próbaadatok törlődtek.
   - **Javítás:** a `scripts/sharp-linux.mjs` visszahozta a binárisokat, és a `scripts/deploy.mjs` build előtt ellenőrzi őket (commit 328b49d).
4. **Draft 2** (`6aa85fe3`), **G28 PASS** (128 s):
   - 20/20 jelentkezés tárolva;
   - a 9,2 MB-os fotóból 360 KB-os WebP lett (7,9 s);
   - a 12 MB-os PDF bájtra egyezik (30,1 s — lassabb, mint Blobs-szal: 11–20 s);
   - admin-mentés után 1,2 s alatt friss a lap;
   - TTFB 33 / 40 ms, Lighthouse mobil 97 (LCP 2,49 s);
   - takarítás rendben. Az 5) lépés bemelegítésekor megint megjelent a korábban hibás durable-cache minta (`"Netlify Durable"; fwd=stale; stored`), a frissülés mégis 1,2 s alatt megtörtént.
5. **Deploy előtti összevetés** (az élő Blobs-tartalom és a Supabase-sor):
   - csak a `legal.privacy.hu/en/de` és az `updatedAt` tért el. A draft-próba mentései a régi tájékoztatót olvasáskor az új, Supabase-t megnevező magra cserélték; ez szó szerint egyezik a maggal;
   - minden más azonos, élő módosítás nem veszett el.
6. **Production** `6aa86148e03dbf04f13d824b` (`node scripts/deploy.mjs --prod`, a csomagban nincs .env):
   - 8 útvonal rendben (200 / 401 / 307), a tájékoztató mindhárom nyelven megnevezi a Supabase Pte. Ltd.-t;
   - **G30 PASS** élesben: az állapotpanel Supabase, a tartalom egyezik, a karbantartás (3,1 s) a kv táblába írt, a mai mentés megvan;
   - **G13 ADMIN_FLOW_OK** élesben: esemény, 3 fős jelentkezés, PDF, nyitókép-csere, képfeltöltés WebP-re, takarítás. A Supabase-tartalom (nyitókép, események, beszámolók, feltöltések, jelentkezések száma) előtte és utána azonos.

**Nyitva:**
- a Resend-domain hitelesítése — az ügyfél DNS-ére vár, addig levél nem megy ki;
- a G27 LCP (ismert korlát);
- a kapusor ledger-bejegyzései. A G13, G28, G29 és G30 egyenként, közvetlenül futott, mert a teljes `gate-check` a gépen kétszer memóriahiánnyal leállt.
