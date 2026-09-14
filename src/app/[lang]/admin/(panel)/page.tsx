import Link from "next/link";
import { readSite, upcoming, formatRange, t } from "@/lib/store";
import { listMessages, listRegistrations } from "@/lib/records";
import { adminProtected, adminUserRequired } from "@/lib/admin-auth";
import { contactRecipient, mailConfigured, mailSender } from "@/lib/mail";
import { eventMissingTranslations, trLabel } from "@/lib/translations";
import { sendTestEmail } from "./actions";

/** Be van-e állítva egy környezeti változó — az értékét soha nem adjuk ki. */
const envSet = (name: string) => !!process.env[name];

function EnvRow({ name, children }: { name: string; children: React.ReactNode }) {
  const on = envSet(name);
  return (
    <div className="status-row" data-env={name} data-env-set={on ? "1" : "0"}>
      <code>{name}</code>
      <span className={`pill ${on ? "pill-on" : "pill-off"}`}>{on ? "Beállítva" : "Nincs beállítva"}</span>
      <p>{children}</p>
    </div>
  );
}

/**
 * Állapotpanel: mi van beállítva a tárhelyen (e-mail, Google-értékelések, admin-jelszó), és pontosan melyik
 * környezeti változóval lehet pótolni. Kulcsot és jelszót nem mutat, csak azt, hogy be van-e állítva; a címzett és
 * a feladó címe nem titok, az látszik.
 */
function StatusPanel() {
  const mail = mailConfigured(), to = contactRecipient(), from = mailSender();
  const reviews = envSet("GOOGLE_PLACES_KEY"), locked = adminProtected();
  return (
    <section className="card status-panel" data-status-panel aria-labelledby="status-cim">
      <h2 id="status-cim">Beállítások állapota</h2>
      <p className="hint">Ezeket nem itt, hanem a tárhelyen, környezeti változóként kell megadni (Netlify: Site configuration → Environment variables), és utána újra kell deployolni az oldalt. Kulcsot és jelszót biztonsági okból nem mutatunk, csak azt, hogy be van-e állítva.</p>

      <div className="status-group" data-status="mail">
        <h3>E-mail-küldés (Resend) <span className={`pill ${mail ? "pill-on" : "pill-warn"}`} data-status-value={mail ? "on" : "off"}>{mail ? "Kulcs beállítva" : "Nem küld e-mailt"}</span></h3>
        <EnvRow name="RESEND_API_KEY">{mail
          ? "A kulcs be van állítva. A próba e-maillel ellenőrizheted, hogy a Resend tényleg elküldi-e a levelet."
          : "Amíg nincs beállítva, a kapcsolati üzenetek és a jelentkezések csak itt, az adminban látszanak — e-mail nem megy ki, a jelentkezők visszaigazolást sem kapnak. A kulcsot a resend.com fiókban lehet létrehozni (API Keys)."}</EnvRow>
        <EnvRow name="CONTACT_TO">Címzett: <strong data-mail-to>{to}</strong>{envSet("CONTACT_TO") ? "" : " (alapértelmezés)"}. Ide érkeznek a kapcsolati üzenetek és a jelentkezések.</EnvRow>
        <EnvRow name="CONTACT_FROM">Feladó: <strong data-mail-from>{from}</strong>{envSet("CONTACT_FROM") ? "" : " (alapértelmezés)"}. <span data-mail-from-note>A Resend csak akkor küld erről a címről, ha a domainje hitelesítve van a Resend-fiókban: a Resend által megadott DNS-rekordokat (SPF, DKIM) be kell állítani.</span></EnvRow>
        <form action={sendTestEmail} className="actions">
          <button type="submit" className="btn btn-outline btn-sm" data-test-mail>Próba e-mail küldése</button>
          <span className="hint">A próba ide megy: {to}</span>
        </form>
      </div>

      <div className="status-group" data-status="google">
        <h3>Google-értékelések <span className={`pill ${reviews ? "pill-on" : "pill-warn"}`} data-status-value={reviews ? "on" : "off"}>{reviews ? "Kulcs beállítva" : "Nem jelennek meg"}</span></h3>
        <EnvRow name="GOOGLE_PLACES_KEY">{reviews
          ? "A kulcs be van állítva: a főoldalon megjelenik az értékelés-blokk."
          : "Nélküle a főoldalon nincs Google-értékelés blokk. Google Cloud → Places API (New) bekapcsolva → API-kulcs, csak a Places API-ra korlátozva."}</EnvRow>
        <EnvRow name="GOOGLE_PLACE_ID">{envSet("GOOGLE_PLACE_ID")
          ? "A ménes Google-helyének azonosítója megadva."
          : "Nem kötelező: ha nincs megadva, a kulcs mellett az oldal egyszer magától megkeresi a ménes Google-helyét."}</EnvRow>
      </div>

      <div className="status-group" data-status="admin">
        <h3>Admin-jelszó <span className={`pill ${locked ? "pill-on" : "pill-warn"}`} data-status-value={locked ? "on" : "off"}>{locked ? "Védett" : "Jelszó nélkül nyílik"}</span></h3>
        <EnvRow name="ADMIN_PASSWORD">{locked
          ? "Az admin csak belépés után nyílik. A belépés az adott eszközön 30 napig megmarad; 5 rossz jelszó után 15 percre letiltja a belépést."
          : "Az admin jelszó nélkül nyílik — bárki megnyithatja, aki ismeri a címét. Élesítés előtt kötelező beállítani."}</EnvRow>
        <EnvRow name="ADMIN_USER">{adminUserRequired()
          ? "A belépéshez a jelszó mellett felhasználónév is kell."
          : "Nem kötelező. Ha beállítod, a belépéskor a jelszó mellé ezt a felhasználónevet is meg kell adni."}</EnvRow>
      </div>
    </section>
  );
}

