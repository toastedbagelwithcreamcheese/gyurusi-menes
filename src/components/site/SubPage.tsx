import Link from "next/link";
import Image from "next/image";
import { Header } from "./Header";
import { Footer } from "./Footer";
import type { ImageMeta } from "@/lib/images";
import type { SiteContent } from "@/lib/store";

/** Közös keret az aloldalaknak: fejléc, cím-blokk, egy nagy kép, szöveg, vissza-link. */
export function SubPage({ site, eyebrow, title, meta, image, children, back = { href: "/", label: "Vissza a főoldalra" } }: {
  site: SiteContent; eyebrow: string; title: string; meta?: string; image: ImageMeta | null; children: React.ReactNode; back?: { href: string; label: string };
}) {
  return (
    <>
      <Header phone={site.contact.phone} />
      <main className="sub">
        <div className="wrap sub-head">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="h1">{title}</h1>
          {meta && <p className="caption">{meta}</p>}
        </div>
        {image && (
          <div className="wrap"><figure className="photo sub-ph"><Image src={image.src} alt={image.alt} width={image.width} height={image.height} sizes="(max-width: 1280px) 100vw, 1280px" priority placeholder={image.blur ? "blur" : "empty"} blurDataURL={image.blur} style={{ backgroundColor: image.color }} /></figure></div>
        )}
        <div className="wrap-narrow sub-body">
          {children}
          <p style={{ marginTop: 40 }}><Link href={back.href} className="link">← {back.label}</Link></p>
        </div>
      </main>
      <Footer contact={site.contact} />
    </>
  );
}
