import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLang } from "@/content/types";
import { getDict } from "@/lib/i18n";
import { ldFor, ldHtml, metadataFor } from "@/lib/seo";
import { readSite } from "@/lib/store";
import { Shell } from "@/components/site/SubPage";
import { Reveal } from "@/components/Reveal";

type P = { params: Promise<{ lang: string }> };
/* ISR: első kéréskor renderelődik a tárból, utána gyorsítótárból megy; a build nem renderel előre (lásd a [lang]/layout.tsx megjegyzését). */
export const revalidate = 3600;
export function generateStaticParams() { return []; }
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang } = await params; if (!isLang(lang)) return {};
  /* Indexelhető (korábban noindex volt): az üzemeltető adatai a keresők és az AI-keresők bizalmi jelei. */
  return metadataFor(await readSite(), lang, "/impresszum");
}
/** Impresszum — csak kitöltött mezők jelennek meg; az adószám/nyilvántartási szám az adminból tölthető. */
export default async function ImprintPage({ params }: P) {
  const { lang } = await params; if (!isLang(lang)) notFound();
  const d = getDict(lang); const site = await readSite(); const i = site.legal.imprint;
  const rows: Array<[string, React.ReactNode]> = [
    [d.legal.operator, i.operator], [d.legal.person, i.person], [d.legal.address, i.address],
    [d.legal.email, <a key="e" href={`mailto:${i.email}`} className="link">{i.email}</a>], [d.legal.phone, <a key="p" href={`tel:${i.phone.replace(/\s/g, "")}`} className="link">{i.phone}</a>],
    [d.legal.taxId, i.taxId], [d.legal.regNo, i.regNo], [d.legal.hosting, i.hosting],
  ];
  const ld = ldFor(site, lang, "/impresszum");
  return (
    <Shell site={site} lang={lang} d={d} rest="/impresszum">
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={ldHtml(ld)} />}
      <div className="wrap-narrow legal">
        <Reveal as="p" className="eyebrow" trigger="mount">{d.footer.colInfo}</Reveal>
        <Reveal as="h1" className="h1 mask" trigger="mount" delay={80}>{d.legal.imprintTitle}</Reveal>
        <Reveal trigger="mount" delay={160}>
          <dl className="legal-dl">{rows.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="eyebrow">{k}</dt><dd>{v}</dd></div>)}</dl>
        </Reveal>
      </div>
    </Shell>
  );
}
