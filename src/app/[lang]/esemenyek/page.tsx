import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLang } from "@/content/types";
import { getDict } from "@/lib/i18n";
import { alternatesFor, langPath } from "@/lib/paths";
import { readSite, upcoming, past, featuredEvent } from "@/lib/store";
import { Shell } from "@/components/site/SubPage";
import { EventCard, EventList, EventGrid } from "@/components/site/Sections";
import { Reveal } from "@/components/Reveal";

type P = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang } = await params; if (!isLang(lang)) return {};
  const d = getDict(lang);
  return { title: d.events.title, description: d.events.eyebrow, alternates: { canonical: langPath(lang, "/esemenyek"), languages: alternatesFor("/esemenyek") } };
}

/** Eseménynaptár: kiemelt nagyban, közelgők listában, korábbiak halványabban. */
export default async function EventsPage({ params }: P) {
  const { lang } = await params; if (!isLang(lang)) notFound();
  const d = getDict(lang); const site = await readSite();
  const feat = featuredEvent(site.events);
  const up = upcoming(site.events).filter((e) => e.id !== feat?.id);
  const pst = past(site.events);
  return (
    <Shell site={site} lang={lang} d={d} rest="/esemenyek">
      <div className="wrap sub-head">
        <Reveal as="p" className="eyebrow" trigger="mount">{d.events.eyebrow}</Reveal>
        <Reveal as="h1" className="h1 mask" trigger="mount" delay={80}>{d.events.title}</Reveal>
      </div>
      <div className="wrap">
        {feat ? <Reveal trigger="mount" delay={140}><EventCard e={feat} site={site} lang={lang} d={d} tag={feat.featured ? d.events.featured : d.events.next} /></Reveal>
          : <Reveal as="p" className="lead" trigger="mount" delay={140}>{d.events.none}</Reveal>}
        {up.length > 0 && <Reveal className="ev-section"><p className="eyebrow" style={{ marginBottom: 12 }}>{d.events.upcoming}</p><EventGrid list={up} site={site} lang={lang} d={d} /></Reveal>}
        {pst.length > 0 && <Reveal className="ev-section"><p className="eyebrow" style={{ marginBottom: 12 }}>{d.events.past}</p><EventList list={pst} lang={lang} d={d} pastList /></Reveal>}
      </div>
    </Shell>
  );
}
