import type { Metadata } from "next";
import { LANGS, type Lang } from "@/content/types";
import { DICTS, getDict } from "@/lib/i18n";
import { alternatesFor, langPath } from "@/lib/paths";
import { resolveImage } from "@/lib/images";
import { PAGE_KEYS, featuredEvent, formatRange, isPageKey, past, t, upcoming, type Event, type SiteContent } from "@/lib/store";

/**
 * Keresőoptimalizálás egy helyen: lapcím és leírás (hosszkorláttal), abszolút canonical + kölcsönös hreflang,
 * Open Graph / Twitter, a lapfüggő megosztási kép adatai és a JSON-LD strukturált adat. A lapok csak
 * `metadataFor()`-t és `ldFor()`-t hívnak ugyanazzal az útvonallal. Minden szöveg a tartalomtárból vagy a
 * szótárból jön; ár, nyitvatartás és értékelés szándékosan nincs benne (nem igazolt adat, ill. a Google
 * szabályai szerint saját oldalon nem jelölhető).
 */

export const SITE_NAME = "Gyűrűsi Ménes";
/** Az éles cím a NEXT_PUBLIC_SITE_URL; enélkül Netlify-on a Netlify saját `URL` változója, helyben localhost. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "http://localhost:3000").replace(/\/+$/, "");
export const absUrl = (p: string) => `${SITE_URL}${p.startsWith("/") ? p : `/${p}`}`;
export const OG_SIZE = { width: 1200, height: 630 } as const;

/** A helyszín koordinátái — KÖZELÍTŐ érték, a saját drónfotók EXIF-jéből kerekítve. A ménes saját oldalain nincs
 *  GPS; a harmadik feles gyeresportolni.hu 46.888385, 16.992235-öt ad (docs/RESEARCH.md, 2. pont) — ezzel egyezik. */
export const GEO = { latitude: 46.888, longitude: 16.99 } as const;

/* ---------------- cím és leírás ---------------- */

const TITLE_MAX = 60, DESC_MIN = 70, DESC_MAX = 160;
const SUFFIX = ` · ${SITE_NAME}`;
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** Szóhatáron vágás „…”-vel, ha a szöveg hosszabb `max`-nál. */
function cut(s: string, max: number): string {
  if (s.length <= max) return s;
  const room = s.slice(0, max - 1);
  const sp = room.lastIndexOf(" ");
  return `${(sp > max / 2 ? room.slice(0, sp) : room).replace(/[\s,;:·–—-]+$/, "")}…`;
}

/** Lapcím: az első jelölt, ami belefér a 60 karakterbe (a találati listában így nem vágódik le). */
export function fitTitle(...candidates: string[]): string {
  const list = candidates.map(squash).filter(Boolean);
  return list.find((c) => c.length <= TITLE_MAX) ?? cut(list[list.length - 1] ?? SITE_NAME, TITLE_MAX);
}
const brandTitle = (name: string) => fitTitle(`${name}${SUFFIX}`, name);

/** Meta-leírás 70–160 karakterrel: ha rövid, a kiegészítő mondat jön utána; ha hosszú, mondat- vagy szóhatáron vág. */
export function fitDescription(main: string, ...fill: string[]): string {
  let s = squash(main);
  for (const f of fill.map(squash)) {
    if (s.length >= DESC_MIN) break;
    if (!f || s.includes(f)) continue;
    s = s ? `${s}${/[.!?…]$/.test(s) ? "" : "."} ${f}` : f;
  }
  if (s.length <= DESC_MAX) return s;
  /* Mondatvég: írásjel, utána szóköz és nagybetű — de nem sorszám („IX. Gyűrűsi”) és nem évszám („2026. ”). */
  let end = -1;
  for (const m of s.matchAll(/(?<![\dIVXLC])[.!?](?=\s+[A-ZÁÉÍÓÖŐÚÜŰÄ])/g)) { const i = (m.index ?? 0) + 1; if (i <= DESC_MAX) end = i; }
  return end >= DESC_MIN ? s.slice(0, end) : cut(s, DESC_MAX);
}

/* ---------------- egy nyilvános lap leírása ---------------- */

export type OgCard = { title: string; eyebrow: string; imageId?: string };
type Crumb = { name: string; path: string };
export type PageSeo = { kind: "home" | "page" | "events" | "event" | "legal"; path: string; name: string; title: string; description: string; og: OgCard; trail: Crumb[]; event?: Event };

