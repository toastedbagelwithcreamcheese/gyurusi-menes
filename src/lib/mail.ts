/**
 * E-mail küldés Resend REST API-val (nincs SDK-függőség).
 * RESEND_API_KEY + CONTACT_TO nélkül nem küld, csak jelzi — az üzenet ilyenkor is
 * megmarad az adminban (data/site.json → messages), így semmi nem vész el.
 */
export async function sendContactMail(input: { name: string; email: string; phone?: string; message: string }) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  const from = process.env.CONTACT_FROM ?? "Gyűrűsi Ménes <onboarding@resend.dev>";
  if (!key || !to) return { sent: false as const, reason: "RESEND_API_KEY vagy CONTACT_TO hiányzik" };

  const text = `Név: ${input.name}\nE-mail: ${input.email}\nTelefon: ${input.phone || "-"}\n\n${input.message}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], reply_to: input.email, subject: `Új üzenet a weboldalról – ${input.name}`, text }),
  });
  if (!res.ok) return { sent: false as const, reason: `Resend ${res.status}: ${await res.text()}` };
  return { sent: true as const };
}
