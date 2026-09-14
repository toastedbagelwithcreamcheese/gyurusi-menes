import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { HeroIntro } from "./HeroIntro";
import { HeroParallax } from "./HeroParallax";
import { MapEmbed } from "./MapEmbed";
import { Photo } from "@/components/Photo";
import { resolveImage, type ImageMeta } from "@/lib/images";
import type { Dictionary, Lang } from "@/content/types";
import { langPath } from "@/lib/paths";
import { formatRange, formatDate, featuredEvent, upcoming, past, t, PAGE_KEYS, type Event, type SiteContent } from "@/lib/store";

export const Arrow = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const tel = (p: string) => `tel:${p.replace(/\s/g, "")}`;

export function Paragraphs({ text, className = "" }: { text: string; className?: string }) {
  return <>{text.split(/\n\s*\n/).map((p, i) => <p key={i} className={className}>{p}</p>)}</>;
}

export function Img({ im, sizes, className = "", priority }: { im: ImageMeta | null; sizes: string; className?: string; priority?: boolean }) {
  if (!im) return null;
  return <Image src={im.src} alt={im.alt} width={im.width} height={im.height} sizes={sizes} quality={62} placeholder={im.blur ? "blur" : "empty"} blurDataURL={im.blur} style={{ backgroundColor: im.color }} className={className} priority={priority} />;
}

type P = { site: SiteContent; lang: Lang; d: Dictionary };