/** Minden nyilvános útvonal (nyelvi előtag nélkül) — a sitemap, az llms.txt és a kapuszkriptek ugyanezt járják be. */
export function publicPaths(site: SiteContent): string[] {
  return ["/", ...PAGE_KEYS.map((k) => `/${k}`), "/esemenyek", ...site.events.filter((e) => e.published).map((e) => `/esemenyek/${e.id}`), "/adatkezeles", "/impresszum"];
}

/** Egy lap keresőknek szóló adatai; ismeretlen vagy nem publikált útvonalra null. */
export function describe(site: SiteContent, lang: Lang, path: string): PageSeo | null {
  const d = getDict(lang);
  const [a, b, ...more] = path.split("/").filter(Boolean);
  const home: Crumb = { name: SITE_NAME, path: "/" };
  const hero = site.hero.image;
  if (!a) {
    return { kind: "home", path: "/", name: SITE_NAME, title: fitTitle(d.meta.title), description: fitDescription(d.meta.description, d.seo.place),
      og: { title: t(site.hero.title, lang), eyebrow: d.hero.note, imageId: hero }, trail: [home] };
  }
  if (more.length) return null;
  if (!b && isPageKey(a)) {
    const p = site.pages[a]; const name = t(p.title, lang);
    return { kind: "page", path: `/${a}`, name, title: brandTitle(name), description: fitDescription(t(p.lead, lang), d.seo.place),
      og: { title: name, eyebrow: d.nav.place, imageId: p.images[0] ?? hero }, trail: [home, { name, path: `/${a}` }] };
  }
  if (a === "esemenyek" && !b) {
    const name = d.events.title;
    return { kind: "events", path: "/esemenyek", name, title: brandTitle(name), description: fitDescription(d.seo.events, d.seo.place),
      og: { title: name, eyebrow: d.nav.place, imageId: featuredEvent(site.events)?.image ?? hero }, trail: [home, { name, path: "/esemenyek" }] };
  }
  if (a === "esemenyek" && b) {
    const e = site.events.find((x) => x.id === b && x.published);
    if (!e) return null;
    const name = t(e.title, lang); const year = e.date.slice(0, 4);
    /* Évente visszatérő eseményeknél ugyanaz lehet a cím: az évszám teszi egyedivé (ha még nincs benne). */
    const dated = name.includes(year) ? name : `${name} ${year}`;
    const when = formatRange(e, lang);
    return { kind: "event", path: `/esemenyek/${e.id}`, name, event: e,
      title: fitTitle(`${dated}${SUFFIX}`, dated, `${name}${SUFFIX}`, name),
      description: fitDescription(`${when} · ${e.location || `${SITE_NAME}, Gyűrűs`} — ${t(e.summary, lang)}`, d.seo.place),
      og: { title: name, eyebrow: when, imageId: e.image ?? hero }, trail: [home, { name: d.events.title, path: "/esemenyek" }, { name, path: `/esemenyek/${e.id}` }] };
  }
  if (!b && (a === "adatkezeles" || a === "impresszum")) {
    const privacy = a === "adatkezeles"; const name = privacy ? d.legal.privacyTitle : d.legal.imprintTitle;
    return { kind: "legal", path: `/${a}`, name, title: brandTitle(name), description: fitDescription(privacy ? d.seo.privacy : d.seo.imprint, d.seo.place),
      og: { title: name, eyebrow: d.nav.place, imageId: hero }, trail: [home, { name, path: `/${a}` }] };
  }
  return null;
}

