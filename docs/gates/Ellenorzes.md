# Ellenőrzés fázis — teljes kapusor helyben, a G28 előkészítése

Dátum: 2026-09-14, gép: macOS (külső SSD), Node 25, Next 16.3.3, Lighthouse 13.4.1, Playwright-core + Chrome for Testing (chromium-1234).
Munkafa: main. Nincs push, nincs deploy, Netlify env-változóhoz és DNS-hez nem nyúltam.

## 1. Kiinduló állapot

- A P7 munkája nem volt commitolva (piszkos fa az 50821c2 fölött), a 4. kapufutás közben szakadt meg. Folytattam, és a **4436976** commitban rögzítettem.
- A G27 méréseit és a megmaradt LCP-hiba diagnózisát a `docs/gates/P7.md` „Folytatás” szakaszai írják le.

## 2. Kódváltozások ebben a fázisban

| Commit | Fájl | Változás | Miért (mérve) |
|---|---|---|---|
| 4436976 | `src/app/[lang]/layout.tsx` | Instrument Sans újra előtöltött | szimulált FCP 1,36 → 0,90 s |
| 4436976 | `Photo.tsx`, `SubPage.tsx`, `Sections.tsx` | LCP-kép `decoding="sync"` | az első festésben jelenjen meg |
| 4436976 | `Sections.tsx` | hero-kép `fetchPriority="low"` | a React 19 magától előtöltötte (p7-speed 3. lépés bukott) |
| 4436976 | `src/app/api/register/route.ts` | belépett admin (csak `ADMIN_PASSWORD` mellett) kivétel az IP-korlát alól; `x-gm-probe: final-live` → nincs e-mail | a G28 20 egyidejű jelentkezést küld egy gépről; ne menjen 20 levél az info@-ra |
| 4436976 | `scripts/checks/final-live.mjs` | új (G28) | |
| b744e18 | `next.config.ts` | `expireTime: 3600` Netlify-on kívül | a böngésző alkalmazta az ISR-válaszok `stale-while-revalidate`-jét: elavult lap a saját gyorsítótárából, és a háttérben újrakért RSC-előtöltések a Chromiumban beragadtak → G10/G15/G20 bukott |
| b744e18 | `scripts/checks/p5-reviews.mjs` | `scrollNear` újramér | a P7 `content-visibility` becsült magasságai miatt a görgetési cél elcsúszott (G22 mobil lépése) |

## 3. final-live.mjs (G28) helyi próbája

| Futás | Parancs | Eredmény |
|---|---|---|
| 1 (4436976 buildje) | `npm run db:reset && ADMIN_PASSWORD=final-live-helyi-proba node scripts/with-server.mjs node scripts/checks/final-live.mjs` | `PASS: final-live (134 s)`: 20/20 × 200 `{ok, stored}`, a tár szerint 20, admin-lista 20 sor; fotó 9,2 MB → 336 KB 2000×1500 WebP; PDF 12,0 MB, SHA-256 egyezik; admin-mentés után 11 ms alatt új cím; TTFB `/` és `/turak` 3 ms (HIT); Lighthouse `/` Performance 99; takarítás után nincs FINAL-LIVE maradék, az eseménylap 404 |
| Kontroll | ugyanez `FINAL_LIVE_CONTROL=noauth SKIP_LIGHTHOUSE=1` mellett | `FAIL` (várt): `1/20 × 200, {"200":1,"429":19}`, a tárban 1, admin-lista 1 sor — a szkript el tudja kapni a hiányzó jelentkezést; a takarítás ekkor is lefutott |
| 2 (b744e18 buildje) | mint az 1. | `PASS: final-live (24 s)`, napló sha256 `26d7c2133beb5269…`; Lighthouse `/` 99, LCP 1,97 s |

A szkript a draft ellen a `.netlify/draft-url.txt`-ből (vagy `BASE_URL`-ből) olvassa a címet, és csak a „FINAL-LIVE PRÓBA” jelölésű tételekhez nyúl.

## 4. Teljes kapusor

`node ~/.claude/skills/unlazy/scripts/gate-check.mjs --reverify --approve --timeout 900 GATES.md`

