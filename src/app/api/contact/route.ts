import { NextResponse } from "next/server";
import { writeSite, uid } from "@/lib/store";
import { sendContactMail } from "@/lib/mail";
import { isLang, type Lang } from "@/content/types";
import { getDict } from "@/lib/i18n";

const last = new Map<string, number>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const now = Date.now();
  let body: Record<string, string>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 }); }
  const lang: Lang = isLang(body.lang) ? body.lang : "hu";
  const d = getDict(lang).form;
  if (now - (last.get(ip) ?? 0) < 15_000) return NextResponse.json({ ok: false, error: d.errRate }, { status: 429 });

  if (body.website) return NextResponse.json({ ok: true }); // honeypot – csendben elnyeljük
  const name = (body.name ?? "").trim(), email = (body.email ?? "").trim(), phone = (body.phone ?? "").trim(), message = (body.message ?? "").trim(), page = (body.page ?? "").trim().slice(0, 80);
  if (name.length < 2) return NextResponse.json({ ok: false, error: d.errName, field: "name" }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ ok: false, error: d.errEmail, field: "email" }, { status: 400 });
  if (message.length < 10) return NextResponse.json({ ok: false, error: d.errMessage, field: "message" }, { status: 400 });

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
    return NextResponse.json({ ok: false, error: d.errServer }, { status: 503 });
  }
  return NextResponse.json({ ok: true, mailed: mail.sent, stored });
}
