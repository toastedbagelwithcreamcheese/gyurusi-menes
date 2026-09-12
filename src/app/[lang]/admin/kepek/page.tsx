import { readSite } from "@/lib/store";
import { allImages } from "@/lib/images";
import { Thumb } from "../ImagePicker";
import { uploadImage, deleteUpload, setHeroImage } from "../actions";

export default async function ImagesAdmin() {
  const site = await readSite();
  const images = allImages(site);
  return (
    <>
      <div className="adm-head"><div><h1>Képek</h1><p>Feltöltés és a nyitókép kiválasztása. A képeket automatikusan webre méretezzük; az aloldalak és események képeit a saját szerkesztőjükben választod ki.</p></div></div>
      <form action={uploadImage} className="card form" encType="multipart/form-data">
        <h2>Új kép feltöltése</h2>
        <div className="form-row">
          <div className="field"><label htmlFor="file">Fájl (JPG/PNG, max 25 MB)</label><input id="file" name="file" type="file" accept="image/*" required className="input" /></div>
          <div className="field"><label htmlFor="alt">Rövid leírás (mi van a képen)</label><input id="alt" name="alt" className="input" placeholder="pl. Túraútvonal a Zalai-dombságban" /></div>
        </div>
        <div className="actions"><button className="btn btn-primary">Feltöltés</button></div>
      </form>
      <div className="card">
        <h2>Összes kép ({images.length})</h2>
        <p className="hint" style={{ marginTop: -8, marginBottom: 16 }}>A „Nyitókép” a főoldal tetején látszik. A beépített fotók nem törölhetők, a feltöltöttek igen.</p>
        <div className="grid-img">{images.map((im) => { const isUpload = im.id.startsWith("u-"); const isHero = site.hero.image === im.id; return (
          <div key={im.id} className="tile" data-image-tile={im.id}>
            <Thumb src={im.src} alt={im.alt} className="" />
            {isHero && <span className="tag hero">Nyitókép</span>}
            <div className="tile-ops">
              {!isHero && <form action={setHeroImage}><input type="hidden" name="image" value={im.id} /><button>Nyitókép</button></form>}
              {isUpload && <form action={deleteUpload}><input type="hidden" name="id" value={im.id} /><button style={{ color: "#a12d2d" }}>Töröl</button></form>}
            </div>
          </div>); })}</div>
      </div>
    </>
  );
}
