import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LOCKED_MESSAGE, adminLocked, adminOpen, adminUserRequired, isAdmin, safeNext } from "@/lib/admin-auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Belépés", robots: { index: false, follow: false } };

/**
 * Belépő oldal — a (panel) csoporton kívül, ezért nincs rajta admin menü. Nyitott demó adminnál és már belépett
 * látogatónál nincs mit mutatni: tovább a kért admin-lapra. Jelszó nélküli éles futásban (adminLocked) nincs űrlap,
 * csak a teendő: az ADMIN_PASSWORD beállítása.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : "");
  if (adminLocked()) {
    return (
      <main className="login-wrap" data-login-page>
        <div className="card login" data-admin-locked>
          <p className="login-brand">Gyűrűsi Ménes<small>Admin</small></p>
          <h1>Az admin zárva</h1>
          <div className="flash flash-err" role="alert"><span>{LOCKED_MESSAGE}</span></div>
          <p className="hint">Jelszó nélkül senki sem léphet be: a jelentkezők neve és telefonszáma így nem kerülhet illetéktelen kézbe.</p>
        </div>
        <Link href="/" className="login-back">← Vissza az oldalra</Link>
      </main>
    );
  }
  if (adminOpen() || (await isAdmin(await headers()))) redirect(next);
  const askUser = adminUserRequired();
  return (
    <main className="login-wrap" data-login-page>
      <div className="card login">
        <p className="login-brand">Gyűrűsi Ménes<small>Admin</small></p>
        <h1>Belépés</h1>
        <p className="hint">{askUser ? "Add meg a felhasználónevet és a jelszót." : "Add meg az admin jelszavát."} A belépés ezen az eszközön 30 napig megmarad, vagy amíg ki nem lépsz.</p>
        {sp.kilepve === "1" && <div className="flash flash-ok" role="status" data-logged-out><span>Kiléptél az adminból.</span></div>}
        <LoginForm next={next} askUser={askUser} />
      </div>
      <Link href="/" className="login-back">← Vissza az oldalra</Link>
    </main>
  );
}
