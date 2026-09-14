import { readSite, upcoming } from "@/lib/store";
import { listMessages, listRegistrations } from "@/lib/records";
import { adminOpen } from "@/lib/admin-auth";
import { AdminNav } from "./AdminNav";
import { Flash } from "./Flash";

export const dynamic = "force-dynamic";

/**
 * Az admin menüs kerete (a belépő oldal kívül esik rajta — lásd a szülő layoutot). A védelem a proxyban és minden
 * szerver-akcióban van; itt csak az látszik, hogy nyitott demó-e (jelszó nélkül, `next dev` vagy ADMIN_OPEN_DEMO=1):
 * ilyenkor minden lap tetején figyelmeztető sáv áll. Jelszó nélküli éles futásban ide senki sem jut el (admin-auth.ts).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [site, messages, registrations] = await Promise.all([readSite(), listMessages(), listRegistrations()]);
  const unread = messages.filter((m) => !m.read).length;
  const openIds = new Set(upcoming(site.events).map((e) => e.id));
  const regs = registrations.filter((r) => openIds.has(r.eventId)).length;
  const open = adminOpen();
  return (
    <div className="adm">
      <AdminNav unread={unread} regs={regs} canLogout={!open} />
      <main className="adm-main">
        {open && (
          <div className="adm-warn" role="note" data-admin-open>
            <strong>Az admin jelszó nélkül nyílik.</strong> Bárki megnyithatja, aki ismeri a címét — a jelentkezők nevét és telefonszámát is látja.
            Ez csak bemutatóként lehetséges (<code>ADMIN_OPEN_DEMO=1</code> vagy <code>next dev</code>). Élesítés előtt állítsd be az <code>ADMIN_PASSWORD</code> környezeti változót, és töröld az <code>ADMIN_OPEN_DEMO</code>-t (Netlify: Site configuration → Environment variables), majd deployold újra az oldalt.
          </div>
        )}
        <Flash />
        {children}
      </main>
    </div>
  );
}
