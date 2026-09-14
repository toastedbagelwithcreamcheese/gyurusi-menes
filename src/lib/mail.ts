/**
 * E-mail küldés Resend REST API-val (nincs SDK-függőség).
 * RESEND_API_KEY nélkül nem küld, csak jelzi — az üzenet és a jelentkezés ilyenkor is megmarad az adminban, így semmi
 * nem vész el. A címzett a CONTACT_TO, ha nincs beállítva: info@gyurusimenes.hu. A feladó a CONTACT_FROM; a feladó
 * domainjének DNS-rekordjait (SPF/DKIM) a Resend adja meg, a domain tulajdonosa állítja be.
 * Az admin kezdőlapjának állapotpanelje ugyanezekből a függvényekből mutatja, mi van beállítva (értéket kulcsból soha).
 * RESEND_API_URL: csak teszthez (helyi Resend-mock); élesben nem kell.
 */
type Result = { sent: true } | { sent: false; reason: string };

export const DEFAULT_CONTACT_TO = "info@gyurusimenes.hu";
export const DEFAULT_FROM = "Gyűrűsi Ménes <onboarding@resend.dev>";
export const contactRecipient = () => process.env.CONTACT_TO || DEFAULT_CONTACT_TO;
export const mailSender = () => process.env.CONTACT_FROM || DEFAULT_FROM;
export const mailConfigured = () => !!process.env.RESEND_API_KEY;

async function send(payload: { to: string[]; subject: string; text: string; reply_to?: string }): Promise<Result> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: "RESEND_API_KEY hiányzik" };
  try {
    const res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: mailSender(), ...payload }),
    });
    if (!res.ok) return { sent: false, reason: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: `a Resend nem érhető el: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function sendContactMail(input: { name: string; email: string; phone?: string; message: string; page?: string }): Promise<Result> {
  const text = `Név: ${input.name}\nE-mail: ${input.email}\nTelefon: ${input.phone || "-"}\nHonnan: ${input.page || "főoldal"}\n\n${input.message}`;
  return send({ to: [contactRecipient()], reply_to: input.email, subject: `Új üzenet a weboldalról${input.page ? ` (${input.page})` : ""} – ${input.name}`, text });
}

export async function sendRegistrationMail(input: { eventTitle: string; when: string; name: string; phone: string; email?: string; count: number; note?: string }): Promise<Result> {
  const text = `Esemény: ${input.eventTitle} (${input.when})\n\nNév: ${input.name}\nTelefon: ${input.phone}\nE-mail: ${input.email || "-"}\nLétszám: ${input.count} fő\nMegjegyzés: ${input.note || "-"}\n\nA jelentkezés csak igényfelmérés — a részleteket telefonon egyeztessétek.`;
  return send({ to: [contactRecipient()], reply_to: input.email, subject: `Jelentkezés: ${input.eventTitle} – ${input.name} (${input.count} fő)`, text });
}

/** Próba e-mail az admin állapotpaneljéről: ugyanazzal a küldővel, a valódi címzettnek. */
export async function sendTestMail(): Promise<Result & { to: string }> {
  const to = contactRecipient();
  const text = `Ez egy próba e-mail a weboldal adminjának „Próba e-mail küldése” gombjáról.\n\nHa megérkezett, az e-mail-küldés működik: a kapcsolati űrlap üzenetei és az eseményjelentkezések erre a címre (${to}) érkeznek.\n\nFeladó: ${mailSender()}`;
  return { ...(await send({ to: [to], subject: "Próba e-mail – Gyűrűsi Ménes weboldal", text })), to };
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
