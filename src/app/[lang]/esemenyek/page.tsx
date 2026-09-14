import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLang } from "@/content/types";
import { getDict } from "@/lib/i18n";
import { ldFor, ldHtml, metadataFor } from "@/lib/seo";
import { readSite, upcoming, past, featuredEvent } from "@/lib/store";
import { Shell } from "@/components/site/SubPage";
import { EventCard, EventGrid, PastEvents } from "@/components/site/Sections";
import { Reveal } from "@/components/Reveal";

type P = { params: Promise<{ lang: string }> };

/* ISR: első kéréskor renderelődik a tárból, utána gyorsítótárból megy; a build nem renderel előre (lásd a [lang]/layout.tsx megjegyzését). */
export const revalidate = 3600;
export function generateStaticParams() { return []; }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang } = await params; if (!isLang(lang)) return {};
  return metadataFor(await readSite(), lang, "/esemenyek");
}

/**
 * Eseménynaptár: kiemelt nagyban, közelgők rácsban, korábbiak évenként (a legutóbbi két év nyitva).
 * Címsor-sorrend: H1 → a kiemelt esemény címe (H2) → „Közelgő” és „Korábbi események” (H2, felirat-stílusban) →
 * a kártyák és az évek (H3) → az év eseményei (H4). A látvány ugyanaz, csak a szintek helyesek.
 */
export default async function EventsPage({ params }: P) {
  const { lang } = await params; if (!isLang(lang)) notFound();
  const d = getDict(lang); const site = await readSite();
  const feat = featuredEvent(site.events);
  const up = upcoming(site.events).filter((e) => e.id !== feat?.id);
  const pst = past(site.events);
  const ld = ldFor(site, lang, "/esemenyek");
  return (
    <Shell site={site} lang={lang} d={d} rest="/esemenyek">
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={ldHtml(ld)} />}
      <div className="wrap sub-head">
        <Reveal as="p" className="eyebrow" trigger="mount">{d.events.eyebrow}</Reveal>
        <Reveal as="h1" className="h1 mask" trigger="mount" delay={80}>{d.events.title}</Reveal>
      </div>
      <div className="wrap">
        {feat ? <Reveal trigger="mount" delay={140}><EventCard e={feat} site={site} lang={lang} d={d} tag={feat.featured ? d.events.featured : d.events.next} level={2} preload /></Reveal>
          : <Reveal as="p" className="lead" trigger="mount" delay={140}>{d.events.none}</Reveal>}
        {up.length > 0 && <Reveal className="ev-section"><h2 className="eyebrow ev-sec-title">{d.events.upcoming}</h2><EventGrid list={up} site={site} lang={lang} d={d} /></Reveal>}
        {pst.length > 0 && <Reveal className="ev-section" data-past-events><h2 className="eyebrow ev-sec-title">{d.events.past}</h2><PastEvents list={pst} lang={lang} d={d} /></Reveal>}
      </div>
    </Shell>
  );
}
