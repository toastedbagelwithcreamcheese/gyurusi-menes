import Link from "next/link";
import Image from "next/image";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ContactDock } from "./ContactDock";
import { ContactForm } from "./ContactForm";
import { ZoomProvider, ZoomButton } from "./Zoom";
import { Reveal } from "@/components/Reveal";
import { resolveImage, type ImageMeta } from "@/lib/images";
import type { Dictionary, Lang } from "@/content/types";
import type { PageContact, SiteContent } from "@/lib/store";
import { t } from "@/lib/store";

const Arrow = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const tel = (p: string) => `tel:${p.replace(/\s/g, "")}`;

export type Fact = { k: string; v: React.ReactNode };
export type Related = { href: string; title: string; meta?: string; image?: string };

/** Fejléc + lábléc + mobil dokk minden nem-főoldali laphoz. */
export function Shell({ site, lang, d, rest, phone, dockHref, children }: { site: SiteContent; lang: Lang; d: Dictionary; rest: string; phone?: string; dockHref?: string; children: React.ReactNode }) {
  return (
    <>
      <Header lang={lang} d={d} phone={site.owner.phone || site.contact.phone} rest={rest} subpage />
      <main className="sub">{children}</main>
      <Footer site={site} lang={lang} d={d} />
      <ContactDock phone={phone ?? site.contact.phone} labels={{ message: d.contact.sub.write, call: d.contact.sub.call }} href={dockHref ?? "#irj-nekunk"} />
    </>
  );
}

const Pic = ({ im, sizes, priority }: { im: ImageMeta; sizes: string; priority?: boolean }) => (
  <Image src={im.src} alt={im.alt} width={im.width} height={im.height} sizes={sizes} quality={62} placeholder={im.blur ? "blur" : "empty"} blurDataURL={im.blur} style={{ backgroundColor: im.color }} priority={priority} />
);

/**
 * Aloldal-keret: teljes szélességű képfej a címmel a képen (parallax); kétoszlopos törzs — balra a
 * szöveg és a nagyítható képsáv, jobbra ragadós tényoszlop + az oldal saját kapcsolattartója;
 * alatta a lapspecifikus „after” blokk (jelentkezés / beszámolók / túratérkép); majd az oldal SAJÁT
 * kapcsolati szekciója űrlappal; végül kapcsolódó kártyák. Minden kép kattintva nagyban nyílik.
 */
export function SubPage({ site, lang, d, rest, eyebrow, title, meta, image, strip = [], contact, facts = [], related = [], relatedTitle, back, after, children }: {
  site: SiteContent; lang: Lang; d: Dictionary; rest: string; eyebrow: string; title: string; meta?: string; image: ImageMeta | null; strip?: ImageMeta[];
  contact?: PageContact | null; facts?: Fact[]; related?: Related[]; relatedTitle?: string; back: { href: string; label: string }; after?: React.ReactNode; children: React.ReactNode;
}) {
  const c = contact ?? { person: site.contact.person, phone: site.contact.phone, email: site.contact.email, note: site.contact.note };
  const zoomItems = [image, ...strip].filter((x): x is ImageMeta => !!x);
  const pageKey = rest.replace(/^\//, "").split("/")[0] || "home";
  return (
    <Shell site={site} lang={lang} d={d} rest={rest} phone={c.phone}>
      <ZoomProvider items={zoomItems} labels={d.zoom}>
        <section className={`sub-hero on-dark ${image ? "" : "sub-hero-plain"}`}>
          {image && (
            <div className="sub-hero-media parallax">
              <Pic im={image} sizes="100vw" priority />
              <div className="sub-hero-shade" aria-hidden="true" />
              <ZoomButton index={0} label={d.zoom.open} className="sub-hero-zoom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></ZoomButton>
            </div>
          )}
          <div className="wrap sub-hero-in">
            <Reveal as="p" className="eyebrow" trigger="mount"><Link href={back.href} className="sub-back">← {back.label}</Link><span aria-hidden="true"> · </span>{eyebrow}</Reveal>
            <Reveal as="h1" className="display mask" trigger="mount" delay={80}>{title}</Reveal>
            {meta && <Reveal as="p" className="caption" trigger="mount" delay={160}>{meta}</Reveal>}
          </div>
        </section>

        <div className="wrap sub-grid">
          <div className="sub-body">
            {children}
            {strip.length > 0 && (
              <Reveal className="sub-strip" delay={60}>
                {strip.map((im, i) => <ZoomButton key={i} index={i + 1} label={d.zoom.open} className="photo"><Pic im={im} sizes="(max-width: 640px) 50vw, 25vw" /></ZoomButton>)}
              </Reveal>
            )}
          </div>
          <aside className="sub-aside">
            {facts.length > 0 && <Reveal className="sub-facts">{facts.map((f) => <div key={f.k} className="sub-fact"><span className="eyebrow">{f.k}</span><span>{f.v}</span></div>)}</Reveal>}
            <Reveal className="sub-contact" delay={80} data-page-contact>
              <p className="h3">{d.contact.sub.title}</p>
              <p className="note">{t(c.note, lang)}</p>
              <span className="sub-contact-person">{c.person}</span>
              <a href={tel(c.phone)} className="sub-contact-big">{c.phone}</a>
              <a href={`mailto:${c.email}`} className="sub-contact-mail link">{c.email}</a>
              <a href="#irj-nekunk" className="btn btn-primary">{d.contact.sub.write} <Arrow /></a>
            </Reveal>
          </aside>
        </div>

        {after && <div className="wrap">{after}</div>}

        <section id="irj-nekunk" className="wrap sub-form" data-page-form>
          <div className="sub-form-grid">
            <div>
              <Reveal as="p" className="eyebrow">{d.contact.eyebrow}</Reveal>
              <Reveal as="h2" className="h1 mask" delay={60}>{d.contact.sub.formTitle}</Reveal>
              <Reveal as="p" className="lead" delay={100}>{d.contact.sub.formLead}</Reveal>
              <Reveal delay={140} className="sub-form-person">
                <span className="eyebrow">{d.contact.contactPerson}</span>
                <span className="sub-contact-person">{c.person}</span>
                <a href={tel(c.phone)} className="link">{c.phone}</a>
                <a href={`mailto:${c.email}`} className="link">{c.email}</a>
              </Reveal>
            </div>
            <Reveal delay={120} className="sub-form-card"><ContactForm d={d.form} page={pageKey} pageLabel={`${title} (/${pageKey})`} /></Reveal>
          </div>
        </section>

        {related.length > 0 && (
          <section className="wrap sub-related">
            <Reveal as="p" className="eyebrow">{relatedTitle ?? d.tiles.eyebrow}</Reveal>
            <ul role="list">
              {related.map((r, i) => { const im = resolveImage(r.image, site); return (
                <Reveal as="li" key={r.href} delay={i * 70}>
                  <Link href={r.href} className="rel-card">
                    {im && <span className="rel-ph"><Image src={im.src} alt="" width={im.width} height={im.height} sizes="(max-width: 640px) 100vw, 33vw" quality={62} placeholder={im.blur ? "blur" : "empty"} blurDataURL={im.blur} style={{ backgroundColor: im.color }} /></span>}
                    <span className="rel-body">{r.meta && <span className="caption">{r.meta}</span>}<span className="h3">{r.title}</span></span>
                    <Arrow />
                  </Link>
                </Reveal>); })}
            </ul>
          </section>
        )}
      </ZoomProvider>
    </Shell>
  );
}
