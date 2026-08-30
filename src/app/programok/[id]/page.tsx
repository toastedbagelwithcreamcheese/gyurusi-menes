import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  const others = site.programs.filter((x) => x.published && x.id !== p.id).sort((a, b) => a.order - b.order).slice(0, 3)
    .map((x) => ({ href: `/programok/${x.id}`, title: x.title, meta: x.audience, image: x.image }));
  return (
    <SubPage site={site} eyebrow="Program" title={p.title} meta={p.audience} image={resolveImage(p.image, site)}
      facts={[{ k: "Kinek", v: p.audience ?? "Mindenkinek" }, { k: "Hol", v: "Gyűrűsi Ménes, Gyűrűs (Zala)" }, { k: "Jelentkezés", v: "Telefonon vagy e-mailben, előzetes egyeztetéssel" }]}
      related={others} relatedTitle="Más programjaink" cta={{ label: "Időpontot kérek", href: "/#kapcsolat" }} back={{ href: "/#programok", label: "Programok" }}>
      <p className="lead">{p.summary}</p>
      {p.body && <Paragraphs text={p.body} />}
    </SubPage>
  );
}