| Kapu | 1. futás (4436976) | javítás | 2. futás (b744e18) | megjegyzés |
|---|---|---|---|---|
| G1–G9, G11, G14, G16, G18, G19, G21, G23–G26 | PASS | — | PASS | |
| G10 admin-flow | FAIL (beragadt RSC-előtöltés) | expireTime | PASS | |
| G15 qa-flow | FAIL (`goto networkidle` időtúllépés) | expireTime | PASS | |
| G17 p1-maintenance | FAIL (a kimenet csonkolt) | — | PASS | önállóan is PASS; egyszeri hiba |
| G20 p3-admin-ux | FAIL (beragadt előtöltés) | expireTime | FAIL (a kimenet a B) lépés után csonkolt) | önállóan 3/3 PASS (a javítás után); lásd lent |
| G22 p5-reviews | FAIL (mobil görgetés) | scrollNear | PASS | |
| G13 éles admin-flow | FAIL | — | FAIL | az éles oldal még a P1 előtti kódot futtatja (`/api/admin/backup` és `/llms.txt` 404, nincs P2-feltöltő): a produkciós deploy nem történt meg — nem élesítettem |
| G27 p7-speed | FAIL | — | FAIL | csak az LCP ≤ 2,5 s bukik (Lantern-verseny, `docs/gates/P7.md`); az 1–5. és 7. lépés és a Performance ≥ 95 teljesül |
| G28 final-live | FAIL | — | FAIL | várt: nincs draft deploy (`nincs cél: … .netlify/draft-url.txt`) |

3. kör (`gate-check.mjs --approve --timeout 900 GATES.md`, csak a nem teljesült kapuk): **G20 PASS** (output-sha256 `f25aff62a1a554f4…`), G13, G27, G28 FAIL, ugyanazzal az okkal. Végeredmény: **25/28 teljesült**, nem teljesült: G13 (nincs produkciós deploy), G27 (LCP-verseny), G28 (nincs draft).

## 5. Az éles tár mellékhatása (G13)

Az 1. futás G13-a az éles oldalon (régi kód) létrehozta a próbaeseményt, jelentkezést, beszámolót és nyitókép-cserét, majd a 4b lépésnél (a régi kódban nincs képfeltöltő) leállt, a takarítás nem futott le. Olvasással ellenőrizve (2026-09-14 16:4x):

- `Teszt esemény (gate mu1b9fgf)` a főoldalon és a `/esemenyek` lapon — **kiemeltként áll a főoldalon** (+30 nap, jelentkezéssel; egy „Gate Teszt” 3 fős jelentkezés tartozik hozzá);
- `Gate beszámoló mu1b9fgf` az `/egyesulet` lapon;
- a nyitókép `aranyfeny-sorfal` (előtte `dron-naplemente-v`).

A 2. futás G13-a a régi admin kétlépcsős törlés nélküli felületén már a kezdeti takarításnál megállt, új adatot nem hozott létre (utána ugyanez a három tétel látszott). A közös tárhoz szándékosan nem nyúltam: a takarítás a fő munkamenet feladata (lásd a visszatérési objektum lépéseit).

## 6. Élesítés — fő munkamenet (2026-09-14 este)

Sorrend a megbízó „Teljes” döntése szerint: push → draft deploy → élő próbák (G28) → az élő tár takarítása → production deploy → éles admin-próba (G13).
Admin: a megbízó döntésére a Netlify-on `ADMIN_PASSWORD=admin` minden kontextusban (tesztidőszak, csak tesztadat — éles adat előtt cserélendő).

- **Push:** `67aaf1f..8b29532`.
- **Draft deploy:** `6aa827572f76fedd7cd2a642` (`.netlify/draft-url.txt`): `/` 200, `/api/admin/backup` 401, `/admin` 307, `/llms.txt` 200. `warm-images`: 80/80 képváltozat 200.
- **G28 (final-live) a drafton, két teljes futás:**

