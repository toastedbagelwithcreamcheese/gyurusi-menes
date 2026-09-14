import Link from "next/link";
import { Thumb } from "../ImagePicker";
import { readSite, formatRange, isPast, t } from "@/lib/store";
import { listRegistrations } from "@/lib/records";
import { resolveImage } from "@/lib/images";
import { eventMissingTranslations, trLabel } from "@/lib/translations";
import { toggleEvent, setFeatured } from "../actions";

export default async function EventsAdmin() {
  const [site, registrations] = await Promise.all([readSite(), listRegistrations()]);
  const events = [...site.events].sort((a, b) => b.date.localeCompare(a.date));
  const regs = (id: string) => registrations.filter((r) => r.eventId === id).reduce((a, r) => a + r.count, 0);
  return (
    <>
      <div className="adm-head"><div><h1>Események</h1><p>Lovas napok, versenyek, bemutatók. Egy esemény lehet kiemelt: az jelenik meg nagyban a főoldalon.</p></div>
        <Link href="/admin/esemenyek/uj" className="btn btn-primary">+ Új esemény</Link></div>
      {events.length === 0 ? <div className="empty">Még nincs esemény.</div> : (
        <div className="list">{events.map((e) => {
          const im = resolveImage(e.image, site); const over = isPast(e); const n = regs(e.id);
          /* Csak a közzétett eseménynél számít: azt látja a külföldi látogató (üres fordításnál magyarul). */
          const miss = e.published ? eventMissingTranslations(e) : [];
          return (
            <div key={e.id} className="row" data-event-row={e.id}>
              {im ? <Thumb src={im.src} /> : <div className="thumb empty">nincs kép</div>}
              <div>
                <h3>{t(e.title, "hu")} {e.featured && <span className="pill pill-feat">Kiemelt</span>}{" "}
                  {miss.length > 0 && <span className="pill pill-tr" data-missing-translation={miss.join(",")} title="A cím vagy a leírás angol/német változata üres — ott a magyar szöveg jelenik meg">Fordítás hiányzik: {trLabel(miss)}</span>}
                </h3>
                <div className="meta">{formatRange(e, "hu")}{e.location ? ` · ${e.location}` : ""}{e.registration ? (over ? " · jelentkezés lezárult" : " · jelentkezés nyitva") : ""}{n > 0 ? ` · ${n} fő jelentkezett` : ""}</div>
              </div>
              <div className="ops">
                <span className={`pill ${e.published ? "pill-on" : "pill-off"}`}>{e.published ? "Közzétéve" : "Rejtett"}</span>
                {!over && <form action={setFeatured}><input type="hidden" name="id" value={e.id} /><button className="btn btn-ghost btn-sm">{e.featured ? "Kiemelés le" : "Kiemel"}</button></form>}
                <form action={toggleEvent}><input type="hidden" name="id" value={e.id} /><button className="btn btn-ghost btn-sm">{e.published ? "Elrejt" : "Közzétesz"}</button></form>
                <Link href={`/admin/esemenyek/${e.id}`} className="btn btn-outline btn-sm">Szerkeszt</Link>
              </div>
            </div>
          );
        })}</div>
      )}
    </>
  );
}