/** FNV-1a ujjlenyomat a megosztási kép címébe: ha a cím vagy a kép változik, új URL — a Facebook és a CDN újra lekéri. */
function fingerprint(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

/** A lapfüggő megosztási kép útvonala (src/app/og/[lang]/[[...path]]/route.tsx rajzolja). */
export function ogImagePath(site: SiteContent, lang: Lang, x: Pick<PageSeo, "path" | "og">): string {
  const im = resolveImage(x.og.imageId, site);
  return `/og/${lang}${x.path === "/" ? "" : x.path}?v=${fingerprint(`${x.og.title}|${x.og.eyebrow}|${im?.src ?? ""}`)}`;
}

/**
 * Nem létező útvonal metaadata — a lapok generateMetadata-ja adja ismeretlen paraméterre. A 404-es választ a Next
 * hibaváz-dokumentumként küldi, amit a böngésző a lap RSC-adataiból újrarajzol: ebben a lap (és nem a not-found.tsx)
 * metaadata számít, így enélkül a fülön a főoldal címe jelenne meg (a review X12-es lelete).
 */
export function notFoundMetadata(lang: Lang): Metadata {
  return { title: { absolute: getDict(lang).seo.notFound }, robots: { index: false, follow: true } };
}

/** Teljes metaadat-készlet egy laphoz. Teljes kell: egy lap `openGraph`-ja a layoutét egészében felülírja, nem egyesíti. */
export function metadataFor(site: SiteContent, lang: Lang, path: string): Metadata {
  const x = describe(site, lang, path);
  if (!x) return notFoundMetadata(lang);
  const d = getDict(lang);
  const url = langPath(lang, x.path);
  const image = { url: ogImagePath(site, lang, x), width: OG_SIZE.width, height: OG_SIZE.height, alt: `${x.og.title} – ${SITE_NAME}`, type: "image/jpeg" };
  return {
    title: { absolute: x.title },
    description: x.description,
    alternates: { canonical: url, languages: alternatesFor(x.path) },
    openGraph: { type: "website", siteName: SITE_NAME, locale: d.ogLocale, alternateLocale: LANGS.filter((l) => l !== lang).map((l) => DICTS[l].ogLocale),
      url, title: x.title, description: x.description, images: [image] },
    twitter: { card: "summary_large_image", title: x.title, description: x.description, images: [{ url: image.url, alt: image.alt }] },
  };
}

/* ---------------- JSON-LD ---------------- */

type Node = Record<string, unknown>;
const ID = { business: absUrl("/#menes"), owner: absUrl("/#tulajdonos"), website: absUrl("/#website") };

/** „8932 Gyűrűs, Petőfi Sándor u. 2.” → PostalAddress (megye és ország rögzítve: Zala, HU). */
export function postalAddress(address: string): Node {
  const m = address.match(/^\s*(\d{4})\s+([^,]+?),\s*(.+?)\s*$/);
  return { "@type": "PostalAddress", ...(m ? { streetAddress: m[3], postalCode: m[1], addressLocality: m[2] } : { streetAddress: address }), addressRegion: "Zala", addressCountry: "HU" };
}

/** A ménes: LocalBusiness + SportsActivityLocation, a tulajdonossal (founder) — nyitvatartás, ár, értékelés nélkül. */
function businessLd(site: SiteContent, lang: Lang): Node {
  const d = getDict(lang), o = site.owner, c = site.contact;
  const hero = resolveImage(site.hero.image, site);
  const home = describe(site, lang, "/");
  return {
    "@type": ["LocalBusiness", "SportsActivityLocation"], "@id": ID.business,
    name: SITE_NAME, description: d.meta.description, url: absUrl(langPath(lang)),
    telephone: c.phone, email: c.email, address: postalAddress(c.address),
    geo: { "@type": "GeoCoordinates", latitude: GEO.latitude, longitude: GEO.longitude },
    ...(c.mapUrl ? { hasMap: c.mapUrl } : {}),
    image: [...(home ? [absUrl(ogImagePath(site, lang, home))] : []), ...(hero ? [absUrl(hero.src)] : [])],
    logo: absUrl("/apple-icon.png"),
    sameAs: [c.facebook, c.instagram].filter(Boolean),
    knowsAbout: d.intro.breeds.map((x) => x.name),
    founder: { "@type": "Person", "@id": ID.owner, name: o.name, jobTitle: t(o.role, lang), ...(o.phone ? { telephone: o.phone } : {}), ...(o.email ? { email: o.email } : {}) },
    contactPoint: { "@type": "ContactPoint", name: c.person, contactType: d.contact.generalTitle, telephone: c.phone, email: c.email },
  };
}

function websiteLd(lang: Lang): Node {
  return { "@type": "WebSite", "@id": ID.website, url: absUrl("/"), name: SITE_NAME, description: getDict(lang).footer.blurb, inLanguage: [...LANGS], publisher: { "@id": ID.business } };
}

function webPageLd(site: SiteContent, lang: Lang, x: PageSeo): Node {
  const url = absUrl(langPath(lang, x.path));
  return {
    "@type": x.kind === "events" ? "CollectionPage" : "WebPage", "@id": `${url}#webpage`, url, name: x.name, description: x.description, inLanguage: lang,
    isPartOf: { "@id": ID.website }, about: { "@id": ID.business },
    primaryImageOfPage: { "@type": "ImageObject", url: absUrl(ogImagePath(site, lang, x)), width: OG_SIZE.width, height: OG_SIZE.height },
  };
}

function breadcrumbLd(lang: Lang, trail: Crumb[]): Node {
  return { "@type": "BreadcrumbList", itemListElement: trail.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absUrl(langPath(lang, c.path)) })) };
}

