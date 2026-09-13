import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLang } from "@/content/types";
import { getDict } from "@/lib/i18n";
import { alternatesFor, langPath } from "@/lib/paths";
import { readSite, t } from "@/lib/store";
import { Shell } from "@/components/site/SubPage";
import { Paragraphs } from "@/components/site/Sections";
import { Reveal } from "@/components/Reveal";

type P = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang } = await params; if (!isLang(lang)) return {};
  return { title: getDict(lang).legal.privacyTitle, robots: { index: false }, alternates: { canonical: langPath(lang, "/adatkezeles"), languages: alternatesFor("/adatkezeles") } };
}
export default async function PrivacyPage({ params }: P) {
  const { lang } = await params; if (!isLang(lang)) notFound();
  const d = getDict(lang); const site = await readSite();
  return (
    <Shell site={site} lang={lang} d={d} rest="/adatkezeles">
      <div className="wrap-narrow legal">
        <Reveal as="p" className="eyebrow" trigger="mount">{d.footer.colInfo}</Reveal>
        <Reveal as="h1" className="h1 mask" trigger="mount" delay={80}>{d.legal.privacyTitle}</Reveal>
        <Reveal trigger="mount" delay={160} className="legal-body"><Paragraphs text={t(site.legal.privacy, lang)} /></Reveal>
      </div>
    </Shell>
  );
}
