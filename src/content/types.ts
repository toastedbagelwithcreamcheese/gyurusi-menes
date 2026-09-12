/** A három nyelv kódja; a sorrend a váltóban is ez. A magyar a gyökéren él, a többi előtaggal. */
export const LANGS = ["hu", "en", "de"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "hu";
export function isLang(v: string | undefined | null): v is Lang {
  return (LANGS as readonly string[]).includes(v ?? "");
}

/**
 * Az oldal felületi szövegei egy nyelven (gombok, címkék, szekciócímek). A tartalom
 * (bemutatkozás, aloldalak, események) NEM itt van: az a data/site.json-ban él,
 * nyelvenként, és az adminból szerkeszthető. A magyar (`hu.ts`) a forrás; az en/de
 * ugyanezzel a szerkezettel — a verify `i18n` ága ellenőrzi, hogy egy kulcs se maradjon ki.
 */
export interface Dictionary {
  lang: Lang;
  name: string;
  locale: string;      // Intl: hu-HU / en-GB / de-DE
  ogLocale: string;    // hu_HU / en_GB / de_DE
  meta: { title: string; titleTemplate: string; description: string };
  nav: { huculosveny: string; turak: string; oktatas: string; taborok: string; egyesulet: string; esemenyek: string; kapcsolat: string; menuOpen: string; menuClose: string; call: string; home: string; mainMenu: string; mobileMenu: string; place: string };
  lang_: { label: string };
  hero: { note: string; ctaPrimary: string; ctaSecondary: string; scroll: string };
  owner: { eyebrow: string; call: string; write: string };
  intro: { breedsEyebrow: string; breeds: { name: string; origin: string; text: string }[]; photoCaption: string };
  events: {
    eyebrow: string; title: string; featured: string; next: string; upcoming: string; past: string; none: string;
    details: string; all: string; register: string; registrationClosed: string; pastEvent: string; upcomingEvent: string;
    when: string; where: string; address: string; more: string; back: string;
  };
  tiles: { eyebrow: string; title: string; more: string };
  contact: {
    eyebrow: string; title: string; ownerFirst: string; generalTitle: string; phone: string; email: string; addressLabel: string; map: string; contactPerson: string;
    sub: { title: string; note: string; write: string; call: string };
  };
  form: {
    name: string; email: string; phone: string; phoneOptional: string; message: string; messagePh: string; send: string; sending: string;
    okTitle: string; okBody: string; err: string; website: string;
  };
  reg: {
    title: string; lead: string; name: string; phone: string; email: string; emailOptional: string; count: string; countHint: string; note: string; notePh: string;
    send: string; sending: string; okTitle: string; okBody: string; err: string; closed: string;
  };
  reports: { eyebrow: string; title: string; lead: string; none: string; open: string; size: string };
  footer: { blurb: string; contact: string; follow: string; admin: string; owner: string };
  notFound: { eyebrow: string; title: string; body: string; back: string };
  months: string;
}
