import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminProtected, adminUserRequired, isAdmin, safeNext } from "@/lib/admin-auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Belépés", robots: { index: false, follow: false } };

/**
 * Belépő oldal — a (panel) csoporton kívül, ezért nincs rajta admin menü. Jelszó nélküli (demó) adminnál és már
 * belépett látogatónál nincs mit mutatni: tovább a kért admin-lapra.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : "");
  if (!adminProtected() || (await isAdmin(await headers()))) redirect(next);
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
