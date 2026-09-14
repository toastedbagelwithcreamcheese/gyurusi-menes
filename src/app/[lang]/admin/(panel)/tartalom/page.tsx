import { readSite } from "@/lib/store";
import { pickerImages } from "@/lib/images";
import { ImagePicker } from "../ImagePicker";
import { LField } from "../LField";
import { SectionForm } from "../SectionForm";
import { saveContact, saveHero, saveIntro, saveOwner } from "../actions";

const SECTIONS = [["nyitokep", "Nyitókép"], ["tulajdonos", "Tulajdonos"], ["bemutatkozas", "Bemutatkozás"], ["kapcsolat", "Kapcsolat"]] as const;

/** A főoldal szerkeszthető részei — négy külön mentett részben, felül ugró-fülekkel (a lap így rövidebbnek hat, és egy mentés nem ír felül mást). */
export default async function ContentAdmin() {
  const site = await readSite();
  const { intro, hero, contact, owner } = site;
  const images = pickerImages(site);
  return (
    <>
      <div className="adm-head"><div><h1>Főoldal és kapcsolat</h1><p>Négy rész, mindegyiknek saját „Mentés” gombja van: a gomb csak a saját részét menti.</p></div></div>
      <nav className="adm-tabs" aria-label="A lap részei" data-content-tabs>
        {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </nav>

      <SectionForm id="nyitokep" title="Nyitókép és főcím" action={saveHero} saveLabel="Nyitókép mentése">
        <LField name="hero.title" label="Főcím" value={hero.title} required />
        <LField name="hero.subtitle" label="Alcím" value={hero.subtitle} textarea rows={2} />
        <div className="field"><label>Nyitókép</label><ImagePicker name="hero.image" images={images} value={hero.image} allowEmpty={false} /></div>
      </SectionForm>

      <SectionForm id="tulajdonos" title="A tulajdonos" action={saveOwner} saveLabel="Tulajdonos mentése"
        hint="Ő jelenik meg elöl a főoldalon, a kapcsolatnál és a láblécben. Ha a telefonszám üres, csak a neve és a szerepe látszik.">
        <div className="form-row">
          <div className="field"><label htmlFor="owner.name">Név</label><input id="owner.name" name="owner.name" className="input" required defaultValue={owner.name} /></div>
          <div className="field"><label htmlFor="owner.phone">Telefon</label><input id="owner.phone" name="owner.phone" className="input" defaultValue={owner.phone} placeholder="+36 …" /></div>
          <div className="field"><label htmlFor="owner.email">E-mail</label><input id="owner.email" name="owner.email" type="email" className="input" defaultValue={owner.email} /></div>
        </div>
        <LField name="owner.role" label="Szerep" value={owner.role} />
        <LField name="owner.note" label="Mit intéz (ez a mondat áll a neve alatt)" value={owner.note} textarea rows={2} />
        <div className="field"><label>Kép a tulajdonos blokkjához</label><ImagePicker name="owner.image" images={images} value={owner.image} /></div>
      </SectionForm>

      <SectionForm id="bemutatkozas" title="Bemutatkozás" action={saveIntro} saveLabel="Bemutatkozás mentése">
        <LField name="intro.eyebrow" label="Kis felirat" value={intro.eyebrow} />
        <LField name="intro.title" label="Cím" value={intro.title} />
        <LField name="intro.lead" label="Kiemelt bekezdés" value={intro.lead} textarea rows={3} />
        <LField name="intro.body" label="Szöveg" value={intro.body} textarea rows={8} hint="Üres sor = új bekezdés." />
      </SectionForm>

      <SectionForm id="kapcsolat" title="Általános kapcsolat (lovaglás, túra, tábor, események)" action={saveContact} saveLabel="Kapcsolat mentése">
        <div className="form-row">
          <div className="field"><label htmlFor="contact.person">Kapcsolattartó</label><input id="contact.person" name="contact.person" className="input" defaultValue={contact.person} /></div>
          <div className="field"><label htmlFor="contact.phone">Telefon</label><input id="contact.phone" name="contact.phone" className="input" required defaultValue={contact.phone} /></div>
          <div className="field"><label htmlFor="contact.email">E-mail</label><input id="contact.email" name="contact.email" type="email" className="input" required defaultValue={contact.email} /></div>
        </div>
        <div className="field"><label htmlFor="contact.address">Cím</label><input id="contact.address" name="contact.address" className="input" defaultValue={contact.address} /></div>
        <div className="form-row">
          <div className="field"><label htmlFor="contact.facebook">Facebook URL</label><input id="contact.facebook" name="contact.facebook" className="input" defaultValue={contact.facebook} /></div>
          <div className="field"><label htmlFor="contact.instagram">Instagram URL</label><input id="contact.instagram" name="contact.instagram" className="input" defaultValue={contact.instagram} /></div>
          <div className="field"><label htmlFor="contact.mapUrl">Térkép link</label><input id="contact.mapUrl" name="contact.mapUrl" className="input" defaultValue={contact.mapUrl} /></div>
        </div>
        <LField name="contact.note" label="Megjegyzés (pl. előzetes egyeztetés)" value={contact.note} textarea rows={2} />
      </SectionForm>
    </>
  );
}
