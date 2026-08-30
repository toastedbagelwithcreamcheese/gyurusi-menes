import Link from "next/link";
import Image from "next/image";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ContactDock } from "./ContactDock";
import { Reveal } from "@/components/Reveal";
import { resolveImage, type ImageMeta } from "@/lib/images";
import type { SiteContent } from "@/lib/store";

const Arrow = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>;

export type Fact = { k: string; v: React.ReactNode };
export type Related = { href: string; title: string; meta?: string; image?: string };

/**
 * Aloldal-keret: teljes szélességű, parallaxos képfej a cím alatt; utána kétoszlopos
 * törzs — balra a szöveg, jobbra ragadós tényoszlop (kinek, mikor, hol) és a kapcsolat
 * CTA; végül „kapcsolódó" kártyák és egy záró hívás. Ugyanaz a ritmus minden aloldalon.
 */
export function SubPage({ site, eyebrow, title, meta, image, facts = [], related = [], relatedTitle = "Kapcsolódó", cta, children, back }: {
  site: SiteContent; eyebrow: string; title: string; meta?: string; image: ImageMeta | null; facts?: Fact[];
  related?: Related[]; relatedTitle?: string; cta?: { label: string; href: string }; children: React.ReactNode; back: { href: string; label: string };
}) {
  const c = site.contact;
  return (
    <>
      <Header phone={c.phone} subpage />
      <main className="sub">
        <div className="wrap sub-head">
          <Reveal as="p" className="eyebrow" trigger="mount"><Link href={back.href} className="sub-back">← {back.label}</Link><span aria-hidden="true"> · </span>{eyebrow}</Reveal>
          <Reveal as="h1" className="h1 mask" trigger="mount" delay={80}>{title}</Reveal>
          {meta && <Reveal as="p" className="caption" trigger="mount" delay={160}>{meta}</Reveal>}
        </div>
        {image && (
          <Reveal variant="unveil" as="figure" className="sub-ph parallax" trigger="mount" delay={120}>
            <Image src={image.src} alt={image.alt} width={image.width} height={image.height} sizes="100vw" priority quality={62} placeholder={image.blur ? "blur" : "empty"} blurDataURL={image.blur} style={{ backgroundColor: image.color }} />
          </Reveal>
        )}
        <div className="wrap sub-grid">
          <div className="sub-body">{children}</div>
          <aside className="sub-aside">
            {facts.length > 0 && (
              <Reveal className="sub-facts">
                {facts.map((f) => <div key={f.k} className="sub-fact"><span className="eyebrow">{f.k}</span><span>{f.v}</span></div>)}
              </Reveal>
            )}
            <Reveal className="sub-contact" delay={80}>
              <p className="h3">Kérdésed van?</p>
              <p className="note">Hívj, vagy írj — előzetes egyeztetéssel adunk időpontot.</p>
              <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="sub-contact-big">{c.phone}</a>
              <Link href={cta?.href ?? "/#kapcsolat"} className="btn btn-primary">{cta?.label ?? "Üzenetet írok"} <Arrow /></Link>
            </Reveal>
          </aside>
        </div>
        {related.length > 0 && (
          <section className="wrap sub-related">
            <Reveal as="p" className="eyebrow">{relatedTitle}</Reveal>
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
      </main>
      <Footer contact={c} />
      <ContactDock phone={c.phone} />
    </>
  );
}
