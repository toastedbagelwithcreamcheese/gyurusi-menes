import { NextResponse } from "next/server";
import { isLang, type Lang } from "@/content/types";
import { getDict } from "@/lib/i18n";
import { readSite, isPast, formatRange, t } from "@/lib/store";
import { addRegistration } from "@/lib/records";
import { limitByIp } from "@/lib/ratelimit";
import { adminProtected, isAdmin } from "@/lib/admin-auth";
import { sendRegistrationMail, sendRegistrationConfirmation } from "@/lib/mail";

/** Jelentkezés egy eseményre — igényfelmérés: tárolás + értesítés az info@ címre (+ visszaigazolás, ha van e-mail). */
export async function POST(req: Request) {
  let body: Record<string, string>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 }); }
  const lang: Lang = isLang(body.lang) ? body.lang : "hu";
  const d = getDict(lang).reg;
  if (body.website) return NextResponse.json({ ok: true });

  const name = (body.name ?? "").trim(), phone = (body.phone ?? "").trim(), email = (body.email ?? "").trim(), note = (body.note ?? "").trim();
  const count = Number.parseInt(body.count ?? "", 10);
  const emailOk = !email || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  if (name.length < 2) return NextResponse.json({ ok: false, error: d.errName, field: "name" }, { status: 400 });
  if (phone.replace(/\D/g, "").length < 6) return NextResponse.json({ ok: false, error: d.errPhone, field: "phone" }, { status: 400 });
  if (!Number.isInteger(count) || count < 1 || count > 99) return NextResponse.json({ ok: false, error: d.errCount, field: "count" }, { status: 400 });
  if (!emailOk) return NextResponse.json({ ok: false, error: d.errEmail, field: "email" }, { status: 400 });

  const site = await readSite();
  const ev = site.events.find((e) => e.id === body.eventId && e.published);
  if (!ev || !ev.registration || isPast(ev)) return NextResponse.json({ ok: false, error: d.closed }, { status: 400 });

  /* Tartós sebességkorlát (IP-hash, 10 s) — Netlify-on a függvénypéldányok között is él. Kivétel: a BELÉPETT admin (csak ha van
     ADMIN_PASSWORD, és a kérés érvényes sütit vagy Basic Auth-ot hoz) — az élő-szerű próba (scripts/checks/final-live.mjs) egy gépről
     küld 20 egyidejű jelentkezést. Jelszó nélküli (nyitott) adminnál senki sem kivétel. */
  const trusted = adminProtected() && (await isAdmin(req.headers));
  /* A belépett admin próbája (x-gm-probe: final-live) nem küld e-mailt — 20 próbajelentkezés ne menjen ki az info@ postafiókba. */
  const probe = trusted && req.headers.get("x-gm-probe") === "final-live";
  if (!trusted && !(await limitByIp(req, "register", 10_000)).ok) return NextResponse.json({ ok: false, error: d.errRate }, { status: 429 });
  let stored = false;
  try {
    await addRegistration({ eventId: ev.id, name, phone, email: email || undefined, count, note: note || undefined });
    stored = true;
  } catch (e) { console.warn("[register] nem tudtam menteni:", e instanceof Error ? e.message : e); }
  const when = formatRange(ev, "hu");
  const mail = probe ? { sent: false, reason: "admin-próba (x-gm-probe)" } : await sendRegistrationMail({ eventTitle: t(ev.title, "hu"), when, name, phone, email: email || undefined, count, note: note || undefined });
  if (!mail.sent && !probe) console.warn("[register] értesítő nem ment ki:", mail.reason);
  if (email && !probe) { const c = await sendRegistrationConfirmation({ to: email, lang, eventTitle: t(ev.title, lang), when: formatRange(ev, lang), phone: site.contact.phone }); if (!c.sent) console.warn("[register] visszaigazolás nem ment ki:", c.reason); }
  if (!stored && !mail.sent) { console.error("[register] ELVESZETT JELENTKEZÉS:", { ev: ev.id, name, phone, count }); return NextResponse.json({ ok: false, error: d.err }, { status: 503 }); }
  return NextResponse.json({ ok: true, stored, mailed: mail.sent });
}
