import type { Metadata } from "next";
import { readSite } from "@/lib/store";
import { AdminNav } from "./AdminNav";
import "./admin.css";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const site = await readSite();
  const unread = site.messages.filter((m) => !m.read).length;
  return (
    <div className="adm">
      <AdminNav unread={unread} />
      <main className="adm-main">{children}</main>
    </div>
  );
}
