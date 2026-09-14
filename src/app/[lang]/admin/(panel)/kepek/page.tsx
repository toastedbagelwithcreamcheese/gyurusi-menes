import { readSite } from "@/lib/store";
import { allImages } from "@/lib/images";
import { missingTranslations, trLabel } from "@/lib/translations";
import { Thumb } from "../ImagePicker";
import { ImageUpload } from "../ImageUpload";
import { ConfirmButton } from "../ConfirmButton";
import { LField } from "../LField";
import { deleteUpload, saveUploadAlt, setHeroImage } from "../actions";

export default async function ImagesAdmin() {
  const site = await readSite();
  const images = allImages(site);
  return (
    <>
      <div className="adm-head"><div><h1>Képek</h1><p>Feltöltés és a nyitókép kiválasztása. A képeket automatikusan webre méretezzük; az aloldalak, események és túraútvonalak képeit a saját szerkesztőjükben választod ki (ott is lehet újat feltölteni).</p></div></div>
      {/* Böngészős kicsinyítés + route handler (nem szerver-akció): a nagy fotó is felmegy, folyamatjelzővel. */}
      <div className="card form">
        <h2>Új kép feltöltése</h2>
        <ImageUpload />
      </div>
      <div className="card">
        <h2>Összes kép ({images.length})</h2>
        <p className="hint" style={{ marginTop: -8, marginBottom: 16 }}>A „Nyitókép” a főoldal tetején látszik. A beépített fotók nem törölhetők, a feltöltöttek igen.</p>
        <div className="grid-img">{images.map((im) => { const isUpload = im.id.startsWith("u-"); const isHero = site.hero.image === im.id; return (
          <div key={im.id} className="tile" data-image-tile={im.id}>
            <Thumb src={im.src} alt={im.alt} className="" />
            {isHero && <span className="tag hero">Nyitókép</span>}
            <div className="tile-ops">
              {!isHero && <form action={setHeroImage}><input type="hidden" name="image" value={im.id} /><button>Nyitókép</button></form>}
              {isUpload && <form action={deleteUpload}><input type="hidden" name="id" value={im.id} /><ConfirmButton className="tile-del" compact>Töröl</ConfirmButton></form>}
            </div>
          </div>); })}</div>
      </div>
      {/* A feltöltött képek leírása háromnyelvű: ez a kép alt-szövege a magyar, az angol és a német oldalon. A beépített fotók
          leírása a kódban van (src/content/photos.json), azok itt nem szerkeszthetők. */}
      {site.uploads.length > 0 && (
        <div className="card">
          <h2>Feltöltött képek leírása</h2>
          <p className="hint" style={{ marginTop: -8, marginBottom: 16 }}>Ezt olvassa fel a képernyőolvasó, és ezt látják a keresők — mindhárom nyelven. Ha az angol vagy a német üres, ott a magyar leírás jelenik meg.</p>
          {site.uploads.map((u) => { const miss = missingTranslations(u.alt); return (
            <form key={u.id} id={`kep-${u.id}`} action={saveUploadAlt} className="form upl-alt" data-upload-alt-form={u.id} style={{ display: "grid", gridTemplateColumns: "96px minmax(0, 1fr)", gap: 16, alignItems: "start", paddingBlock: 12, borderTop: "1px solid var(--color-line)" }}>
              <Thumb src={u.src} alt={u.alt.hu} className="" />
              <div>
                <input type="hidden" name="id" value={u.id} />
                {miss.length > 0 && <span className="pill pill-tr" data-missing-translation={miss.join(",")}>Fordítás hiányzik: {trLabel(miss)}</span>}
                <LField name="alt" label="Leírás (mi látható a képen)" value={u.alt} required />
                <div className="actions"><button type="submit" className="btn btn-outline btn-sm" data-upload-alt-save={u.id}>Leírás mentése</button></div>
              </div>
            </form>); })}
        </div>
      )}
    </>
  );
}
