import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLang } from "@/content/types";
import { getDict } from "@/lib/i18n";
import { ldFor, ldHtml, metadataFor } from "@/lib/seo";
import { readSite } from "@/lib/store";
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
  return metadataFor(await readSite(), lang, "/");
}

export default async function Home({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const d = getDict(lang);
  const site = await readSite();
  const reviews = await getGoogleReviews(lang);
  /* Strukturált adat: seo.ts (ménes + tulajdonos + webhely). Értékelést (aggregateRating) szándékosan nem jelölünk:
     a Google saját oldalon a saját vállalkozásról szóló értékelést nem engedi csillagként megjelölni. */
  const ld = ldFor(site, lang, "/");
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
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={ldHtml(ld)} />}
    </>
  );
}
