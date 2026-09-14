"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "../auth-actions";

const ITEMS = [
  { href: "/admin", label: "Áttekintés" },
  { href: "/admin/tartalom", label: "Főoldal és kapcsolat" },
  { href: "/admin/oldalak", label: "Aloldalak" },
  { href: "/admin/utvonalak", label: "Túraútvonalak" },
  { href: "/admin/esemenyek", label: "Események" },
  { href: "/admin/jelentkezesek", label: "Jelentkezések" },
  { href: "/admin/beszamolok", label: "Beszámolók" },
  { href: "/admin/kepek", label: "Képek" },
  { href: "/admin/uzenetek", label: "Üzenetek" },
  { href: "/admin/jogi", label: "Impresszum, adatkezelés" },
];

/** Admin menü. A „Kilépés” csak jelszavas adminnál látszik — jelszó nélkül nincs miből kilépni. */
export function AdminNav({ unread, regs, canLogout }: { unread: number; regs: number; canLogout: boolean }) {
  const path = (usePathname() ?? "").replace(/^\/hu(?=\/)/, "");
  return (
    <nav className="adm-nav" aria-label="Admin menü">
      <div className="adm-brand">Gyűrűsi Ménes<small>Admin</small></div>
      {ITEMS.map((it) => {
        const active = it.href === "/admin" ? path === "/admin" : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined}>
            {it.label}
            {it.href === "/admin/uzenetek" && unread > 0 && <span className="badge">{unread}</span>}
            {it.href === "/admin/jelentkezesek" && regs > 0 && <span className="badge">{regs}</span>}
          </Link>
        );
      })}
      <div className="spacer" />
      <Link href="/" className="back">← Vissza az oldalra</Link>
      {canLogout && (
        <form action={logout} className="adm-logout">
          <button type="submit" data-logout>Kilépés</button>
        </form>
      )}
    </nav>
  );
}
