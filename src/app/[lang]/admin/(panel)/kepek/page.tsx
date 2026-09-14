import { readSite } from "@/lib/store";
import { allImages } from "@/lib/images";
import { Thumb } from "../ImagePicker";
import { ImageUpload } from "../ImageUpload";
import { ConfirmButton } from "../ConfirmButton";
import { deleteUpload, setHeroImage } from "../actions";

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
    </>
  );
}
