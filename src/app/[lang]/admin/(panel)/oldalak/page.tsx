import Link from "next/link";
import { readSite, PAGE_KEYS, t } from "@/lib/store";
import { resolveImage } from "@/lib/images";
import { Thumb } from "../ImagePicker";

export default async function PagesAdmin() {
  const site = await readSite();
  return (
    <>
      <div className="adm-head"><div><h1>Aloldalak</h1><p>Az öt aloldal szövege, képei és saját kapcsolati blokkja — mindhárom nyelven.</p></div></div>
      <div className="list">{PAGE_KEYS.map((k) => { const p = site.pages[k]; const im = resolveImage(p.images[0], site); return (
        <div key={k} className="row">
          {im ? <Thumb src={im.src} /> : <div className="thumb empty">nincs kép</div>}
          <div><h3>{t(p.title, "hu")}</h3><div className="meta">/{k} · {p.images.length} kép · kapcsolat: {p.contact.person}, {p.contact.email}</div></div>
          <div className="ops"><Link href={`/admin/oldalak/${k}`} className="btn btn-outline btn-sm">Szerkeszt</Link><Link href={`/${k}`} className="btn btn-ghost btn-sm" target="_blank">Megnéz ↗</Link></div>
        </div>); })}</div>
    </>
  );
}
