import { readSite } from "@/lib/store";
import { allImages } from "@/lib/images";
import { ImagePicker } from "../ImagePicker";
import { saveContent } from "../actions";

export default async function ContentAdmin() {
  const site = await readSite();
  const { intro, hero, contact } = site;
  return (
    <>
      <div className="adm-head"><div><h1>Szövegek és kapcsolat</h1><p>A főoldal nyitóképe, a bemutatkozás és az elérhetőségek.</p></div></div>
      <form action={saveContent} className="form">
        <div className="card form">
          <h2>Nyitókép és főcím</h2>
          <div className="field"><label htmlFor="hero.title">Főcím</label><input id="hero.title" name="hero.title" className="input" required defaultValue={hero.title} /></div>
          <div className="field"><label htmlFor="hero.subtitle">Alcím</label><input id="hero.subtitle" name="hero.subtitle" className="input" defaultValue={hero.subtitle} /></div>
          <div className="field"><label>Nyitókép</label><ImagePicker name="hero.image" images={allImages(site)} value={hero.image} allowEmpty={false} /></div>
        </div>
        <div className="card form">
          <h2>Bemutatkozás</h2>
          <div className="form-row">
            <div className="field"><label htmlFor="intro.eyebrow">Kis felirat</label><input id="intro.eyebrow" name="intro.eyebrow" className="input" defaultValue={intro.eyebrow} /></div>
            <div className="field" style={{ gridColumn: "span 2" }}><label htmlFor="intro.title">Cím</label><input id="intro.title" name="intro.title" className="input" defaultValue={intro.title} /></div>
          </div>
          <div className="field"><label htmlFor="intro.lead">Kiemelt bekezdés</label><textarea id="intro.lead" name="intro.lead" className="input" defaultValue={intro.lead} /></div>
          <div className="field"><label htmlFor="intro.body">Szöveg</label><textarea id="intro.body" name="intro.body" className="input" defaultValue={intro.body} style={{ minHeight: "10rem" }} /><p className="hint">Üres sor = új bekezdés.</p></div>
        </div>
        <div className="card form">
          <h2>Kapcsolat</h2>
          <div className="form-row">
            <div className="field"><label htmlFor="contact.name">Név / cég</label><input id="contact.name" name="contact.name" className="input" defaultValue={contact.name} /></div>
            <div className="field"><label htmlFor="contact.phone">Telefon</label><input id="contact.phone" name="contact.phone" className="input" defaultValue={contact.phone} /></div>
            <div className="field"><label htmlFor="contact.email">E-mail</label><input id="contact.email" name="contact.email" type="email" className="input" defaultValue={contact.email} /></div>
          </div>
          <div className="field"><label htmlFor="contact.address">Cím</label><input id="contact.address" name="contact.address" className="input" defaultValue={contact.address} /></div>
          <div className="form-row">
            <div className="field"><label htmlFor="contact.facebook">Facebook URL</label><input id="contact.facebook" name="contact.facebook" className="input" defaultValue={contact.facebook} /></div>
            <div className="field"><label htmlFor="contact.instagram">Instagram URL</label><input id="contact.instagram" name="contact.instagram" className="input" defaultValue={contact.instagram} /></div>
            <div className="field"><label htmlFor="contact.mapUrl">Térkép link</label><input id="contact.mapUrl" name="contact.mapUrl" className="input" defaultValue={contact.mapUrl} /></div>
          </div>
          <div className="field"><label htmlFor="contact.note">Megjegyzés (pl. előzetes bejelentkezés)</label><input id="contact.note" name="contact.note" className="input" defaultValue={contact.note} /></div>
        </div>
        <div className="actions"><button className="btn btn-primary">Mentés</button></div>
      </form>
    </>
  );
}
