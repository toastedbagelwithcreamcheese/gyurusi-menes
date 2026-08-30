import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { readSite, formatDate } from "@/lib/store";
import { resolveImage } from "@/lib/images";
import { SubPage } from "@/components/site/SubPage";
import { Paragraphs } from "@/components/site/Sections";

type P = { params: Promise<{ id: string }> };
export async function generateStaticParams() { const s = await readSite(); return s.events.filter((e) => e.published).map((e) => ({ id: e.id })); }
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { id } = await params; const s = await readSite(); const e = s.events.find((x) => x.id === id && x.published);
  if (!e) return {};
  const im = resolveImage(e.image, s);
  return { title: e.title, description: e.summary, openGraph: { title: e.title, description: e.summary, images: im ? [{ url: im.src, width: im.width, height: im.height, alt: im.alt }] : undefined } };
}
export default async function EventPage({ params }: P) {
  const { id } = await params; const site = await readSite(); const e = site.events.find((x) => x.id === id && x.published);
  if (!e) notFound();
  const when = `${formatDate(e.date)}${e.endDate ? ` – ${formatDate(e.endDate, { day: "numeric" })}` : ""}${e.time ? ` · ${e.time}` : ""}${e.location ? ` · ${e.location}` : ""}`;
  return (
    <SubPage site={site} eyebrow="Esemény" title={e.title} meta={when} image={resolveImage(e.image, site)} back={{ href: "/#esemenyek", label: "Vissza az eseményekhez" }}>
      <p className="lead">{e.summary}</p>
      {e.body && <Paragraphs text={e.body} />}
      <p style={{ marginTop: 32 }}><Link href="/#kapcsolat" className="btn btn-primary">Kérdésem van</Link></p>
    </SubPage>
  );
}
