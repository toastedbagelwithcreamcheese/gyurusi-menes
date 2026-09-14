import Link from "next/link";
import { notFound } from "next/navigation";
import { readSite, ROUTE_PHOTOS_MAX } from "@/lib/store";
import { pickerImages } from "@/lib/images";
import { ImagePicker } from "../../ImagePicker";
import { PhotoPicker } from "../../PhotoPicker";
import { LField } from "../../LField";
import { ConfirmButton } from "../../ConfirmButton";
import { deleteRoute, saveRoute } from "../../actions";

export default async function RouteEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await readSite();
  const route = id === "uj" ? null : site.routes.find((r) => r.id === id);
  if (id !== "uj" && !route) notFound();
  const images = pickerImages(site);
  return (
    <>
      <div className="adm-head"><div><h1>{route ? "Útvonal szerkesztése" : "Új útvonal"}</h1><p>Név, rövid leírás, egy térképkép és legfeljebb {ROUTE_PHOTOS_MAX} fotó az útvonalról. Új képet a választók alatti „Új kép feltöltése” részben tölthetsz fel.</p></div></div>
      <form action={saveRoute} className="card form" data-route-form>
        <input type="hidden" name="id" value={route?.id ?? ""} />
        <LField name="name" label="Név" value={route?.name} required />
        <LField name="summary" label="Rövid leírás" value={route?.summary} textarea rows={4} hint="Üres sor = új bekezdés." />
        <div className="field"><label>Térképkép (az útvonal rajza vagy térképe — ez jelenik meg nagyban)</label><ImagePicker name="mapImage" images={images} value={route?.mapImage} /></div>
        <div className="field"><label>Fotók az útvonalról (legfeljebb {ROUTE_PHOTOS_MAX}, a kijelölés sorrendjében)</label><PhotoPicker name="photos" images={images} value={route?.photos ?? []} max={ROUTE_PHOTOS_MAX} /></div>
        <label className="check"><input type="checkbox" name="published" defaultChecked={route?.published ?? true} />Közzététel a Túrák lapon</label>
        <div className="actions"><button className="btn btn-primary" data-route-save>Mentés</button><Link href="/admin/utvonalak" className="btn btn-ghost">Mégse</Link></div>
      </form>
      {route && (
        <form action={deleteRoute} className="actions" style={{ marginTop: 16 }} data-delete="route">
          <input type="hidden" name="id" value={route.id} />
          <ConfirmButton>Útvonal törlése</ConfirmButton>
        </form>
      )}
    </>
  );
}
