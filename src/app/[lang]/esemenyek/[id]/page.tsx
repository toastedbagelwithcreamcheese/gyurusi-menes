import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLang } from "@/content/types";
import { getDict } from "@/lib/i18n";
import { langPath } from "@/lib/paths";
import { ldFor, ldHtml, metadataFor } from "@/lib/seo";
import { readSite, formatRange, formatDate, isPast, t } from "@/lib/store";
import { resolveImage } from "@/lib/images";
import { SubPage } from "@/components/site/SubPage";
import { Paragraphs } from "@/components/site/Sections";
import { RegistrationForm } from "@/components/site/RegistrationForm";
import { Reveal } from "@/components/Reveal";

type P = { params: Promise<{ lang: string; id: string }> };

/* ISR: első kéréskor renderelődik a tárból, utána gyorsítótárból megy; a build nem renderel előre (lásd a [lang]/layout.tsx megjegyzését). */
export const revalidate = 3600;
export function generateStaticParams() { return []; }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang, id } = await params; if (!isLang(lang)) return {};
  return metadataFor(await readSite(), lang, `/esemenyek/${id}`);
}

export default async function EventPage({ params }: P) {
  const { lang, id } = await params; if (!isLang(lang)) notFound();
  const d = getDict(lang); const site = await readSite();
  const e = site.events.find((x) => x.id === id && x.published); if (!e) notFound();
  const over = isPast(e);
  const when = formatRange(e, lang);
  const others = site.events.filter((x) => x.published && x.id !== e.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
    .map((x) => ({ href: langPath(lang, `/esemenyek/${x.id}`), title: t(x.title, lang), meta: formatDate(x.date, lang, { year: "numeric", month: "long" }), image: x.image }));
  const after = e.registration && !over ? (
    <section className="reg" id="jelentkezes" data-registration>
      <Reveal as="h2" className="h2">{d.reg.title}</Reveal>
      <Reveal as="p" className="lead" delay={60}>{d.reg.lead}</Reveal>
      <Reveal delay={100}><RegistrationForm d={d.reg} privacy={d.form.privacy} eventId={e.id} lang={lang} /></Reveal>
    </section>
  ) : e.registration && over ? <p className="note" style={{ marginTop: 24 }}>{d.reg.closed}</p> : null;
  const ld = ldFor(site, lang, `/esemenyek/${id}`);
  return (
    <>
    {ld && <script type="application/ld+json" dangerouslySetInnerHTML={ldHtml(ld)} />}
    <SubPage site={site} lang={lang} d={d} rest={`/esemenyek/${id}`} eyebrow={over ? d.events.pastEvent : d.events.upcomingEvent} title={t(e.title, lang)} meta={when} image={resolveImage(e.image, site, lang)}
      facts={[{ k: d.events.when, v: <>{when}{e.time ? <><br />{e.time}</> : null}</> }, { k: d.events.where, v: e.location ?? "Gyűrűsi Ménes, Gyűrűs" }, { k: d.events.address, v: site.contact.address }]}
      related={others} relatedTitle={d.events.more} back={{ href: langPath(lang, "/esemenyek"), label: d.events.back }} after={after}>
      <p className="lead">{t(e.summary, lang)}</p>
      {e.body && <Paragraphs text={t(e.body, lang)} />}
    </SubPage>
    </>
  );
}
