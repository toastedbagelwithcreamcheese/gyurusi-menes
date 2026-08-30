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
  const name = (body.name ?? "").trim(), email = (body.email ?? "").trim(), phone = (body.phone ?? "").trim(), message = (body.message ?? "").trim();
  if (name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || message.length < 10)
    return NextResponse.json({ ok: false, error: "Kérjük, add meg a neved, egy érvényes e-mail-címet és az üzeneted." }, { status: 400 });

  last.set(ip, now);
  await writeSite((site) => { site.messages.unshift({ id: uid(), name, email, phone: phone || undefined, message, receivedAt: new Date().toISOString(), read: false }); });
  const mail = await sendContactMail({ name, email, phone, message });
  if (!mail.sent) console.warn("[contact] e-mail nem ment ki:", mail.reason);
  return NextResponse.json({ ok: true, mailed: mail.sent });
}
