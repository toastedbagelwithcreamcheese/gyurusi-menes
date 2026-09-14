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
