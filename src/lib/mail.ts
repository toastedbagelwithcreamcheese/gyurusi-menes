/**
 * E-mail küldés Resend REST API-val (nincs SDK-függőség).
 * RESEND_API_KEY + CONTACT_TO nélkül nem küld, csak jelzi — az üzenet és a jelentkezés
 * ilyenkor is megmarad az adminban, így semmi nem vész el. A CONTACT_TO élesben az
 * info@gyurusimenes.hu; a küldő domain DNS-rekordjait (SPF/DKIM) a Resend adja meg.
 */
type Result = { sent: true } | { sent: false; reason: string };

async function send(payload: { to: string[]; subject: string; text: string; reply_to?: string }): Promise<Result> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM ?? "Gyűrűsi Ménes <onboarding@resend.dev>";
  if (!key) return { sent: false, reason: "RESEND_API_KEY hiányzik" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, ...payload }),
  });
  if (!res.ok) return { sent: false, reason: `Resend ${res.status}: ${await res.text()}` };
  return { sent: true };
}

export async function sendContactMail(input: { name: string; email: string; phone?: string; message: string; page?: string }): Promise<Result> {
  const to = process.env.CONTACT_TO;
  if (!to) return { sent: false, reason: "CONTACT_TO hiányzik" };
  const text = `Név: ${input.name}\nE-mail: ${input.email}\nTelefon: ${input.phone || "-"}\nHonnan: ${input.page || "főoldal"}\n\n${input.message}`;
  return send({ to: [to], reply_to: input.email, subject: `Új üzenet a weboldalról${input.page ? ` (${input.page})` : ""} – ${input.name}`, text });
}

export async function sendRegistrationMail(input: { eventTitle: string; when: string; name: string; phone: string; email?: string; count: number; note?: string }): Promise<Result> {
  const to = process.env.CONTACT_TO;
  if (!to) return { sent: false, reason: "CONTACT_TO hiányzik" };
  const text = `Esemény: ${input.eventTitle} (${input.when})\n\nNév: ${input.name}\nTelefon: ${input.phone}\nE-mail: ${input.email || "-"}\nLétszám: ${input.count} fő\nMegjegyzés: ${input.note || "-"}\n\nA jelentkezés csak igényfelmérés — a részleteket telefonon egyeztessétek.`;
  return send({ to: [to], reply_to: input.email, subject: `Jelentkezés: ${input.eventTitle} – ${input.name} (${input.count} fő)`, text });
}

const CONFIRM = {
  hu: (e: string, w: string, p: string) => ({ subject: `Megkaptuk a jelentkezésed – ${e}`, text: `Köszönjük a jelentkezést a(z) „${e}” eseményre (${w}).\n\nEz még nem végleges foglalás: hamarosan telefonon keresünk, és mindent egyeztetünk. Ha addig kérdésed van, hívj minket: ${p}\n\nGyűrűsi Ménes` }),
  en: (e: string, w: string, p: string) => ({ subject: `We received your registration – ${e}`, text: `Thank you for registering for “${e}” (${w}).\n\nThis is not a final booking yet: we will call you shortly to arrange the details. If you have questions in the meantime, call us: ${p}\n\nGyűrűsi Ménes` }),
  de: (e: string, w: string, p: string) => ({ subject: `Wir haben Ihre Anmeldung erhalten – ${e}`, text: `Vielen Dank für Ihre Anmeldung zu „${e}“ (${w}).\n\nDies ist noch keine endgültige Buchung: Wir rufen Sie in Kürze an und besprechen alles Weitere. Bei Fragen erreichen Sie uns unter: ${p}\n\nGyűrűsi Ménes` }),
};
export async function sendRegistrationConfirmation(input: { to: string; lang: "hu" | "en" | "de"; eventTitle: string; when: string; phone: string }): Promise<Result> {
  const m = CONFIRM[input.lang](input.eventTitle, input.when, input.phone);
  return send({ to: [input.to], ...m });
}
