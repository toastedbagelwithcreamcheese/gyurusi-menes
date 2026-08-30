import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { Photo } from "@/components/Photo";
import { resolveImage, type ImageMeta } from "@/lib/images";
import { formatDate, type Event, type News, type Program, type SiteContent } from "@/lib/store";

const Arrow = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>;

export function Paragraphs({ text, className = "" }: { text: string; className?: string }) {
  return <>{text.split(/\n\s*\n/).map((p, i) => <p key={i} className={className}>{p}</p>)}</>;
}

function Img({ im, sizes, className = "", priority }: { im: ImageMeta | null; sizes: string; className?: string; priority?: boolean }) {
  if (!im) return null;
  return <Image src={im.src} alt={im.alt} width={im.width} height={im.height} sizes={sizes} placeholder={im.blur ? "blur" : "empty"} blurDataURL={im.blur} style={{ backgroundColor: im.color }} className={className} priority={priority} />;
}

/* ---------------- HERO ---------------- */
export function Hero({ site }: { site: SiteContent }) {
  const im = resolveImage(site.hero.image, site);
  return (
    <section className="hero on-dark" aria-label="Bevezető">
      <div className="hero-media">
        {im && <Image src={im.src} alt={im.alt} fill sizes="100vw" priority fetchPriority="high" placeholder={im.blur ? "blur" : "empty"} blurDataURL={im.blur} style={{ objectFit: "cover", objectPosition: "50% 45%", backgroundColor: im.color }} />}
        <div className="hero-shade" aria-hidden="true" />
      </div>
      <div className="wrap hero-in">
        <Reveal trigger="mount" as="p" className="caption hero-note">Gyűrűs, Zala · a IX. Gyűrűsi Lovas Napok</Reveal>
        <Reveal trigger="mount" as="h1" className="display" delay={80}>{site.hero.title}</Reveal>
        <Reveal trigger="mount" as="p" className="lead hero-sub" delay={180}>{site.hero.subtitle}</Reveal>
        <Reveal trigger="mount" className="hero-cta" delay={280}>
          <Link href="#programok" className="btn btn-light">Mit lehet nálunk csinálni <Arrow /></Link>
          <Link href="#kapcsolat" className="btn btn-outline">Kapcsolat</Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- GYORS VÁLASZOK ---------------- */
export function QuickFacts() {
  const facts = [
    { k: "Hol", v: "Gyűrűs, Zala vármegye — zsákfalu Zalaegerszegtől északkeletre, a Zalai-dombság erdei között." },
    { k: "Milyen lovak", v: "Hucul, gidrán és shagya arab. A hucul a lovasiskola alapja, a gidrán a tenyésztés büszkesége." },
    { k: "Kinek", v: "Kezdő és haladó lovasoknak, gyerekeknek táborba, családoknak a lovas napokra, hucul-lovasoknak versenyre." },
  ];
  return (
    <section className="section-tight" aria-label="Röviden">
      <div className="wrap facts">
        {facts.map((f, i) => (
          <Reveal key={f.k} delay={i * 70} className="fact">
            <p className="eyebrow">{f.k}</p>
            <p>{f.v}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------------- BEMUTATKOZÁS ---------------- */
export function Intro({ site }: { site: SiteContent }) {
  return (
    <section id="menes" className="section intro">
      <div className="wrap intro-grid">
        <div className="intro-text">
          <Reveal as="p" className="eyebrow">{site.intro.eyebrow}</Reveal>
          <Reveal as="h2" className="h1" delay={60}>{site.intro.title}</Reveal>
          <Reveal as="p" className="lead" delay={120}>{site.intro.lead}</Reveal>
          <Reveal delay={180} className="intro-body"><Paragraphs text={site.intro.body} /></Reveal>
        </div>
        <div className="intro-photos">
          <Reveal variant="unveil" as="figure" className="photo ph-a"><Photo id="csiko-portre" sizes="(max-width: 900px) 60vw, 360px" /></Reveal>
          <Reveal variant="unveil" as="figure" className="photo ph-b" delay={150}><Photo id="lo-es-no-bokeh" sizes="(max-width: 900px) 90vw, 520px" /></Reveal>
          <p className="caption ph-cap">Csikó az istállóban · a ménes lovai</p>
        </div>
      </div>
    </section>
  );
}

/* ---------------- PROGRAMOK ---------------- */
export function Programs({ site }: { site: SiteContent }) {
  const items = site.programs.filter((p) => p.published).sort((a, b) => a.order - b.order);
  return (
    <section id="programok" className="section on-bone-2">
      <div className="wrap">
        <div className="sec-head">
          <Reveal as="p" className="eyebrow">Mit találsz nálunk</Reveal>
          <Reveal as="h2" className="h1" delay={60}>Lovaglás, túra, tábor — és az ösvény</Reveal>
        </div>
        <ul className="prog-grid" role="list">
          {items.map((p: Program, i) => {
            const im = resolveImage(p.image, site);
            return (
              <Reveal as="li" key={p.id} delay={(i % 3) * 80} className="prog">
                <Link href={`/programok/${p.id}`} className="prog-link">
                  <figure className="photo prog-ph"><Img im={im} sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 400px" /></figure>
                  <div className="prog-body">
                    <h3 className="h3">{p.title}</h3>
                    {p.audience && <p className="note">{p.audience}</p>}
                    <p className="prog-sum">{p.summary}</p>
                    <span className="prog-more">Részletek <Arrow /></span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- HUCULÖSVÉNY ---------------- */
export function Trail() {
  return (
    <section id="huculosveny" className="trail on-dark">
      <div className="trail-media">
        <Reveal variant="unveil" as="figure" className="trail-ph"><Photo id="osveny-ugras-gyuru" sizes="(max-width: 900px) 100vw, 55vw" /></Reveal>
      </div>
      <div className="trail-text">
        <Reveal as="p" className="eyebrow">Huculösvény</Reveal>
        <Reveal as="h2" className="h1" delay={60}>Nem pálya. Ösvény.</Reveal>
        <Reveal as="p" className="lead" delay={120}>A huculösvény terepen vezetett teljesítménypróba hucul lovaknak: néhány száz métertől kilométerekig tartó út, tizenkettőtől huszonöt akadállyal — híd, vizesárok, palló, kapunyitás, meredek emelkedő és lejtő —, időnormával és pontozással.</Reveal>
        <Reveal delay={180}>
          <p>Azt méri, amiért a hucult évszázadokon át tenyésztették: a nyugodt idegrendszert, a biztos lábat és a lovas–ló páros összeszokottságát. Gyűrűsön 2017 óta rendezzük, kezdő, nyitott és sport kategóriában.</p>
          <blockquote className="quote">
            <p>„Sokkal inkább baráti környezetben folytatott kreatív ügyességi kihívásról vagy munkalovaglásról van szó, mint komoly sporttevékenységről, de pont ebben rejlik a varázsa.”</p>
            <cite>Varga-Kovács Emese, a lovas napok főrendezője</cite>
          </blockquote>
          <Link href="/programok/huculosveny" className="btn btn-outline">Hogyan zajlik <Arrow /></Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- LOVAK / FAJTÁK ---------------- */
export function Breeds() {
  const breeds = [
    { name: "Hucul", origin: "Kárpátok", photo: "hucul-fej-gyerek", text: "Alacsony, zömök hegyi ló, nyugodt idegrendszerrel és biztos lábbal. Nálunk 1999 óta — ő a lovasiskola és az ösvény lova." },
    { name: "Gidrán", origin: "Mezőhegyes", photo: "pej-lo-vezetve", text: "A sárga színéről ismert magyar félvér. A ménes tenyésztésének gerince, vérvonalak megőrzésével." },
    { name: "Shagya arab", origin: "Bábolna", photo: "feher-lo-szabadon", text: "A magyar arab tenyésztés fajtája: nemes, kitartó, sokoldalú." },
  ];
  return (
    <section id="lovak" className="section">
      <div className="wrap">
        <div className="sec-head">
          <Reveal as="p" className="eyebrow">Milyen lovakkal találkozol</Reveal>
          <Reveal as="h2" className="h1" delay={60}>Három fajta, egy ménes</Reveal>
        </div>
        <ul className="breeds" role="list">
          {breeds.map((b, i) => (
            <Reveal as="li" key={b.name} delay={i * 90} className="breed">
              <figure className="photo breed-ph"><Photo id={b.photo} sizes="(max-width: 640px) 100vw, 33vw" /></figure>
              <p className="caption">{b.origin}</p>
              <h3 className="h3">{b.name}</h3>
              <p>{b.text}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- ESEMÉNYEK ---------------- */
export function Events({ site, upcomingList, pastList }: { site: SiteContent; upcomingList: Event[]; pastList: Event[] }) {
  const news = site.news.filter((n) => n.published).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2);
  const nextEv = upcomingList[0];
  const lead = nextEv ?? pastList[0];
  const im = lead ? resolveImage(lead.image, site) : null;
  return (
    <section id="esemenyek" className="section on-bone-2">
      <div className="wrap">
        <div className="sec-head">
          <Reveal as="p" className="eyebrow">{nextEv ? "Következő esemény" : "Legutóbbi esemény"}</Reveal>
          <Reveal as="h2" className="h1" delay={60}>{nextEv ? "Ide várunk legközelebb" : "A Gyűrűsi Lovas Napok"}</Reveal>
        </div>
        {lead && (
          <Reveal className="ev-lead">
            <Link href={`/esemenyek/${lead.id}`} className="ev-lead-link">
              <figure className="photo ev-lead-ph"><Img im={im} sizes="(max-width: 900px) 100vw, 60vw" /></figure>
              <div className="ev-lead-body">
                <p className="caption">{formatDate(lead.date)}{lead.endDate ? ` – ${formatDate(lead.endDate, { day: "numeric" })}` : ""}{lead.location ? ` · ${lead.location}` : ""}</p>
                <h3 className="h2">{lead.title}</h3>
                <p className="lead">{lead.summary}</p>
                <span className="btn btn-primary">Részletek <Arrow /></span>
              </div>
            </Link>
          </Reveal>
        )}
        {!nextEv && (
          <Reveal as="p" className="note ev-next-note" delay={100}>A következő időpontot itt jelezzük, amint kitűztük. Addig kövess minket Facebookon, vagy írj nekünk.</Reveal>
        )}
        <div className="ev-rest">
          <div>
            <p className="eyebrow">Korábbi lovas napok</p>
            <ul className="ev-list" role="list">
              {pastList.filter((e) => e.id !== lead?.id).slice(0, 4).map((e: Event) => (
                <li key={e.id}><Link href={`/esemenyek/${e.id}`}><span className="tabular ev-date">{e.date.slice(0, 4)}</span><span>{e.title}</span><Arrow /></Link></li>
              ))}
            </ul>
          </div>
          {news.length > 0 && (
            <div>
              <p className="eyebrow">Hírek</p>
              <ul className="ev-list" role="list">
                {news.map((n: News) => (
                  <li key={n.id}><Link href={`/hirek/${n.id}`}><span className="tabular ev-date">{formatDate(n.date, { month: "short", day: "numeric" })}</span><span>{n.title}</span><Arrow /></Link></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- KAPCSOLAT ---------------- */
export function ContactBlock({ site, form }: { site: SiteContent; form: React.ReactNode }) {
  const c = site.contact;
  return (
    <section id="kapcsolat" className="section contact">
      <div className="wrap contact-grid">
        <div>
          <Reveal as="p" className="eyebrow">Kapcsolat</Reveal>
          <Reveal as="h2" className="h1" delay={60}>Gyere ki Gyűrűsre</Reveal>
          <Reveal as="p" className="lead" delay={120}>{c.note}</Reveal>
          <Reveal delay={180} className="contact-data">
            <p><span className="eyebrow">Telefon</span><a href={`tel:${c.phone.replace(/\s/g, "")}`} className="contact-big">{c.phone}</a></p>
            <p><span className="eyebrow">E-mail</span><a href={`mailto:${c.email}`} className="contact-big">{c.email}</a></p>
            <p><span className="eyebrow">Cím</span><span>{c.address}{c.mapUrl && <> · <a href={c.mapUrl} className="link" target="_blank" rel="noopener">térkép</a></>}</span></p>
            <p><span className="eyebrow">Kapcsolattartó</span><span>Varga-Kovács Emese</span></p>
          </Reveal>
        </div>
        <Reveal delay={120} className="contact-form">{form}</Reveal>
      </div>
    </section>
  );
}
