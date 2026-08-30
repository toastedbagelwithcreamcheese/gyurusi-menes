import { readSite } from "@/lib/store";
import { allImages } from "@/lib/images";
import { Thumb } from "../ImagePicker";
import { uploadImage, deleteUpload, toggleGallery, moveGallery, setHeroImage } from "../actions";

export default async function ImagesAdmin() {
  const site = await readSite();
  const images = allImages(site);
  const inGallery = new Map(site.gallery.map((g) => [g.image, g]));
  const gallery = [...site.gallery].sort((a, b) => a.order - b.order);
  return (
    <>
      <div className="adm-head"><div><h1>Képek</h1><p>Feltöltés, galéria összeállítása, nyitókép kiválasztása. A képeket automatikusan webre méretezzük.</p></div></div>
      <form action={uploadImage} className="card form" encType="multipart/form-data">
        <h2>Új kép feltöltése</h2>
        <div className="form-row">
          <div className="field"><label htmlFor="file">Fájl (JPG/PNG, max 25 MB)</label><input id="file" name="file" type="file" accept="image/*" required className="input" /></div>
          <div className="field"><label htmlFor="alt">Rövid leírás (mi van a képen)</label><input id="alt" name="alt" className="input" placeholder="pl. Csikó a tavaszi legelőn" /></div>
        </div>
        <div className="actions"><button className="btn btn-primary">Feltöltés</button></div>
      </form>

      <div className="card">
        <h2>Galéria sorrendje ({gallery.length} kép)</h2>
        {gallery.length === 0 ? <div className="empty">A galéria üres. Lent a képeknél kattints a „Galériába” gombra.</div> : (
          <div className="grid-img">{gallery.map((g, i) => { const im = images.find((x) => x.id === g.image); if (!im) return null; return (
            <div key={g.id} className="tile">
              <Thumb src={im.src} alt={im.alt} className="" />
              <span className="tag">{i + 1}</span>
              <div className="tile-ops">
                <form action={moveGallery}><input type="hidden" name="id" value={g.id} /><input type="hidden" name="dir" value="up" /><button disabled={i === 0} aria-label="Előrébb">←</button></form>
                <form action={moveGallery}><input type="hidden" name="id" value={g.id} /><input type="hidden" name="dir" value="down" /><button disabled={i === gallery.length - 1} aria-label="Hátrébb">→</button></form>
                <form action={toggleGallery}><input type="hidden" name="image" value={g.image} /><button>Kivesz</button></form>
              </div>
            </div>); })}</div>
        )}
      </div>

      <div className="card">
        <h2>Összes kép ({images.length})</h2>
        <p className="hint" style={{ marginTop: -8, marginBottom: 16 }}>A „Nyitókép” a főoldal tetején látszik. A beépített fotók nem törölhetők, a feltöltöttek igen.</p>
        <div className="grid-img">{images.map((im) => { const isUpload = im.id.startsWith("u-"); const isHero = site.hero.image === im.id; return (
          <div key={im.id} className={`tile ${inGallery.has(im.id) ? "selected" : ""}`}>
            <Thumb src={im.src} alt={im.alt} className="" />
            {isHero && <span className="tag hero">Nyitókép</span>}
            <div className="tile-ops">
              <form action={toggleGallery}><input type="hidden" name="image" value={im.id} /><button>{inGallery.has(im.id) ? "Kivesz" : "Galériába"}</button></form>
              {!isHero && <form action={setHeroImage}><input type="hidden" name="image" value={im.id} /><button>Nyitókép</button></form>}
              {isUpload && <form action={deleteUpload}><input type="hidden" name="id" value={im.id} /><button style={{ color: "#a12d2d" }}>Töröl</button></form>}
            </div>
          </div>); })}</div>
      </div>
    </>
  );
}