export default async function AdminHome() {
  const [site, messages, registrations] = await Promise.all([readSite(), listMessages(), listRegistrations()]);
  const next = upcoming(site.events);
  const unread = messages.filter((m) => !m.read).length;
  const openIds = new Set(next.map((e) => e.id));
  const regs = registrations.filter((r) => openIds.has(r.eventId));
  const persons = regs.reduce((a, r) => a + r.count, 0);
  return (
    <>
      <div className="adm-head"><div><h1>Áttekintés</h1><p>Amit a látogatók most látnak, és ami rád vár.</p></div>
        <Link href="/admin/esemenyek/uj" className="btn btn-primary">+ Új esemény</Link></div>
      <div className="stats">
        <Link href="/admin/esemenyek" className="stat"><b>{next.length}</b><span>közelgő esemény</span></Link>
        <Link href="/admin/jelentkezesek" className="stat"><b>{persons}</b><span>jelentkezett fő ({regs.length} jelentkezés)</span></Link>
        <Link href="/admin/beszamolok" className="stat"><b>{site.reports.filter((r) => r.published).length}</b><span>közzétett beszámoló</span></Link>
        <Link href="/admin/uzenetek" className="stat"><b>{unread}</b><span>olvasatlan üzenet</span></Link>
      </div>
      <div className="card">
        <h2>Következő események</h2>
        {next.length === 0 ? <div className="empty">Nincs közelgő esemény. <Link href="/admin/esemenyek/uj" className="link">Hozz létre egyet.</Link></div> : (
          <div className="list">{next.slice(0, 5).map((e) => { const miss = eventMissingTranslations(e); return (
            <Link key={e.id} href={`/admin/esemenyek/${e.id}`} className="row" style={{ textDecoration: "none", color: "inherit", gridTemplateColumns: "1fr auto" }}>
              <div><h3>{t(e.title, "hu")} {e.featured && <span className="pill pill-feat">Kiemelt</span>} {miss.length > 0 && <span className="pill pill-tr">Fordítás hiányzik: {trLabel(miss)}</span>}</h3><div className="meta">{formatRange(e, "hu")}{e.location ? ` · ${e.location}` : ""}{e.registration ? " · jelentkezés nyitva" : ""}</div></div>
              <span className="note">Szerkesztés →</span>
            </Link>); })}</div>
        )}
      </div>
      <div className="card">
        <h2>Gyors műveletek</h2>
        <div className="actions">
          <Link href="/admin/tartalom" className="btn btn-outline btn-sm">Nyitókép, tulajdonos, kapcsolat</Link>
          <Link href="/admin/oldalak" className="btn btn-outline btn-sm">Aloldalak szövegei</Link>
          <Link href="/admin/utvonalak" className="btn btn-outline btn-sm">Túraútvonalak</Link>
          <Link href="/admin/beszamolok" className="btn btn-outline btn-sm">Beszámoló feltöltése</Link>
          <Link href="/admin/kepek" className="btn btn-outline btn-sm">Kép feltöltése</Link>
          {/* API-letöltés, nem lap: sima <a>, hogy a böngésző fájlként mentse. */}
          <a href="/api/admin/backup" className="btn btn-outline btn-sm" download data-backup-download>Mentés letöltése</a>
          <Link href="/" className="btn btn-ghost btn-sm" target="_blank">Oldal megnyitása ↗</Link>
        </div>
        <p className="hint">A mentés egy fájlban tartalmaz mindent: szövegeket, eseményeket, jelentkezéseket és üzeneteket. Automatikus mentés is készül naponta; az utolsó 30 megmarad.</p>
      </div>
      <StatusPanel />
    </>
  );
}