/** A naptár sorrendje ugyanaz, mint a lapon: kiemelt, közelgők, korábbiak. */
function calendar(site: SiteContent): Event[] {
  const f = featuredEvent(site.events);
  return [...(f ? [f] : []), ...upcoming(site.events).filter((e) => e.id !== f?.id), ...past(site.events)];
}

/** Összefoglaló lap + részletes lapok (Google „carousel”): a ListItem csak position + url. */
function itemListLd(lang: Lang, list: Event[]): Node {
  return { "@type": "ItemList", itemListElement: list.map((e, i) => ({ "@type": "ListItem", position: i + 1, url: absUrl(langPath(lang, `/esemenyek/${e.id}`)) })) };
}

/** Esemény: ár (offers) nélkül — a jelentkezés igényfelmérés, díjat nem adunk meg. */
function eventLd(site: SiteContent, lang: Lang, x: PageSeo, e: Event): Node {
  const url = absUrl(langPath(lang, x.path));
  const photo = resolveImage(e.image ?? site.hero.image, site);
  /* A ménesben tartott eseménynél a ménes címe és koordinátái; máshol csak a megadott helyszín szövege. */
  const atStud = !e.location || /gyűrűs/i.test(e.location);
  return {
    "@type": "Event", "@id": `${url}#event`, name: x.name, description: t(e.summary, lang), url, inLanguage: lang,
    startDate: e.date, endDate: e.endDate ?? e.date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: atStud
      ? { "@type": "Place", name: e.location || SITE_NAME, address: postalAddress(site.contact.address), geo: { "@type": "GeoCoordinates", latitude: GEO.latitude, longitude: GEO.longitude } }
      : { "@type": "Place", name: e.location, address: e.location },
    image: [absUrl(ogImagePath(site, lang, x)), ...(photo ? [absUrl(photo.src)] : [])],
    organizer: { "@type": "Organization", "@id": ID.business, name: SITE_NAME, url: absUrl(langPath(lang)) },
  };
}

/** Egy lap teljes JSON-LD-gráfja: a ménes + a webhely minden lapon (egy entitás), utána a lapra jellemző csomópontok. */
export function ldFor(site: SiteContent, lang: Lang, path: string): Node | null {
  const x = describe(site, lang, path);
  if (!x) return null;
  const nodes: Node[] = [businessLd(site, lang), websiteLd(lang), webPageLd(site, lang, x)];
  if (x.kind !== "home") nodes.push(breadcrumbLd(lang, x.trail));
  if (x.kind === "events") { const list = calendar(site); if (list.length) nodes.push(itemListLd(lang, list)); }
  if (x.kind === "event" && x.event) nodes.push(eventLd(site, lang, x, x.event));
  if (x.kind === "page") {
    const key = x.path.slice(1);
    const faq = isPageKey(key) ? site.pages[key].faq ?? [] : [];
    if (faq.length) nodes.push({ "@type": "FAQPage", "@id": `${absUrl(langPath(lang, x.path))}#gyik`, inLanguage: lang,
      mainEntity: faq.map((f) => ({ "@type": "Question", name: t(f.q, lang), acceptedAnswer: { "@type": "Answer", text: t(f.a, lang) } })) });
  }
  return { "@context": "https://schema.org", "@graph": nodes };
}

/** A `<script type="application/ld+json">` tartalma — a `<` escape-elve (a Next.js JSON-LD útmutatója szerint). */
export const ldHtml = (data: unknown) => ({ __html: JSON.stringify(data).replace(/</g, "\\u003c") });
