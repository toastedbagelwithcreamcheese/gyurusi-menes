/**
 * Példaesemények a HELYI adatbázisba (data/site.json) — kézi kipróbáláshoz és a tesztekhez (qa-flow, p4-public).
 * A mag (data/seed.json) szándékosan NEM tartalmazza őket: a két esemény kitalált (időpont, időtartam, program),
 * élesbe nem kerülhet. A content-no-fabrication kapu tiltja az azonosítóikat a magban.
 *
 * A dátumok a mai naphoz igazodnak, így a példák sosem járnak le: egy túra a legközelebbi, legalább 5 nap múlva
 * következő szombaton (kiemelt, jelentkezés nyitva), és egy ötnapos tábor hat hét múlva hétfőtől péntekig.
 * Többször futtatva sem duplikál: a korábbi példaeseményeket előbb kiveszi. Használat: npm run db:demo
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");
const DB = path.join(dataDir, "site.json");

export const DEMO_EVENT_IDS = ["pelda-lovastura", "pelda-lovastabor"];

const ymd = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
/** Az első `weekday` napú dátum legalább `minDays` nappal ma után (0 = vasárnap … 6 = szombat). */
function nextWeekday(weekday, minDays) {
  const today = new Date(); const start = addDays(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())), minDays);
  return addDays(start, (weekday - start.getUTCDay() + 7) % 7);
}

export function demoEvents() {
  const tour = nextWeekday(6, 5);
  const campStart = nextWeekday(1, 42);
  return [
    {
      id: "pelda-lovastura", published: true, featured: true, registration: true,
      title: { hu: "Őszi lovastúra a Zalai-dombságban", en: "Autumn trail ride in the Zala hills", de: "Herbstausritt im Zalaer Hügelland" },
      date: ymd(tour), time: "indulás reggel 9 órakor a ménestől", location: "Gyűrűsi Ménes, Gyűrűs", image: "ket-lo-taj",
      summary: {
        hu: "Félnapos túra a ménestől az erdős dombhátakon át, kis csoportban, hucul lovakon — biztosan ülő lovasoknak.",
        en: "A half-day ride from the stud across the wooded ridges, in a small group on Hucul horses — for riders who sit securely.",
        de: "Ein Halbtagesausritt vom Gestüt über die bewaldeten Hügelrücken, in kleiner Gruppe auf Huzulenpferden — für sattelfeste Reiter.",
      },
      body: {
        hu: "Az útvonal erdei utakon és legelőkön vezet, közben egy pihenővel a dombtetőn, ahonnan visszalátni a falura. A tempót a csapathoz igazítjuk.\n\nHozz zárt cipőt, hosszú nadrágot és vizet; sisakot adunk. A jelentkezés igényfelmérés: a létszám alapján telefonon egyeztetjük a részleteket.",
        en: "The route follows forest tracks and pastures, with a rest on the hilltop overlooking the village. We match the pace to the group.\n\nBring closed shoes, long trousers and water; we provide helmets. Registration is a survey of interest: we confirm the details by phone based on numbers.",
        de: "Die Route führt über Waldwege und Weiden, mit einer Rast auf der Hügelkuppe mit Blick aufs Dorf. Das Tempo passen wir der Gruppe an.\n\nBringen Sie geschlossene Schuhe, lange Hosen und Wasser mit; Helme stellen wir. Die Anmeldung ist eine Bedarfsabfrage: Die Einzelheiten stimmen wir telefonisch ab.",
      },
    },
    {
      id: "pelda-lovastabor", published: true, featured: false, registration: true,
      title: { hu: "Őszi szüneti lovastábor", en: "Autumn-break riding camp", de: "Reitlager in den Herbstferien" },
      date: ymd(campStart), endDate: ymd(addDays(campStart, 4)), time: "napközis, hétfőtől péntekig", location: "Gyűrűsi Ménes, Gyűrűs", image: "aranyfeny-lovas-gyerek",
      summary: {
        hu: "Ötnapos napközis tábor iskolás gyerekeknek az őszi szünetben: napi lovaglás, lóápolás, tanyai élet a ménesben.",
        en: "A five-day day camp for school-age children in the autumn break: riding every day, horse care, farm life at the stud.",
        de: "Ein fünftägiges Tageslager für Schulkinder in den Herbstferien: tägliches Reiten, Pferdepflege, Hofleben im Gestüt.",
      },
      body: {
        hu: "A gyerekek naponta lovagolnak a nyugodt hucul iskolalovakon, megtanulják az ápolást, a nyergelést és az etetést, és a ménes mindennapjainak részévé válnak.\n\nA jelentkezésnél add meg a gyerekek számát és korát — a részleteket telefonon egyeztetjük.",
        en: "The children ride every day on the calm Hucul school horses, learn grooming, saddling and feeding, and become part of the stud's daily life.\n\nWhen registering, tell us how many children and their ages — we confirm the details by phone.",
        de: "Die Kinder reiten täglich auf den ruhigen Huzulen-Schulpferden, lernen Putzen, Satteln und Füttern und werden Teil des Alltags im Gestüt.\n\nGeben Sie bei der Anmeldung Anzahl und Alter der Kinder an — die Einzelheiten stimmen wir telefonisch ab.",
      },
    },
  ];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!fs.existsSync(DB)) { fs.mkdirSync(dataDir, { recursive: true }); fs.copyFileSync(path.join(ROOT, "data/seed.json"), DB); }
  const site = JSON.parse(fs.readFileSync(DB, "utf8"));
  const events = demoEvents();
  /* Egy kiemelt esemény lehet: a példa-túra kiemelése mellett a többi kiemelése lekerül (ahogy az admin mentése is teszi). */
  site.events = [...events, ...(site.events ?? []).filter((e) => !DEMO_EVENT_IDS.includes(e.id)).map((e) => ({ ...e, featured: false }))];
  const tmp = `${DB}.${process.pid}.demo.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(site, null, 2)); fs.renameSync(tmp, DB);
  console.log(`Példaesemények a helyi adatbázisban (${path.relative(ROOT, DB)}): ${events.map((e) => `${e.id} (${e.date}${e.endDate ? `–${e.endDate}` : ""})`).join(", ")}.`);
}
