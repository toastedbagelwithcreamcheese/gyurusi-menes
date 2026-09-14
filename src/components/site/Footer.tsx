import Link from "next/link";
import type { Dictionary, Lang } from "@/content/types";
import { langPath } from "@/lib/paths";
import { t, PAGE_KEYS, type SiteContent } from "@/lib/store";

const tel = (p: string) => `tel:${p.replace(/\s/g, "")}`;
const I = {
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>,
  phone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.9 2z"/></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  fb: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.4V14h2.8v8h3.3z"/></svg>,
  ig: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>,
  arrow: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  cal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/></svg>,
  info: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>,
  horse: <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 26c1-7 4-12 9-15l2-5 3 4c3 1 5 3 6 7l-4-1c-1 4-4 8-8 10H6z" fill="currentColor"/></svg>,
};

/**
 * Lábléc a megbízó többi oldalának mintájára: nagy mondat + hívó gomb, három oszlop ikonos
 * linkekkel (márka + elérhetőség, aloldalak, információk), jogi sor, alul copyright + készítő.
 * A tulajdonos itt is elöl áll.
 */
export function Footer({ site, lang, d }: { site: SiteContent; lang: Lang; d: Dictionary }) {
  const { owner, contact } = site;
  const year = new Date().getFullYear();
  return (
    <footer className="on-dark ftr2" data-footer>
      <div className="wrap">
        <div className="ftr2-top">
          <p className="ftr2-tagline">{d.footer.tagline}<em>{d.footer.taglineAccent}</em></p>
          <Link href={langPath(lang, "/#kapcsolat")} className="ftr2-cta">{d.footer.cta}<span className="ftr2-cta-ic">{I.arrow}</span></Link>
        </div>
        <div className="ftr2-grid">
          <div className="ftr2-brand">
            <p className="ftr2-name"><span className="ftr2-mark">{I.horse}</span><span>Gyűrűsi Ménes<small>{d.nav.place}</small></span></p>
            <p className="ftr2-blurb">{d.footer.blurb}</p>
            <ul className="ftr2-lines" role="list">
              <li><span className="eyebrow">{d.footer.owner}</span></li>
              <li className="ftr2-person">{owner.name} <span className="note">· {t(owner.role, lang)}</span></li>
              {owner.phone && <li>{I.phone}<a href={tel(owner.phone)}>{owner.phone}</a></li>}
              {owner.email && <li>{I.mail}<a href={`mailto:${owner.email}`}>{owner.email}</a></li>}
              <li className="ftr2-gap"><span className="eyebrow">{d.footer.contact}</span></li>
              <li className="ftr2-person">{contact.person}</li>
              <li>{I.mail}<a href={`mailto:${contact.email}`}>{contact.email}</a></li>
              <li>{I.phone}<a href={tel(contact.phone)}>{contact.phone}</a></li>
              <li>{I.pin}<span>{contact.address}</span></li>
            </ul>
            <div className="ftr2-social">
              {contact.facebook && <a href={contact.facebook} target="_blank" rel="noopener" aria-label="Facebook">{I.fb}</a>}
              {contact.instagram && <a href={contact.instagram} target="_blank" rel="noopener" aria-label="Instagram">{I.ig}</a>}
              <a href={`mailto:${contact.email}`} aria-label={d.contact.email}>{I.mail}</a>
              {contact.mapUrl && <a href={contact.mapUrl} target="_blank" rel="noopener" aria-label={d.contact.map}>{I.pin}</a>}
            </div>
          </div>
          <nav className="ftr2-col" aria-label={d.footer.colPages}>
            <p className="eyebrow">{d.footer.colPages}</p>
            <ul role="list">
              {PAGE_KEYS.map((k) => <li key={k}><Link href={langPath(lang, `/${k}`)}>{I.horse}{t(site.pages[k].title, lang)}</Link></li>)}
              <li><Link href={langPath(lang, "/esemenyek")}>{I.cal}{d.footer.events}</Link></li>
            </ul>
          </nav>
          <nav className="ftr2-col" aria-label={d.footer.colInfo}>
            <p className="eyebrow">{d.footer.colInfo}</p>
            <ul role="list">
              <li><Link href={langPath(lang, "/#tulajdonos")}>{I.info}{d.footer.owner}</Link></li>
              <li><Link href={langPath(lang, "/#kapcsolat")}>{I.mail}{d.nav.kapcsolat}</Link></li>
              <li><Link href={langPath(lang, "/adatkezeles")}>{I.shield}{d.footer.privacy}</Link></li>
              <li><Link href={langPath(lang, "/impresszum")}>{I.info}{d.footer.imprint}</Link></li>
              {/* Az admin-link szándékosan nincs itt: a jelentkezők adatai csak a belépő oldalon át érhetők el (/admin). */}
            </ul>
          </nav>
        </div>
        <div className="ftr2-legal">
          <Link href={langPath(lang, "/adatkezeles")}>{I.shield}{d.footer.privacy}</Link>
          <Link href={langPath(lang, "/impresszum")}>{I.info}{d.footer.imprint}</Link>
        </div>
        <div className="ftr2-bottom">
          <span className="note">© {year} Gyűrűsi Ménes · {owner.name}. {d.footer.rights}</span>
          <span className="ftr2-made">{d.footer.madeIn}</span>
        </div>
        <p className="ftr2-credit" data-credit>{d.footer.credit} <a href="https://kovacsbalintfoto.hu" target="_blank" rel="noopener">Kovács Bálint</a> · <a href="tel:+36308723777">+36 30 872 3777</a></p>
      </div>
    </footer>
  );
}
