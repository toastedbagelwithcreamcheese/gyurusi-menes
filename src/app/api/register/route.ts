import { NextResponse } from "next/server";
import { isLang, type Lang } from "@/content/types";
import { getDict } from "@/lib/i18n";
import { readSite, writeSite, uid, isPast, formatRange, t } from "@/lib/store";
import { sendRegistrationMail, sendRegistrationConfirmation } from "@/lib/mail";

const last = new Map<string, number>();

/** Jelentkezés egy eseményre — igényfelmérés: tárolás + értesítés az info@ címre (+ visszaigazolás, ha van e-mail). */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const now = Date.now();
  let body: Record<string, string>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 }); }
  const lang: Lang = isLang(body.lang) ? body.lang : "hu";
  const d = getDict(lang).reg;
  if (body.website) return NextResponse.json({ ok: true });
  if (now - (last.get(ip) ?? 0) < 10_000) return NextResponse.json({ ok: false, error: d.errRate }, { status: 429 });

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

  last.set(ip, now);
  let stored = false;
  try {
    await writeSite((s) => { s.registrations.unshift({ id: uid(), eventId: ev.id, name, phone, email: email || undefined, count, note: note || undefined, receivedAt: new Date().toISOString() }); });
    stored = true;
  } catch (e) { console.warn("[register] nem tudtam menteni:", e instanceof Error ? e.message : e); }
  const when = formatRange(ev, "hu");
  const mail = await sendRegistrationMail({ eventTitle: t(ev.title, "hu"), when, name, phone, email: email || undefined, count, note: note || undefined });
  if (!mail.sent) console.warn("[register] értesítő nem ment ki:", mail.reason);
  if (email) { const c = await sendRegistrationConfirmation({ to: email, lang, eventTitle: t(ev.title, lang), when: formatRange(ev, lang), phone: site.contact.phone }); if (!c.sent) console.warn("[register] visszaigazolás nem ment ki:", c.reason); }
  if (!stored && !mail.sent) { console.error("[register] ELVESZETT JELENTKEZÉS:", { ev: ev.id, name, phone, count }); return NextResponse.json({ ok: false, error: d.err }, { status: 503 }); }
  return NextResponse.json({ ok: true, stored, mailed: mail.sent });
}
