import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Az admin közös kerete: stíluslap és noindex. A menü, a jelszó-figyelmeztetés és a visszajelző sáv a (panel)
 * csoport layoutjában él — a belépő oldal (belepes/) szándékosan kívül esik rajta, nem kapja meg az admin menüt.
 */
export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return children;
}
