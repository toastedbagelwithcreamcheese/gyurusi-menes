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
  return (
    <SubPage site={site} eyebrow="Hír" title={n.title} meta={formatDate(n.date)} image={resolveImage(n.image, site)} back={{ href: "/#esemenyek", label: "Vissza a hírekhez" }}>
      <Paragraphs text={n.body} className="lead" />
    </SubPage>
  );
}
