import type { Metadata } from "next";
import { readSite, upcoming } from "@/lib/store";
import { AdminNav } from "./AdminNav";
import { Flash } from "./Flash";
import "./admin.css";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const site = await readSite();
  const unread = site.messages.filter((m) => !m.read).length;
  const openIds = new Set(upcoming(site.events).map((e) => e.id));
  const regs = site.registrations.filter((r) => openIds.has(r.eventId)).length;
  return (
    <div className="adm">
      <AdminNav unread={unread} regs={regs} />
      <main className="adm-main"><Flash />{children}</main>
    </div>
  );
}
