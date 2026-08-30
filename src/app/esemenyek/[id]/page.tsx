import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  const when = `${formatDate(e.date)}${e.endDate ? ` – ${formatDate(e.endDate, { day: "numeric" })}` : ""}`;
  const past = (e.endDate ?? e.date) < new Date().toISOString().slice(0, 10);
  const others = site.events.filter((x) => x.published && x.id !== e.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
    .map((x) => ({ href: `/esemenyek/${x.id}`, title: x.title, meta: formatDate(x.date, { year: "numeric", month: "long" }), image: x.image }));
  return (
    <SubPage site={site} eyebrow={past ? "Lezajlott esemény" : "Közelgő esemény"} title={e.title} meta={when} image={resolveImage(e.image, site)}
      facts={[{ k: "Mikor", v: <>{when}{e.time ? <><br />{e.time}</> : null}</> }, { k: "Hol", v: e.location ?? "Gyűrűsi Ménes, Gyűrűs" }, { k: "Cím", v: site.contact.address }]}
      related={others} relatedTitle="További lovas napok" cta={{ label: "Érdeklődöm", href: "/#kapcsolat" }} back={{ href: "/#esemenyek", label: "Események" }}>
      <p className="lead">{e.summary}</p>
      {e.body && <Paragraphs text={e.body} />}
    </SubPage>
  );
}
