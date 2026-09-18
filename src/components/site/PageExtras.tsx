import { Reveal } from "@/components/Reveal";
import { EventGrid, Paragraphs } from "./Sections";
import type { Dictionary, Lang } from "@/content/types";
import type { Event, FaqItem, PageLink, SiteContent } from "@/lib/store";
import { t } from "@/lib/store";

const Chevron = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const External = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M8 4H4v12h12v-4M11 4h5v5M16 4l-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>;

/** Külső hivatkozás a szöveg alatt (pl. a Huculösvény saját oldala). Csak az adminban megadott http(s) címre mutat. */
export function PageLinkButton({ link, lang, d }: { link: PageLink; lang: Lang; d: Dictionary }) {
  const label = t(link.label, lang) || link.url.replace(/^https?:\/\//, "");
  return (
    <p className="page-link" data-page-link>
      <a href={link.url} target="_blank" rel="noopener" className="btn btn-primary">{label} <External /><span className="sr-only"> ({d.extras.external})</span></a>
    </p>
  );
}

/** Az aloldalhoz rendelt, közelgő események (az esemény-szerkesztőben jelölhető). Üresen nem jelenik meg. */
export function PageEvents({ list, site, lang, d }: { list: Event[]; site: SiteContent; lang: Lang; d: Dictionary }) {
  if (!list.length) return null;
  return (
    <section className="page-events" data-page-events>
      <Reveal as="p" className="eyebrow">{d.extras.eventsEyebrow}</Reveal>
      <Reveal as="h2" className="h1 mask" delay={60}>{d.extras.eventsTitle}</Reveal>
      <Reveal delay={100}><EventGrid list={list} site={site} lang={lang} d={d} /></Reveal>
    </section>
  );
}

/** Gyakori kérdések / tudnivalók: <details> — JS nélkül is nyitható, a válasz a HTML-ben van (keresőknek és AI-nak is). */
export function PageFaq({ items, lang, d }: { items: FaqItem[]; lang: Lang; d: Dictionary }) {
  if (!items.length) return null;
  return (
    <section className="faq" id="gyik" data-page-faq>
      <Reveal as="p" className="eyebrow">{d.extras.faqEyebrow}</Reveal>
      <Reveal as="h2" className="h1 mask" delay={60}>{d.extras.faqTitle}</Reveal>
      <Reveal delay={100} className="faq-list">
        {items.map((f, i) => (
          <details key={i} className="faq-item" data-faq-item>
            <summary><h3 className="faq-q">{t(f.q, lang)}</h3><Chevron /></summary>
            <div className="faq-a"><Paragraphs text={t(f.a, lang)} /></div>
          </details>
        ))}
      </Reveal>
    </section>
  );
}
