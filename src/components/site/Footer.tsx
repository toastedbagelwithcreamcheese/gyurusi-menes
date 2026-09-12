import Link from "next/link";
import type { Dictionary, Lang } from "@/content/types";
import { langPath } from "@/lib/paths";
import { t, type SiteContent } from "@/lib/store";

const tel = (p: string) => `tel:${p.replace(/\s/g, "")}`;

/** Lábléc — a tulajdonos ELÖL (a megbízó kérése), utána a kapcsolattartó, közösségi linkek. */
export function Footer({ site, lang, d }: { site: SiteContent; lang: Lang; d: Dictionary }) {
  const { owner, contact } = site;
  return (
    <footer className="on-dark ftr">
      <div className="wrap ftr-in">
        <div>
          <p className="h3" style={{ margin: 0 }}>Gyűrűsi Ménes</p>
          <p className="note" style={{ marginTop: 8, maxWidth: 320 }}>{d.footer.blurb}</p>
        </div>
        <div>
          <p className="eyebrow">{d.footer.owner}</p>
          <p style={{ margin: "8px 0 0", fontWeight: 600 }}>{owner.name}</p>
          <p className="note" style={{ margin: "2px 0 0" }}>{t(owner.role, lang)}</p>
          {owner.phone && <p style={{ margin: "4px 0 0" }}><a href={tel(owner.phone)}>{owner.phone}</a></p>}
          {owner.email && <p style={{ margin: "4px 0 0" }}><a href={`mailto:${owner.email}`}>{owner.email}</a></p>}
          <p className="note" style={{ margin: "6px 0 0", maxWidth: 280 }}>{t(owner.note, lang)}</p>
        </div>
        <div>
          <p className="eyebrow">{d.footer.contact}</p>
          <p style={{ margin: "8px 0 0", fontWeight: 600 }}>{contact.person}</p>
          <p style={{ margin: "4px 0 0" }}><a href={tel(contact.phone)}>{contact.phone}</a></p>
          <p style={{ margin: "4px 0 0" }}><a href={`mailto:${contact.email}`}>{contact.email}</a></p>
          <p style={{ margin: "6px 0 0" }}>{contact.address}</p>
        </div>
        <div>
          <p className="eyebrow">{d.footer.follow}</p>
          <p style={{ margin: "8px 0 0", display: "grid", gap: 4 }}>
            {contact.facebook && <a href={contact.facebook} target="_blank" rel="noopener">Facebook ↗</a>}
            {contact.instagram && <a href={contact.instagram} target="_blank" rel="noopener">Instagram ↗</a>}
            {contact.mapUrl && <a href={contact.mapUrl} target="_blank" rel="noopener">{d.contact.map.charAt(0).toUpperCase() + d.contact.map.slice(1)} ↗</a>}
          </p>
        </div>
      </div>
      <div className="wrap ftr-bottom"><div className="ftr-bottom-in">
        <span className="note">© {new Date().getFullYear()} Gyűrűsi Ménes · {owner.name}</span>
        <span className="note"><Link href={langPath(lang, "/esemenyek")}>{d.nav.esemenyek}</Link> · <Link href="/admin">{d.footer.admin}</Link></span>
      </div></div>
    </footer>
  );
}
