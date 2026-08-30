import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { readSite } from "@/lib/store";
import { resolveImage } from "@/lib/images";
import { SubPage } from "@/components/site/SubPage";
import { Paragraphs } from "@/components/site/Sections";

type P = { params: Promise<{ id: string }> };
export async function generateStaticParams() { const s = await readSite(); return s.programs.filter((p) => p.published).map((p) => ({ id: p.id })); }
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { id } = await params; const s = await readSite(); const p = s.programs.find((x) => x.id === id && x.published);
  return p ? { title: p.title, description: p.summary } : {};
}
export default async function ProgramPage({ params }: P) {
  const { id } = await params; const site = await readSite(); const p = site.programs.find((x) => x.id === id && x.published);
  if (!p) notFound();
  return (
    <SubPage site={site} eyebrow="Program" title={p.title} meta={p.audience} image={resolveImage(p.image, site)} back={{ href: "/#programok", label: "Vissza a programokhoz" }}>
      <p className="lead">{p.summary}</p>
      {p.body && <Paragraphs text={p.body} />}
      <p style={{ marginTop: 32 }}><Link href="/#kapcsolat" className="btn btn-primary">Időpontot kérek</Link></p>
    </SubPage>
  );
}
