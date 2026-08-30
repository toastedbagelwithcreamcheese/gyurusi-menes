import { readSite, upcoming, past } from "@/lib/store";
import { resolveImage } from "@/lib/images";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ContactForm } from "@/components/site/ContactForm";
import { Gallery } from "@/components/site/Lightbox";
import { Reveal } from "@/components/Reveal";
import { Hero, QuickFacts, Intro, Programs, Trail, Breeds, Events, ContactBlock } from "@/components/site/Sections";

export default async function Home() {
  const site = await readSite();
  const up = upcoming(site.events);
  const pst = past(site.events);
  const gallery = site.gallery.filter((g) => g.published).sort((a, b) => a.order - b.order)
    .map((g) => { const im = resolveImage(g.image, site); return im ? { id: g.id, caption: g.caption, ...im } : null; })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const ld = {
    "@context": "https://schema.org", "@type": "LocalBusiness", name: "Gyűrűsi Ménes",
    description: "Hucul, gidrán és shagya arab ménes Gyűrűsön: lovasoktatás, lovastúrák, gyerektáborok, huculösvény versenyek.",
    telephone: site.contact.phone, email: site.contact.email,
    address: { "@type": "PostalAddress", streetAddress: "Petőfi Sándor u. 2.", postalCode: "8932", addressLocality: "Gyűrűs", addressRegion: "Zala", addressCountry: "HU" },
    sameAs: [site.contact.facebook, site.contact.instagram].filter(Boolean),
    image: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/opengraph-image`,
    event: up.map((e) => ({ "@type": "Event", name: e.title, startDate: e.date, endDate: e.endDate ?? e.date, location: { "@type": "Place", name: e.location ?? "Gyűrűsi Ménes", address: "8932 Gyűrűs, Petőfi Sándor u. 2." } })),
  };

  return (
    <>
      <Header phone={site.contact.phone} />
      <main>
        <Hero site={site} />
        <QuickFacts />
        <Programs site={site} />
        <Intro site={site} />
        <Trail />
        <Breeds />
        <Events site={site} upcomingList={up} pastList={pst} />
        <section id="galeria" className="section">
          <div className="wrap">
            <div className="sec-head">
              <Reveal as="p" className="eyebrow">Galéria</Reveal>
              <Reveal as="h2" className="h1" delay={60}>Egy augusztusi hétvége Gyűrűsön</Reveal>
            </div>
            <Reveal delay={100}><Gallery items={gallery} /></Reveal>
          </div>
        </section>
        <ContactBlock site={site} form={<ContactForm />} />
      </main>
      <Footer contact={site.contact} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </>
  );
}
