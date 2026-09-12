import Link from "next/link";
import { notFound } from "next/navigation";
import { readSite, isPageKey, t } from "@/lib/store";
import { allImages } from "@/lib/images";
import { ImagePicker } from "../../ImagePicker";
import { LField } from "../../LField";
import { savePage } from "../../actions";

export default async function PageEdit({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!isPageKey(key)) notFound();
  const site = await readSite(); const p = site.pages[key]; const images = allImages(site);
  return (
    <>
      <div className="adm-head"><div><h1>{t(p.title, "hu")}</h1><p>/{key} — cím, bevezető, szöveg, legfeljebb három kép és az oldal saját kapcsolata.</p></div></div>
      <form action={savePage} className="form">
        <input type="hidden" name="key" value={key} />
        <div className="card form">
          <h2>Szöveg</h2>
          <LField name="title" label="Cím" value={p.title} required />
          <LField name="lead" label="Bevezető (a csempén is ez látszik)" value={p.lead} textarea rows={3} required />
          <LField name="body" label="Szöveg" value={p.body} textarea rows={10} hint="Üres sor = új bekezdés." />
        </div>
        <div className="card form">
          <h2>Képek</h2>
          <p className="hint" style={{ marginTop: -8 }}>Az első a nagy fejléckép (és a csempe képe a főoldalon); a másik kettő a szöveg alatti képsávba kerül. Elég pár kép — ne legyen sok.</p>
          <div className="field"><label>1. kép (fejléc)</label><ImagePicker name="image1" images={images} value={p.images[0]} allowEmpty={false} /></div>
          <div className="field"><label>2. kép</label><ImagePicker name="image2" images={images} value={p.images[1]} /></div>
          <div className="field"><label>3. kép</label><ImagePicker name="image3" images={images} value={p.images[2]} /></div>
        </div>
        <div className="card form">
          <h2>Az oldal saját kapcsolata</h2>
          <div className="form-row">
            <div className="field"><label htmlFor="contact.person">Név</label><input id="contact.person" name="contact.person" className="input" required defaultValue={p.contact.person} /></div>
            <div className="field"><label htmlFor="contact.phone">Telefon</label><input id="contact.phone" name="contact.phone" className="input" required defaultValue={p.contact.phone} /></div>
            <div className="field"><label htmlFor="contact.email">E-mail</label><input id="contact.email" name="contact.email" type="email" className="input" required defaultValue={p.contact.email} /></div>
          </div>
          <LField name="contact.note" label="Megjegyzés (a név fölött áll)" value={p.contact.note} textarea rows={2} />
        </div>
        <div className="actions"><button className="btn btn-primary">Mentés</button><Link href="/admin/oldalak" className="btn btn-ghost">Mégse</Link></div>
      </form>
    </>
  );
}
