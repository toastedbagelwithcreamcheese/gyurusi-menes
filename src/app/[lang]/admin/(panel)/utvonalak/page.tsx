import Link from "next/link";
import { readSite, sortRoutes, t } from "@/lib/store";
import { resolveImage } from "@/lib/images";
import { routeMissingTranslations, trLabel } from "@/lib/translations";
import { Thumb } from "../ImagePicker";
import { moveRoute, toggleRoute } from "../actions";

/** Túraútvonalak listája: sorrend (↑ ↓), közzététel, szerkesztés. A Túrák lap ebben a sorrendben mutatja a közzétetteket. */
export default async function RoutesAdmin() {
  const site = await readSite();
  const routes = sortRoutes(site.routes);
  const live = routes.filter((r) => r.published).length;
  return (
    <>
      <div className="adm-head"><div><h1>Túraútvonalak</h1><p>Az útvonalak a Túrák lapon jelennek meg kártyaként: térképkép, legfeljebb 4 fotó az útvonalról, név és rövid leírás. Amíg egy sincs közzétéve, a Túrák lapon az illusztrált térkép látszik.</p></div>
        <Link href="/admin/utvonalak/uj" className="btn btn-primary">+ Új útvonal</Link></div>
      {routes.length === 0 ? (
        <div className="empty" data-routes-empty>Még nincs útvonal. <Link href="/admin/utvonalak/uj" className="link">Vegyél fel egyet</Link> — elég egy név és egy térképkép vagy fotó.</div>
      ) : (
        <>
          <p className="hint" style={{ margin: "0 0 12px" }} data-routes-live={live}>{live > 0 ? `${live} közzétett útvonal látszik a Túrák lapon, ebben a sorrendben.` : "Egyik útvonal sincs közzétéve — a Túrák lapon most az illusztráció látszik."}</p>
          <div className="list">{routes.map((r, i) => {
            const im = resolveImage(r.mapImage ?? r.photos[0], site);
            const miss = r.published ? routeMissingTranslations(r) : [];
            const name = t(r.name, "hu");
            return (
              <div key={r.id} className="row" data-route-row={r.id}>
                {im ? <Thumb src={im.src} /> : <div className="thumb empty">nincs kép</div>}
                <div>
                  <h3>{name} {miss.length > 0 && <span className="pill pill-tr" data-missing-translation={miss.join(",")}>Fordítás hiányzik: {trLabel(miss)}</span>}</h3>
                  <div className="meta">{i + 1}. a sorban · {r.mapImage ? "térképkép" : "nincs térképkép"} · {r.photos.length} fotó</div>
                </div>
                <div className="ops">
                  <span className={`pill ${r.published ? "pill-on" : "pill-off"}`}>{r.published ? "Közzétéve" : "Rejtett"}</span>
                  <form action={moveRoute}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="dir" value="up" /><button className="btn btn-ghost btn-sm" disabled={i === 0} aria-label={`${name}: feljebb`} data-route-move="up">↑</button></form>
                  <form action={moveRoute}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="dir" value="down" /><button className="btn btn-ghost btn-sm" disabled={i === routes.length - 1} aria-label={`${name}: lejjebb`} data-route-move="down">↓</button></form>
                  <form action={toggleRoute}><input type="hidden" name="id" value={r.id} /><button className="btn btn-ghost btn-sm" data-route-toggle>{r.published ? "Elrejt" : "Közzétesz"}</button></form>
                  <Link href={`/admin/utvonalak/${r.id}`} className="btn btn-outline btn-sm">Szerkeszt</Link>
                </div>
              </div>
            );
          })}</div>
        </>
      )}
    </>
  );
}
