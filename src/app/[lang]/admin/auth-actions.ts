"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { LOCKED_MESSAGE, LOGIN_PATH, SESSION_COOKIE, SESSION_DAYS, adminOpen, adminProtected, adminUserRequired, createSessionToken, credentialsMatch, safeNext, secureCookieFor } from "@/lib/admin-auth";
import { hit, ipKey, peek, resetHits } from "@/lib/ratelimit";

/*
 * Belépés és kilépés. Innen típust NEM exportálunk: egy „use server” fájl típus-újraexportja minden akciót 500-zal döntene.
 * Sebességkorlát (a P1 tartós korlátjával, IP-hash szerint): 5 sikertelen próba 15 percen belül → 15 perc tiltás.
 * A tiltás idejére a helyes jelszó sem enged be — különben a próbálgatás folytatható lenne.
 */

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;
type LoginState = { error?: string; locked?: boolean; user?: string };

const minutesLeft = (ms: number) => Math.max(1, Math.ceil(ms / 60_000));
const lockedMessage = (ms: number) =>
  `Túl sok sikertelen belépési próbálkozás, ezért a belépés átmenetileg le van tiltva. Próbáld újra ${minutesLeft(ms)} perc múlva.`;

export async function login(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const next = safeNext(String(fd.get("next") ?? ""));
  if (adminOpen()) redirect(next);
  if (!adminProtected()) return { error: LOCKED_MESSAGE, locked: true };
  const h = await headers();
  const user = String(fd.get("user") ?? "").trim();
  const pass = String(fd.get("password") ?? "");

  /* A korlát kulcsai a látogató IP-jéből (sózott hash); ha nem képezhetők, a belépés korlát nélkül megy tovább. */
  let failKey = "", lockKey = "";
  try {
    const req = new Request("http://admin.local/", { headers: h });
    [failKey, lockKey] = await Promise.all([ipKey(req, "login-fail"), ipKey(req, "login-lock")]);
  } catch (e) { console.warn("[login] a korlát kulcsa nem képezhető:", e instanceof Error ? e.message : e); }

  if (lockKey) {
    const lock = await peek(lockKey, LOCK_MS, 1);
    if (!lock.ok) return { error: lockedMessage(lock.retryAfterMs), locked: true, user };
  }
  if (!pass) return { error: "Írd be a jelszót.", user };

  if (!credentialsMatch(user, pass)) {
    const wrong = adminUserRequired() ? "Hibás felhasználónév vagy jelszó." : "Hibás jelszó.";
    if (!failKey || !lockKey) return { error: wrong, user };
    await hit(failKey, LOCK_MS, MAX_FAILS);
    const fails = await peek(failKey, LOCK_MS, MAX_FAILS);
    if (!fails.ok) {
      await hit(lockKey, LOCK_MS, 1);
      return { error: `${wrong} ${lockedMessage(LOCK_MS)}`, locked: true, user };
    }
    return { error: `${wrong} Még ${MAX_FAILS - fails.count} próbálkozásod van, utána 15 percre letiltjuk a belépést.`, user };
  }

  if (failKey) await resetHits(failKey);
  (await cookies()).set({
    name: SESSION_COOKIE, value: await createSessionToken(), httpOnly: true, secure: secureCookieFor(h),
    sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 86400,
  });
  redirect(next);
}

/** Kilépés: a süti törlése (ugyanazzal az útvonallal, amivel beállítottuk), vissza a belépő oldalra. */
export async function logout() {
  const h = await headers();
  (await cookies()).set({ name: SESSION_COOKIE, value: "", httpOnly: true, secure: secureCookieFor(h), sameSite: "lax", path: "/", maxAge: 0 });
  redirect(`${LOGIN_PATH}?kilepve=1`);
}
