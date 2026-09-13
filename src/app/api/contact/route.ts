import { NextResponse } from "next/server";
import { writeSite, uid } from "@/lib/store";
import { sendContactMail } from "@/lib/mail";

const last = new Map<string, number>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const now = Date.now();
  if (now - (last.get(ip) ?? 0) < 15_000) return NextResponse.json({ ok: false, error: "Túl gyors egymásutánban. Próbáld újra kicsit később." }, { status: 429 });

  let body: Record<string, string>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Hibás kérés." }, { status: 400 }); }

  if (body.website) return NextResponse.json({ ok: true }); // honeypot – csendben elnyeljük
  const name = (body.name ?? "").trim(), email = (body.email ?? "").trim(), phone = (body.phone ?? "").trim(), message = (body.message ?? "").trim(), page = (body.page ?? "").trim().slice(0, 80);
  if (name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || message.length < 10)
    return NextResponse.json({ ok: false, error: "Kérjük, add meg a neved, egy érvényes e-mail-címet és az üzeneted." }, { status: 400 });

  last.set(ip, now);
  /* Két csatorna: fájlba mentés (admin „Üzenetek") és e-mail. Read-only hoszton (Netlify) az első bukik,
     akkor az e-mail viszi; ha egyik sem sikerül, ezt megmondjuk a látogatónak. */
  let stored = false;
  try {
    await writeSite((site) => { site.messages.unshift({ id: uid(), name, email, phone: phone || undefined, message, page: page || undefined, receivedAt: new Date().toISOString(), read: false }); });
    stored = true;
  } catch (e) { console.warn("[contact] nem tudtam fájlba menteni:", e instanceof Error ? e.message : e); }
  const mail = await sendContactMail({ name, email, phone, message, page });
  if (!mail.sent) console.warn("[contact] e-mail nem ment ki:", mail.reason);
  if (!stored && !mail.sent) {
    console.error("[contact] ELVESZETT ÜZENET:", { name, email, phone, message });
    return NextResponse.json({ ok: false, error: `Most nem tudtuk fogadni az üzenetet. Kérjük, hívj minket, vagy írj közvetlenül e-mailt.` }, { status: 503 });
  }
  return NextResponse.json({ ok: true, mailed: mail.sent, stored });
}
