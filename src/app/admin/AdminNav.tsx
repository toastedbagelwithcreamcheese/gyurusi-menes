"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Áttekintés" },
  { href: "/admin/esemenyek", label: "Események" },
  { href: "/admin/hirek", label: "Hírek" },
  { href: "/admin/programok", label: "Programok" },
  { href: "/admin/kepek", label: "Képek" },
  { href: "/admin/tartalom", label: "Szövegek és kapcsolat" },
  { href: "/admin/uzenetek", label: "Üzenetek" },
];

export function AdminNav({ unread }: { unread: number }) {
  const path = usePathname();
  return (
    <nav className="adm-nav" aria-label="Admin menü">
      <div className="adm-brand">Gyűrűsi Ménes<small>Admin</small></div>
      {ITEMS.map((it) => {
        const active = it.href === "/admin" ? path === "/admin" : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined}>
            {it.label}
            {it.href === "/admin/uzenetek" && unread > 0 && <span className="badge">{unread}</span>}
          </Link>
        );
      })}
      <div className="spacer" />
      <Link href="/" className="back">← Vissza az oldalra</Link>
    </nav>
  );
}
