import { LANGS, type Lang } from "@/content/types";
import { DICTS } from "@/lib/i18n";
import { langPath } from "@/lib/paths";
import { PAGE_KEYS, formatRange, past, t, upcoming, type Event, type SiteContent } from "@/lib/store";
import { SITE_NAME, absUrl } from "@/lib/seo";

/**
 * /llms.txt és /llms-full.txt (llmstxt.org formátum): rövid, idézhető, tényszerű összefoglaló AI-keresőknek.
 * Minden sor a tartalomtárból (az admin által szerkesztett, docs/RESEARCH.md-vel igazolt mag) vagy a szótárból
 * jön — kézzel írt állítás nincs benne. A túraútvonal-illusztráció (d.route) szándékosan kimarad: az nem bejárt,
 * igazolt útvonal. A tulajdonos telefonja és e-mailje csak akkor szerepel, ha az adminban ki van töltve.
 */
const para = (s: string) => s.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
const events = (site: SiteContent) => [...upcoming(site.events), ...past(site.events)];
const where = (e: Event, lang: Lang) => `${formatRange(e, lang)}${e.location ? `, ${e.location}` : ""}`;

export function buildLlms(site: SiteContent, full: boolean): string {
  const hu = DICTS.hu;
  const out: string[] = [`# ${SITE_NAME}`, "", `> ${hu.meta.description}`, "", ...para(t(site.intro.lead, "hu")), ""];
  for (const lang of LANGS) out.push(...facts(site, lang), ...links(site, lang), ...(full ? texts(site, lang) : []));
  out.push("## Optional", "");
  if (!full) out.push(`- [llms-full.txt](${absUrl("/llms-full.txt")}): ${LANGS.map((l) => DICTS[l].seo.llms.full).join(" / ")}`);
  out.push(`- [sitemap.xml](${absUrl("/sitemap.xml")})`, "");
  return out.join("\n");
}

/** Az alapadatok egy nyelven: ki, hol, a tulajdonos, a kapcsolattartó, a fajták, a közösségi oldalak, a nyelvi változatok. */
function facts(site: SiteContent, lang: Lang): string[] {
  const d = DICTS[lang], o = site.owner, c = site.contact;
  const lines = [`## ${d.seo.llms.facts} (${d.name})`, ""];
  if (lang !== "hu") lines.push(`> ${d.meta.description}`, "", ...para(t(site.intro.lead, lang)), "");
  const ownerReach = [o.phone && `${d.contact.phone}: ${o.phone}`, o.email && `${d.contact.email}: ${o.email}`].filter(Boolean).join(" · ");
  lines.push(
    `- ${SITE_NAME}: ${d.footer.blurb}`,
    `- ${d.contact.addressLabel}: ${c.address} (${d.hero.note})`,
    `- ${d.footer.owner}: ${o.name}, ${t(o.role, lang)}. ${t(o.note, lang)}${ownerReach ? ` ${ownerReach}` : ""}`,
    `- ${d.contact.contactPerson}: ${c.person} · ${d.contact.phone}: ${c.phone} · ${d.contact.email}: ${c.email}`,
    `- ${d.seo.llms.breeds}: ${d.intro.breeds.map((b) => `${b.name} (${b.origin})`).join(", ")}`,
  );
  const social = [c.facebook && `Facebook: ${c.facebook}`, c.instagram && `Instagram: ${c.instagram}`].filter(Boolean);
  if (social.length) lines.push(`- ${d.footer.follow}: ${social.join(" · ")}`);
  lines.push(`- ${d.lang_.label}: ${LANGS.map((l) => `${DICTS[l].name} ${absUrl(langPath(l))}`).join(" · ")}`, "");
  return lines;
}

/** A lapok és az események linkjei egy nyelven, egy-egy tényszerű mondattal (a lap bevezetője / az esemény összefoglalója). */
function links(site: SiteContent, lang: Lang): string[] {
  const d = DICTS[lang];
  const u = (p: string) => absUrl(langPath(lang, p));
  const out = [
    `## ${d.seo.llms.pages} (${d.name})`, "",
    `- [${SITE_NAME}](${u("/")}): ${t(site.hero.subtitle, lang)}`,
    ...PAGE_KEYS.map((k) => `- [${t(site.pages[k].title, lang)}](${u(`/${k}`)}): ${t(site.pages[k].lead, lang)}`),
    `- [${d.events.title}](${u("/esemenyek")}): ${d.seo.events}`,
    `- [${d.legal.privacyTitle}](${u("/adatkezeles")})`,
    `- [${d.legal.imprintTitle}](${u("/impresszum")})`,
    "",
  ];
  const list = events(site);
  if (list.length) out.push(`## ${d.nav.esemenyek} (${d.name})`, "", ...list.map((e) => `- [${t(e.title, lang)}](${u(`/esemenyek/${e.id}`)}): ${where(e, lang)} — ${t(e.summary, lang)}`), "");
  return out;
}

/** Csak a teljes változatban: a lapok teljes szövege (bemutatkozás, aloldalak saját kapcsolattal, események, impresszum). */
function texts(site: SiteContent, lang: Lang): string[] {
  const d = DICTS[lang];
  const u = (p: string) => absUrl(langPath(lang, p));
  const out = [`## ${d.seo.llms.texts} (${d.name})`, ""];
  const block = (title: string, url: string, lines: string[]) => out.push(`### ${title}`, "", url, "", ...lines.filter(Boolean).flatMap((l) => [l, ""]));
  const o = site.owner, c = site.contact;
  block(t(site.intro.title, lang), u("/"), [
    ...para(t(site.intro.lead, lang)), ...para(t(site.intro.body, lang)),
    ...d.intro.breeds.map((b) => `${b.name} (${b.origin}): ${b.text}`),
    `${d.footer.owner}: ${o.name}, ${t(o.role, lang)}. ${t(o.note, lang)}`,
    `${d.contact.contactPerson}: ${c.person} · ${d.contact.phone}: ${c.phone} · ${d.contact.email}: ${c.email} · ${d.contact.addressLabel}: ${c.address}. ${t(c.note, lang)}`,
  ]);
  for (const k of PAGE_KEYS) {
    const p = site.pages[k];
    block(t(p.title, lang), u(`/${k}`), [...para(t(p.lead, lang)), ...para(t(p.body, lang)),
      `${d.contact.contactPerson}: ${p.contact.person} · ${d.contact.phone}: ${p.contact.phone} · ${d.contact.email}: ${p.contact.email}. ${t(p.contact.note, lang)}`]);
  }
  for (const e of events(site)) {
    /* Az időpont szövege (`time`) csak magyarul van a tartalomban — idegen nyelvű szövegbe nem keverjük. */
    block(t(e.title, lang), u(`/esemenyek/${e.id}`), [`${d.events.when}: ${formatRange(e, lang)}${lang === "hu" && e.time ? ` (${e.time})` : ""}`,
      `${d.events.where}: ${e.location || SITE_NAME}`, ...para(t(e.summary, lang)), ...para(t(e.body, lang))]);
  }
  const i = site.legal.imprint;
  const rows: Array<[string, string]> = [[d.legal.operator, i.operator], [d.legal.person, i.person], [d.legal.address, i.address], [d.legal.email, i.email], [d.legal.phone, i.phone], [d.legal.taxId, i.taxId], [d.legal.regNo, i.regNo], [d.legal.hosting, i.hosting]];
  block(d.legal.imprintTitle, u("/impresszum"), rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`));
  return out;
}