| Futás | 3) 20 egyidejű jelentkezés | 4) 9,2 MB fotó / 12 MB PDF | 5) admin-mentés → nyilvános lap | 6) TTFB `/`, `/turak` | 7) Lighthouse mobil `/` (3 futás) | 8) takarítás |
|---|---|---|---|---|---|---|
| mu1hmjg5 | 20/20 tárolva, admin-lista 20 | 342 KB WebP / letöltve, SHA-256 egyezik | **FAIL**: 15 s alatt a régi cím (Edge hit) | 46 / 47 ms | 92 · 98 · 97 | nincs maradék |
| mu1icf7i | 20/20 | 337 KB WebP / SHA-256 egyezik | **FAIL**: 60 s alatt sem | 43 / 49 ms | 92 · 96 · 96 | nincs maradék |

- **Az 5) lépés diagnózisa** (a 2. futás állapotnaplója): a mentés után +0,5 s-nál a régi címet a `"Netlify Durable"; hit` adta (`debug-x-nf-durable-cache-result: …hit_inventory&fresh_gendb…`), utána az edge ezt tárolta újra. A mentés előtti első kérés egy stale durable objektumot tárolt újra (`"Netlify Durable"; fwd=stale; … stored`); a mentés purge-e az edge-et elérte, ezt a durable objektumot nem. **Máshogy nem reprodukálható:**
  - 5 no-op mentés egymás után: 0,5–1,8 s;
  - 3 címmódosítás keep-alive kapcsolaton: 0,5–2,6 s;
  - route handler / szerver-akció purge-kombinációk: 1–6 s;
  - 5 további final-live-szerű futás Lighthouse nélkül: 0,55–1,06 s;
  - tartalom-alapú lánc új kapcsolatokon (a durable utat kényszerítve): 4 mentés × 15 kérés, 0 régi cím.

  Összesen 8 teljes futásból 2 bukott. A `@netlify/plugin-nextjs` 5.15.13 a legfrissebb, a kiadási jegyzetekben és az issue-k közt nincs ilyen hiba. Mérési csapda: az `age` a Next render-idejét követi, nem a CDN-tárolásét, ezért purge-hatást csak tartalommal lehet igazolni.
- **`scripts/checks/final-live.mjs`:** az 5) lépés állapotváltásonként naplóz (cache-status, durable-eredmény, age), és a 15 s után 60 s-ig figyel. Ez diagnosztika, a 15 s-os határ nem változott. A Playwright-kontextus `x-nf-debug-logging` fejlécet küld.
- **Az élő tár takarítása** (draft admin, közös Blobs-tár, 5. pont):
  - törölve a `y1s5qff4` tesztesemény (a 3 fős jelentkezésével) és az `r-57uloy75` beszámoló;
  - a nyitókép visszaállítva: `dron-naplemente-v`;
  - az impresszum tárhelye: „Netlify, Inc. — 101 2nd Street, San Francisco, CA 94105, USA”;
  - a két példaesemény már nem volt a tárban.

  Ellenőrzés a mentés-API-val: PASS. Mellékmérés: a draftról indított mentés a draft főoldalát 2,9 s alatt frissítette.
- **Production deploy** `6aa834dcf9910964657328e9`: 11 útvonal smoke rendben (200 / 401 / 307), a főoldalon nincs tesztesemény, az impresszumban az új cím.
- **G13 élesben:** `ADMIN_FLOW_OK`. A tár pillanatképe előtte és utána: csak az `updatedAt` változott. A 4b lépés megjegyzése szerint egy törölt feltöltött kép a `/files` alatt a CDN-ből legfeljebb 1 óráig még elérhető (a tárból törölve).
- **Régi Google-cache:** `netlify blobs:delete cache google-reviews-hu|en|de` → a `cache` tár üres.
- **A kapusor újrafuttatása (`gate-check.mjs --approve --timeout 900 GATES.md`) kétszer leállt**, mert a gépen elfogyott a memória (közben Lightroom, egy virtuális gép és más munkamenetek is futottak). Egyik futás sem írt eredményt, ezért a ledger továbbra is 25/28-at mutat, a régi bizonyítékkal. A fenti közvetlen mérések szerint:
  - G13 élesben PASS (`ADMIN_FLOW_OK`, a tár diffje tiszta);
  - G28 FAIL, csak az 5) lépés miatt;
  - G27 FAIL (LCP).

  Mindkét leállás után a közös tár tiszta volt (nincs FINAL-LIVE vagy gate-maradék), és árva folyamat sem maradt.
