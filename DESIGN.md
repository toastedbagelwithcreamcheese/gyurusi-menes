# Gyűrűsi Ménes — design rendszer

## Irány
A fotókból indul minden: augusztus végi szalmasárga legelő, zalai erdőzöld dombhát, meleg por, fehér kordon. A design keret, nem főszereplő. Egyetlen „aláírás": a naplementés drónfelvétel a V-alakzatba állt lovasokkal, teljes képernyőn — utána nyugodt, editorial ritmus.

Kerülve: barna-beige tömeg, arany, western-klisé, díszítő elemek, folyamatos mozgás.

## Színek (`src/app/globals.css` `@theme`)
| Token | Érték | Szerep |
|---|---|---|
| `bone` | #f7f4ee | alap háttér |
| `bone-2` | #efeadf | megemelt szekció, kártya |
| `straw` | #d9c48f | vékony vonalak, felirat-jelölő |
| `dust` | #8a7d66 | másodlagos szöveg (≥4.5:1 bone-on) |
| `ink` | #1d1b17 | szöveg, elsődleges gomb |
| `forest` / `forest-deep` | #2d4a37 / #1f3327 | strukturális sötét felület (huculösvény-blokk, lábléc, admin nav) |
| `moss` | #9db38f | másodlagos szöveg sötéten |
| `sky` | #2f5aa6 | egyetlen akcentus (csikós-kendő kék): fókusz, link, admin-jelvény |

## Tipográfia
- Címek: **Fraunces** (variable; `opsz` 144, `SOFT` 30), 500-as vastagság, enyhén negatív betűköz. Csak címekben.
- Szöveg: **Instrument Sans** 17px / 1.6.
- Skála: `.display` (2.6–5.6rem) · `.h1` (2.2–3.8) · `.h2` (1.8–2.8) · `.h3` (1.25–1.5) · `.lead` (1.1–1.3) · `.eyebrow` (0.78rem, 0.14em tracking, caps) · `.caption` (0.8rem caps, vonal-jelölővel).

## Térköz, forma
- `--pad: clamp(20px, 5vw, 80px)`, `--wrap: 1280px`, `--wrap-narrow: 760px`, `--section: clamp(72px, 10vw, 152px)`.
- Lekerekítés: 4 / 10 / 18px; gombok pill.
- Képek: `.photo` keret, `object-fit: cover`, blur-placeholder a manifestből, ismert méret (CLS 0).

## Motion
- Belépés: `.rise` (opacity + 22px emelkedés, 850ms, expo-out), `.unveil` (clip-path takarás lehúzása képeken, 1100ms).
- Gombok: `scale(0.97)` lenyomásra, 160ms. Hover csak `(hover: hover) and (pointer: fine)` alatt.
- Nincs parallax, nincs scroll-jacking, nincs folyamatos animáció. `prefers-reduced-motion`: csak opacity.

## Töréspontok
640 (galéria 2→3 oszlop), 700, 900 (asztali nav, kétoszlopos rácsok), 1024/1100 (galéria 4 oszlop).