/* ---------------- HERO (a kép az adminból cserélhető) ---------------- */
export function Hero({ site, lang, d }: P) {
  const im = resolveImage(site.hero.image, site);
  const lines = splitTitle(t(site.hero.title, lang));
  return (
    <section id="top" className="hero on-dark" aria-label={t(site.hero.title, lang)}>
      <HeroParallax>
        <div className="hero-media" data-layer="media">
          {im && <Image src={im.src} alt={im.alt} fill sizes="100vw" priority fetchPriority="high" quality={62} placeholder={im.blur ? "blur" : "empty"} blurDataURL={im.blur} style={{ objectFit: "cover", objectPosition: "50% 45%", backgroundColor: im.color }} />}
          <div className="hero-shade" aria-hidden="true" />
        </div>
        <div className="wrap hero-in" data-layer="text">
          <HeroIntro>
            <p className="caption hero-note" data-seq="first">{d.hero.note}</p>
            <h1 className="display">{lines.map((l, i) => <span key={i} className="hero-line" data-sweep="#f3efe6">{l}{i < lines.length - 1 ? " " : ""}</span>)}</h1>
            <p className="lead hero-sub" data-seq>{t(site.hero.subtitle, lang)}</p>
            <div className="hero-cta" id="hero-cta" data-seq>
              <Link href={langPath(lang, "/esemenyek")} className="btn btn-light">{d.hero.ctaPrimary} <Arrow /></Link>
              <Link href="#kapcsolat" className="btn btn-outline">{d.hero.ctaSecondary}</Link>
            </div>
          </HeroIntro>
        </div>
      </HeroParallax>
      <p className="hero-scroll" aria-hidden="true">{d.hero.scroll}</p>
    </section>
  );
}
function splitTitle(tt: string): string[] {
  const words = tt.split(" ");
  if (words.length < 4) return [tt];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

/* ---------------- A TULAJDONOS — elöl ---------------- */
export function Owner({ site, lang, d }: P) {
  const o = site.owner;
  const im = resolveImage(o.image, site);
  return (
    <section id="tulajdonos" className="section owner" data-owner>
      <div className="wrap owner-grid">
        <Reveal variant="unveil" as="figure" className="photo owner-ph"><Img im={im} sizes="(max-width: 800px) 100vw, 50vw" /></Reveal>
        <div className="owner-text">
          <Reveal as="p" className="eyebrow">{d.owner.eyebrow}</Reveal>
          <Reveal as="h2" className="h1 mask" delay={60}>{o.name}</Reveal>
          <Reveal as="p" className="owner-role" delay={100}>{t(o.role, lang)}</Reveal>
          <Reveal as="p" className="owner-note" delay={140}>{t(o.note, lang)}</Reveal>
          <Reveal className="owner-actions" delay={200}>
            {o.phone && <a href={tel(o.phone)} className="owner-big">{o.phone}</a>}
            {o.email && <a href={`mailto:${o.email}`} className="btn btn-outline">{d.owner.write} <Arrow /></a>}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------- BEMUTATKOZÁS + fajták ---------------- */
export function Intro({ site, lang, d }: P) {
  return (
    <section id="menes" className="section intro">
      <div className="wrap intro-grid">
        <div className="intro-text">
          <Reveal as="p" className="eyebrow">{t(site.intro.eyebrow, lang)}</Reveal>
          <Reveal as="h2" className="h1 mask" delay={60}>{t(site.intro.title, lang)}</Reveal>
          <Reveal as="p" className="lead" delay={120}>{t(site.intro.lead, lang)}</Reveal>
          <Reveal delay={180} className="intro-body"><Paragraphs text={t(site.intro.body, lang)} /></Reveal>
          <Reveal delay={220} className="breed-strip">
            {d.intro.breeds.map((b) => <div key={b.name}><p className="caption">{b.origin}</p><h3 className="h3">{b.name}</h3><p>{b.text}</p></div>)}
          </Reveal>
        </div>
        <div className="intro-photos">
          <Reveal variant="unveil" as="figure" className="photo ph-a"><Photo id="csiko-portre" sizes="(max-width: 900px) 60vw, 360px" /></Reveal>
          <Reveal variant="unveil" as="figure" className="photo ph-b" delay={150}><Photo id="lo-es-no-bokeh" sizes="(max-width: 900px) 90vw, 520px" /></Reveal>
          <p className="caption ph-cap">{d.intro.photoCaption}</p>
        </div>
      </div>
    </section>
  );
}

/* ---------------- ESEMÉNYEK a főoldalon: kiemelt nagyban + a következők ---------------- */
export function EventCard({ e, site, lang, d, tag }: { e: Event; site: SiteContent; lang: Lang; d: Dictionary; tag: string }) {
  const im = resolveImage(e.image, site);
  return (
    <Link href={langPath(lang, `/esemenyek/${e.id}`)} className="ev-feat" data-featured-event>
      <figure className="photo ev-feat-ph"><Img im={im} sizes="(max-width: 800px) 100vw, 55vw" /></figure>
      <div className="ev-feat-body">
        <span className="ev-feat-tag">{tag}</span>
        <p className="caption">{formatRange(e, lang)}{e.location ? ` · ${e.location}` : ""}</p>
        <h3 className="h2">{t(e.title, lang)}</h3>
        <p className="lead">{t(e.summary, lang)}</p>
        <span className="btn btn-primary">{e.registration ? d.events.register : d.events.details} <Arrow /></span>
      </div>
    </Link>
  );
}

export function EventList({ list, lang, d, pastList = false }: { list: Event[]; lang: Lang; d: Dictionary; pastList?: boolean }) {
  return (
    <ul className={`evc ${pastList ? "past" : ""}`} role="list">
      {list.map((e) => (
        <li key={e.id}>
          <Link href={langPath(lang, `/esemenyek/${e.id}`)}>
            <span className="evc-date"><b>{e.date.slice(8).replace(/^0/, "")}</b><span>{formatDate(e.date, lang, { month: "short", year: pastList ? "numeric" : undefined })}</span></span>
            <span>
              <h3 className="evc-title">{t(e.title, lang)}{e.registration && !pastList && <span className="evc-reg">{d.events.register}</span>}</h3>
              <p className="evc-sum">{t(e.summary, lang)}</p>
              {e.location && <p className="evc-meta">{e.location}</p>}
            </span>
            <Arrow />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function EventGrid({ list, site, lang, d }: { list: Event[]; site: SiteContent; lang: Lang; d: Dictionary }) {
  return (
    <ul className="ev-grid" role="list">
      {list.map((e) => { const im = resolveImage(e.image, site); return (
        <li key={e.id}>
          <Link href={langPath(lang, `/esemenyek/${e.id}`)} className="ev-card">
            <figure className="photo ev-card-ph">{im && <Image src={im.src} alt={im.alt} fill sizes="(max-width: 640px) 100vw, 33vw" quality={62} placeholder={im.blur ? "blur" : "empty"} blurDataURL={im.blur} style={{ objectFit: "cover", backgroundColor: im.color }} />}
              <span className="ev-card-date"><b>{e.date.slice(8).replace(/^0/, "")}</b><span>{formatDate(e.date, lang, { month: "short" })}</span></span>
            </figure>
            <span className="ev-card-body">
              <span className="caption">{formatRange(e, lang)}{e.location ? ` · ${e.location}` : ""}</span>
              <h3 className="h3">{t(e.title, lang)}</h3>
              <p>{t(e.summary, lang)}</p>
              <span className="tile-more">{e.registration ? d.events.register : d.events.details} <Arrow /></span>
            </span>
          </Link>
        </li>); })}
    </ul>
  );
}

export function EventsHome({ site, lang, d }: P) {
  const feat = featuredEvent(site.events);
  const up = upcoming(site.events).filter((e) => e.id !== feat?.id).slice(0, 3);
  const last = past(site.events)[0];
  return (
    <section id="esemenyek" className="section on-bone-2">
      <div className="wrap">
        <div className="sec-head">
          <Reveal as="p" className="eyebrow">{d.events.eyebrow}</Reveal>
          <Reveal as="h2" className="h1 mask" delay={60}>{feat ? (feat.featured ? d.events.featured : d.events.next) : d.events.title}</Reveal>
        </div>
        {feat ? <Reveal><EventCard e={feat} site={site} lang={lang} d={d} tag={feat.featured ? d.events.featured : d.events.next} /></Reveal>
          : <>
            <Reveal as="p" className="lead ev-next-note">{d.events.none}</Reveal>
            {last && <Reveal delay={80}><EventCard e={last} site={site} lang={lang} d={d} tag={d.events.pastEvent} /></Reveal>}
          </>}
        {up.length > 0 && <Reveal delay={100} className="ev-section"><p className="eyebrow" style={{ marginBottom: 14 }}>{d.events.upcoming}</p><EventGrid list={up} site={site} lang={lang} d={d} /></Reveal>}
        <Reveal delay={120} className="ev-section"><Link href={langPath(lang, "/esemenyek")} className="btn btn-outline">{d.events.all} <Arrow /></Link></Reveal>
      </div>
    </section>
  );
}

/* ---------------- CSEMPÉK: az öt aloldal, egyforma kártyákban ---------------- */
export function Tiles({ site, lang, d }: P) {
  return (
    <section id="aloldalak" className="section">
      <div className="wrap">
        <div className="sec-head">
          <Reveal as="p" className="eyebrow">{d.tiles.eyebrow}</Reveal>
          <Reveal as="h2" className="h1 mask" delay={60}>{d.tiles.title}</Reveal>
        </div>
        <div className="tiles" data-tiles>
          {PAGE_KEYS.map((k, i) => {
            const p = site.pages[k]; const im = resolveImage(p.images[0], site);
            return (
              <Reveal as="div" key={k} delay={(i % 5) * 70} className="tile-wrap">
                <Link href={langPath(lang, `/${k}`)} className="tile-card">
                  <figure className="photo tile-ph">{im && <Image src={im.src} alt={im.alt} fill sizes="(max-width: 560px) 100vw, (max-width: 1100px) 33vw, 20vw" quality={62} placeholder={im.blur ? "blur" : "empty"} blurDataURL={im.blur} style={{ objectFit: "cover", backgroundColor: im.color }} />}</figure>
                  <div className="tile-body"><span className="tile-idx" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span><h3 className="h3">{t(p.title, lang)}</h3><p>{t(p.lead, lang)}</p><span className="tile-more">{d.tiles.more} <Arrow /></span></div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* A Google-értékelések a src/components/site/Reviews.tsx-ben: kliens-komponens, élő betöltéssel (a Google szabályai szerint). */

/* ---------------- KAPCSOLAT: a tulajdonos kártyája ELÖL, aztán a kapcsolattartó, jobbra az űrlap ---------------- */
export function ContactBlock({ site, lang, d, form }: P & { form: React.ReactNode }) {
  const c = site.contact, o = site.owner;
  return (
    <section id="kapcsolat" className="section contact">
      <div className="wrap contact-grid">
        <div>
          <Reveal as="p" className="eyebrow">{d.contact.eyebrow}</Reveal>
          <Reveal as="h2" className="h1 mask" delay={60}>{d.contact.title}</Reveal>
          <Reveal as="p" className="lead" delay={120}>{t(c.note, lang)}</Reveal>
          <Reveal delay={180} className="contact-cards">
            <div className="contact-card owner-card" data-owner>
              <p className="eyebrow">{d.contact.ownerFirst}</p>
              <p className="cc-name">{o.name}</p>
              <p className="cc-role">{t(o.role, lang)}</p>
              <p className="cc-note">{t(o.note, lang)}</p>
              {o.phone && <span className="cc-line"><span className="eyebrow">{d.contact.phone}</span> <a href={tel(o.phone)}>{o.phone}</a></span>}
              {o.email && <span className="cc-line"><span className="eyebrow">{d.contact.email}</span> <a href={`mailto:${o.email}`}>{o.email}</a></span>}
            </div>
            <div className="contact-card">
              <p className="eyebrow">{d.contact.generalTitle}</p>
              <p className="cc-name">{c.person}</p>
              <p className="cc-role">{d.contact.contactPerson}</p>
              <span className="cc-line"><span className="eyebrow">{d.contact.phone}</span> <a href={tel(c.phone)}>{c.phone}</a></span>
              <span className="cc-line"><span className="eyebrow">{d.contact.email}</span> <a href={`mailto:${c.email}`}>{c.email}</a></span>
              <span className="cc-line"><span className="eyebrow">{d.contact.addressLabel}</span> {c.address}{c.mapUrl && <> · <a href={c.mapUrl} className="link" target="_blank" rel="noopener">{d.contact.map}</a></>}</span>
            </div>
          </Reveal>
        </div>
        <Reveal delay={120} className="contact-form">{form}</Reveal>
      </div>
      <Reveal delay={80} className="wrap contact-map">
        <MapEmbed query={`Gyűrűsi Ménes, ${c.address}`} address={c.address} mapUrl={c.mapUrl} lang={lang} labels={d.contact.mapBox} />
      </Reveal>
    </section>
  );
}
