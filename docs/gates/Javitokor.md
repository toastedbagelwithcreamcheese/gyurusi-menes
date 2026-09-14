# Javítókör (2026-09-14 este) — a független átvevő 13 hiánya

Alap: cd62d30 + az előző (limit miatt megszakadt) ágens 21 commitolatlan fájlja, befejezve és ellenőrizve. Kód-commit: a37de4b.
Teljes kapusor: `node ~/.claude/skills/unlazy/scripts/gate-check.mjs --reverify --approve --timeout 900 GATES.md` → **25/28** (UNMET: G13, G27, G28).

## Mit futtattam, mit mértem (a teljes kapusor előtt, célzottan)

| Hiány | Megoldás | Ellenőrzés (lefuttatva) |
|---|---|---|
| Fail-closed admin | `admin-auth.ts`: jelszó nélkül production buildben zárva; `ADMIN_OPEN_DEMO=1` = nyitott bemutató; a zárt belépő oldal és az API 503-a kiírja: ADMIN_PASSWORD, bemutatóhoz ADMIN_OPEN_DEMO=1; állapotpanel-sor; a harness-ek a nyitott demót kérik | p3-auth D) (zárt: 5 admin-cím → belépő oldal, üres Basic Auth / üres jelszóval aláírt süti sem enged, API 503, a törlő akció nem fut) + kontroll: C) ugyanazzal a builddel ADMIN_OPEN_DEMO=1-gyel nyitott → PASS |
| Feltöltött képek alt | `Upload.alt: L`, a magyar kötelező (kliens + szerver 400, a típus/méret-hiba után), régi sztring → L olvasáskor (fájlnév → üres), Képek lap szerkesztő, `resolveImage` a lap nyelvén | p6-seo: leírás nélkül 400 és nem tárolódik; hu/en/de nyitókép-alt 3/3; „IMG_1234.jpg” sehol → PASS; p2-uploads (HEIC-lépés kitöltött leírással) → PASS |
| Kontraszt | `.evc.past` opacity helyett szín; a kapcsolati doboz e-mail-linkje (2:1 volt) és a kép nélküli képfej vissza-linkje (1,4:1, aláhúzás nélkül) javítva | G11 (verify.mjs lighthouse) 13 lapon, korábbi + közelgő próbaeseménnyel: mind Accessibility 100, kontraszt rendben; főoldal Performance 100 → PASS |
| Google-értékelések | /api/reviews IP-korlát (5 / 24 óra); README költségszámítás a Google árlistájából (Place Details Enterprise + Atmosphere: 1000/hó ingyenes, 25 USD / 1000; alap keret 30/nap → ≤ 930/hó → 0 USD); .env.example | p5-reviews A6: 5×200, a 6. 429 (Retry-After) Google-hívás nélkül, kontroll: másik IP 200 → PASS |
| NEXT_PUBLIC_SITE_URL | README (mire, build-idejű, tartalék, DNS után), .env.example | p6-seo: `.next-seo` próba-build `https://gyurusimenes.hu`-val, a változó nélkül indítva: robots Sitemap, 3/3 lap canonical/hreflang/og:url/og:image, sitemap 195 cím; kontroll: a fő build canonical-ja http://localhost:3012 → PASS |
| p5-mail egyedi címek | 6. lépés új szerverrel | CONTACT_TO/CONTACT_FROM a mock `to`/`from`/`reply_to` mezőjében és az állapotpanelen; kontroll: változók nélkül az alapértelmezés → PASS |
| G5 lefedettség | a mag + src/content/*.ts + llms.ts + mail.ts + privacy.ts, megjegyzések nélkül | 3 kontroll (beinjektált „3 000 Ft” fennakad; megjegyzésbeli nem; sztringbeli „//” nem vág) → PASS |
| G12 CHECK | `scripts/shots.mjs` PASS/FAIL-lel; GATES.md-ben csak a CHECK/EXPECT került hozzá | 8 lap × 2 nézet: scrollWidth ≤ innerWidth, 0 konzolhiba, nyelvváltó; kontrollok: 4000 px-es elem jelezve, console.error elkapva → PASS |
| Sitemap lastmod | `writeSite` → `updatedAt` (esemény is), a sitemap ebből; mentés nélkül nincs lastmod | p6-seo fixture: esemény 2026-09-01, többi 2026-09-02; p3-admin-ux: a mentés frissíti az updatedAt-ot → PASS |
| huculosveny 301 | `next.config.ts` host-feltételes szabály | p6-seo Host-fejléccel: 3 cím 301 → https://gyurusimenes.hu/huculosveny; kontroll: 3 más hoszton nem → PASS |
| G27 | EN/DE lap a p7-speed-ben; inlineCss és betű-előtöltés nélkül újramérve (P7.md, „Javítókör”) — mindkettő rosszabb, visszavonva | lásd lent |

## G27 a teljes kapusorban (Lighthouse 13 mobil; csak az ebben a futásban írt fájlok)

`/` 2,56 s (2,56 / 2,55 / 2,98) · `/turak` 2,48 s (1 futás) · `/esemenyek` 2,48 s (1 futás) · eseménylap 2,26 s (1 futás) · `/en` 2,98 s (3×) · `/de/turak` 3,13 s (3,13 / 2,48 / 3,13, Performance 94).
A kapu a `/`, `/en` és `/de/turak` LCP-jén (és a `/de/turak` Performance-mediánján) bukik; TBT 0, CLS 0. A küszöb változatlan. Korlát: P7.md „Javítókör”.

## Nem teljesülő kapuk

- **G13**: `BASE_URL=https://gyurusi-menes-demo.netlify.app node scripts/admin-flow.mjs` → `page.waitForURL` időtúllépés — élesben még a P1 előtti kód fut. Utána olvasva: új próbaadat nem keletkezett (csak a korábbi „Teszt esemény (gate mu1b9fgf)” látszik).
- **G28**: `final-live.mjs` → „nincs cél” (nincs draft deploy — a fő munkamenet dolga).
- **G27**: fent.
