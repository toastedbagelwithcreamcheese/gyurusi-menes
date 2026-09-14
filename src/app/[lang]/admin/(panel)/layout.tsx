import { readSite, upcoming } from "@/lib/store";
import { listMessages, listRegistrations } from "@/lib/records";
import { adminProtected } from "@/lib/admin-auth";
import { AdminNav } from "./AdminNav";
import { Flash } from "./Flash";

export const dynamic = "force-dynamic";

/**
 * Az admin menüs kerete (a belépő oldal kívül esik rajta — lásd a szülő layoutot). A védelem a proxyban és minden
 * szerver-akcióban van; itt csak az látszik, hogy van-e jelszó: nélküle minden lap tetején figyelmeztető sáv áll.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [site, messages, registrations] = await Promise.all([readSite(), listMessages(), listRegistrations()]);
  const unread = messages.filter((m) => !m.read).length;
  const openIds = new Set(upcoming(site.events).map((e) => e.id));
  const regs = registrations.filter((r) => openIds.has(r.eventId)).length;
  const open = !adminProtected();
  return (
    <div className="adm">
      <AdminNav unread={unread} regs={regs} canLogout={!open} />
      <main className="adm-main">
        {open && (
          <div className="adm-warn" role="note" data-admin-open>
            <strong>Az admin jelszó nélkül nyílik.</strong> Bárki megnyithatja, aki ismeri a címét — a jelentkezők nevét és telefonszámát is látja.
            Élesítés előtt állítsd be az <code>ADMIN_PASSWORD</code> környezeti változót (Netlify: Site configuration → Environment variables), és deployold újra az oldalt.
          </div>
        )}
        <Flash />
        {children}
      </main>
    </div>
  );
}
