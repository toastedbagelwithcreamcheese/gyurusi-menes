import Link from "next/link";
import type { SiteContent } from "@/lib/store";

export function Footer({ contact }: { contact: SiteContent["contact"] }) {
  return (
    <footer className="on-dark ftr">
      <div className="wrap ftr-in">
        <div>
          <p className="h3" style={{ margin: 0 }}>Gyűrűsi Ménes</p>
          <p className="note" style={{ marginTop: 8, maxWidth: 320 }}>Hucul ménes a zalai dombok között.</p>
        </div>
        <div>
          <p className="eyebrow">Elérhetőség</p>
          <p style={{ margin: "8px 0 0" }}>{contact.address}</p>
          {contact.phone && <p style={{ margin: "4px 0 0" }}><a href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a></p>}
          {contact.email && <p style={{ margin: "4px 0 0" }}><a href={`mailto:${contact.email}`}>{contact.email}</a></p>}
        </div>
        <div>
          <p className="eyebrow">Kövess minket</p>
          <p style={{ margin: "8px 0 0", display: "grid", gap: 4 }}>
            {contact.facebook && <a href={contact.facebook} target="_blank" rel="noopener">Facebook ↗</a>}
            {contact.instagram && <a href={contact.instagram} target="_blank" rel="noopener">Instagram ↗</a>}
            {contact.mapUrl && <a href={contact.mapUrl} target="_blank" rel="noopener">Térkép ↗</a>}
          </p>
        </div>
      </div>
      <div className="wrap ftr-bottom"><div className="ftr-bottom-in">
        <span className="note">© {new Date().getFullYear()} {contact.name || "Gyűrűsi Ménes"}</span>
        <Link href="/admin" className="note">Admin</Link>
      </div></div>
    </footer>
  );
}
