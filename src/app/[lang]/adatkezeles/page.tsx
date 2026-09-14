import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLang } from "@/content/types";
import { getDict } from "@/lib/i18n";
import { ldFor, ldHtml, metadataFor } from "@/lib/seo";
import { readSite } from "@/lib/store";
import { renderPrivacy } from "@/lib/privacy";
import { Shell } from "@/components/site/SubPage";
import { Reveal } from "@/components/Reveal";

type P = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang } = await params; if (!isLang(lang)) return {};
  /* Indexelhető (korábban noindex volt): az adatkezelő és az elérhetőségek a keresők és az AI-keresők bizalmi jelei. */
  return metadataFor(await readSite(), lang, "/adatkezeles");
}

/** E-mail-címek és „www.” kezdetű címek linkként a folyó szövegben (a tájékoztató sablonja sima szöveg). */
const LINK_RE = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+|www\.[\w-]+(?:\.[\w-]+)+)/g;
function Linkify({ text }: { text: string }) {
  return <>{text.split(LINK_RE).map((part, i) => (i % 2 === 0 ? part
    : <a key={i} className="link" href={part.includes("@") ? `mailto:${part}` : `https://${part}`} {...(part.includes("@") ? {} : { target: "_blank", rel: "noopener" })}>{part}</a>))}</>;
}

/**
 * Adatkezelési tájékoztató: a szerkeszthető sablon (legal.privacy) kitöltve — adatkezelő az impresszum mezőiből,
 * megőrzési idők a karbantartás állandóiból (src/lib/privacy.ts) —, alcímekkel és felsorolásokkal.
 */
export default async function PrivacyPage({ params }: P) {
  const { lang } = await params; if (!isLang(lang)) notFound();
  const d = getDict(lang); const site = await readSite();
  const blocks = renderPrivacy(site, lang);
  const ld = ldFor(site, lang, "/adatkezeles");
  return (
    <Shell site={site} lang={lang} d={d} rest="/adatkezeles">
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={ldHtml(ld)} />}
      <div className="wrap-narrow legal">
        <Reveal as="p" className="eyebrow" trigger="mount">{d.footer.colInfo}</Reveal>
        <Reveal as="h1" className="h1 mask" trigger="mount" delay={80}>{d.legal.privacyTitle}</Reveal>
        <Reveal trigger="mount" delay={160} className="legal-body" data-privacy>
          {blocks.map((b, i) => b.kind === "h2" ? <h2 key={i} className="legal-h">{b.text}</h2>
            : b.kind === "ul" ? <ul key={i} className="legal-list">{b.items.map((it, k) => <li key={k}><Linkify text={it} /></li>)}</ul>
            : <p key={i}><Linkify text={b.text} /></p>)}
        </Reveal>
      </div>
    </Shell>
  );
}
