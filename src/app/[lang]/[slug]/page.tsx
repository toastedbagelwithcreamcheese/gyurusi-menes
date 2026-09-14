import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLang, LANGS } from "@/content/types";
import { getDict } from "@/lib/i18n";
import { alternatesFor, langPath } from "@/lib/paths";
import { readSite, isPageKey, PAGE_KEYS, t, formatDate } from "@/lib/store";
import { resolveImage } from "@/lib/images";
import { SubPage } from "@/components/site/SubPage";
import { Paragraphs } from "@/components/site/Sections";
import { Reveal } from "@/components/Reveal";
import { fileUrl } from "@/lib/files";
import { RouteMap } from "@/components/site/RouteMap";
import { TrailRoutes, visibleRoutes } from "@/components/site/TrailRoutes";

type P = { params: Promise<{ lang: string; slug: string }> };

export function generateStaticParams() { return LANGS.flatMap((lang) => PAGE_KEYS.map((slug) => ({ lang, slug }))); }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLang(lang) || !isPageKey(slug)) return {};
  const site = await readSite(); const p = site.pages[slug]; const im = resolveImage(p.images[0], site);
  return { title: t(p.title, lang), description: t(p.lead, lang), alternates: { canonical: langPath(lang, `/${slug}`), languages: alternatesFor(`/${slug}`) },
    openGraph: { title: t(p.title, lang), description: t(p.lead, lang), images: im ? [{ url: im.src, width: im.width, height: im.height, alt: im.alt }] : undefined } };
}

const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Az öt aloldal egy lapból: a tartalom (cím, bevezető, szöveg, képek, saját kapcsolat) az adminból jön. */
export default async function ContentPage({ params }: P) {
  const { lang, slug } = await params;
  if (!isLang(lang) || !isPageKey(slug)) notFound();
  const d = getDict(lang); const site = await readSite(); const p = site.pages[slug];
  const [head, ...rest] = p.images.map((id) => resolveImage(id, site)).filter((x): x is NonNullable<typeof x> => !!x);
  const related = PAGE_KEYS.filter((k) => k !== slug).slice(0, 3).map((k) => ({ href: langPath(lang, `/${k}`), title: t(site.pages[k].title, lang), image: site.pages[k].images[0] }));

  let after: React.ReactNode = null;
  if (slug === "turak") {
    /* Az adminban felvett, közzétett útvonalak kártyaként; amíg nincs ilyen, az illusztrált térkép (semleges jelmagyarázattal). */
    const routes = visibleRoutes(site);
    after = routes.length > 0 ? <TrailRoutes routes={routes} site={site} lang={lang} d={d} /> : <RouteMap d={d.route} />;
  }
  if (slug === "egyesulet") {
    const reports = site.reports.filter((r) => r.published).sort((a, b) => b.date.localeCompare(a.date));
    const years = [...new Set(reports.map((r) => r.year))].sort((a, b) => b - a);
    after = (
      <section className="reports" id="beszamolok" data-reports>
        <Reveal as="p" className="eyebrow">{d.reports.eyebrow}</Reveal>
        <Reveal as="h2" className="h1 mask" delay={60}>{d.reports.title}</Reveal>
        <Reveal as="p" className="lead" delay={100} >{d.reports.lead}</Reveal>
        {reports.length === 0 ? <Reveal as="p" className="note" delay={120}>{d.reports.none}</Reveal> : years.map((y) => (
          <Reveal key={y} className="rep-year" delay={80}>
            <h3 className="h2">{y}</h3>
            <ul className="rep-list" role="list">
              {reports.filter((r) => r.year === y).map((r) => (
                <li key={r.id}><a href={fileUrl(r.file)} target="_blank" rel="noopener" className="rep-row"><span className="rep-title">{r.title}</span><span className="rep-meta">{formatDate(r.date, lang, { year: "numeric", month: "short", day: "numeric" })} · PDF · {fmtSize(r.size)}</span></a></li>
              ))}
            </ul>
          </Reveal>
        ))}
      </section>
    );
  }

  return (
    <SubPage site={site} lang={lang} d={d} rest={`/${slug}`} eyebrow={d.nav[slug]} title={t(p.title, lang)} image={head ?? null} strip={rest.slice(0, 3)}
      contact={p.contact} related={related} back={{ href: langPath(lang), label: "Gyűrűsi Ménes" }} after={after}>
      <p className="lead">{t(p.lead, lang)}</p>
      <Paragraphs text={t(p.body, lang)} />
    </SubPage>
  );
}
