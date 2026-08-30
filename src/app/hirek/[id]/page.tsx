import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readSite, formatDate } from "@/lib/store";
import { resolveImage } from "@/lib/images";
import { SubPage } from "@/components/site/SubPage";
import { Paragraphs } from "@/components/site/Sections";

type P = { params: Promise<{ id: string }> };
export async function generateStaticParams() { const s = await readSite(); return s.news.filter((n) => n.published).map((n) => ({ id: n.id })); }
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { id } = await params; const s = await readSite(); const n = s.news.find((x) => x.id === id && x.published);
  return n ? { title: n.title, description: n.body.slice(0, 150) } : {};
}
export default async function NewsPage({ params }: P) {
  const { id } = await params; const site = await readSite(); const n = site.news.find((x) => x.id === id && x.published);
  if (!n) notFound();
  const others = site.news.filter((x) => x.published && x.id !== n.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
    .map((x) => ({ href: `/hirek/${x.id}`, title: x.title, meta: formatDate(x.date), image: x.image }));
  const events = site.events.filter((e) => e.published).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
    .map((x) => ({ href: `/esemenyek/${x.id}`, title: x.title, meta: formatDate(x.date, { year: "numeric", month: "long" }), image: x.image }));
  return (
    <SubPage site={site} eyebrow="Hír" title={n.title} meta={formatDate(n.date)} image={resolveImage(n.image, site)}
      facts={[{ k: "Dátum", v: formatDate(n.date) }, { k: "Helyszín", v: site.contact.address }]}
      related={others.length ? others : events} relatedTitle={others.length ? "További hírek" : "Lovas napok"} back={{ href: "/#esemenyek", label: "Hírek" }}>
      <Paragraphs text={n.body} className="lead" />
    </SubPage>
  );
}
