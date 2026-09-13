import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLang } from "@/content/types";
import { getDict } from "@/lib/i18n";
import { alternatesFor, langPath } from "@/lib/paths";
import { readSite, upcoming, t } from "@/lib/store";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ContactForm } from "@/components/site/ContactForm";
import { ContactDock } from "@/components/site/ContactDock";
import { Sheen } from "@/components/site/Sheen";
import { Hero, Owner, Intro, EventsHome, Tiles, ContactBlock, Reviews } from "@/components/site/Sections";
import { getGoogleReviews } from "@/lib/google-reviews";

/** A Google-értékelések naponta frissülnek: az oldal legfeljebb egy napig marad a gyorsítótárban. */
export const revalidate = 86400;

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return { alternates: { canonical: langPath(lang), languages: alternatesFor("/") } };
}

export default async function Home({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const d = getDict(lang);
  const site = await readSite();
  const reviews = await getGoogleReviews(lang);
  const up = upcoming(site.events);
  const ld = {
    "@context": "https://schema.org", "@type": "LocalBusiness", name: "Gyűrűsi Ménes", description: d.meta.description,
    founder: { "@type": "Person", name: site.owner.name }, telephone: site.owner.phone || site.contact.phone, email: site.contact.email,
    address: { "@type": "PostalAddress", streetAddress: "Petőfi Sándor u. 2.", postalCode: "8932", addressLocality: "Gyűrűs", addressRegion: "Zala", addressCountry: "HU" },
    sameAs: [site.contact.facebook, site.contact.instagram, reviews?.url].filter(Boolean),
    ...(reviews?.rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: reviews.rating, reviewCount: reviews.count, bestRating: 5 } } : {}),
    image: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/opengraph-image`,
    event: up.map((e) => ({ "@type": "Event", name: t(e.title, lang), startDate: e.date, endDate: e.endDate ?? e.date, location: { "@type": "Place", name: e.location ?? "Gyűrűsi Ménes", address: "8932 Gyűrűs, Petőfi Sándor u. 2." } })),
  };
  return (
    <>
      <Header lang={lang} d={d} phone={site.owner.phone || site.contact.phone} rest="/" />
      <main>
        <Hero site={site} lang={lang} d={d} />
        <Owner site={site} lang={lang} d={d} />
        <Intro site={site} lang={lang} d={d} />
        <EventsHome site={site} lang={lang} d={d} />
        <Tiles site={site} lang={lang} d={d} />
        <Reviews data={reviews} lang={lang} d={d} />
        <ContactBlock site={site} lang={lang} d={d} form={<ContactForm d={d.form} lang={lang} />} />
      </main>
      <Footer site={site} lang={lang} d={d} />
      <ContactDock phone={site.owner.phone || site.contact.phone} labels={{ message: d.contact.sub.write, call: d.contact.sub.call }} />
      <Sheen />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </>
  );
}
