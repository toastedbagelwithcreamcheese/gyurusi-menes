import type { Lang } from "@/content/types";
import { getDict } from "./i18n";
import { BACKUPS_KEPT, MESSAGE_RETENTION_DAYS, REGISTRATION_RETENTION_DAYS } from "./maintenance";
import { t, type SiteContent } from "./store";

/**
 * Az adatkezelési tájékoztató megjelenítése. A szöveg (legal.privacy, hu/en/de) az adminból szerkeszthető sablon:
 *   · `## ` kezdetű sor = alcím, `- ` kezdetű sor = felsorolás elem, üres sor = új bekezdés;
 *   · {{controller}} = az adatkezelő az impresszum kitöltött mezőiből (üres mező nem jelenik meg; ha mind üres, semleges mondat);
 *   · {{contactEmail}} = az impresszum e-mail-címe (ha üres, a kapcsolati e-mail);
 *   · {{registrationDays}}, {{messageDays}}, {{backupDays}} = a megőrzési idők a src/lib/maintenance.ts állandóiból —
 *     így a tájékoztató számai mindig azok, amelyek szerint a karbantartás ténylegesen töröl (egy helyen definiálva).
 * Ismeretlen jelölő változatlanul marad, hogy a szerkesztő lássa az elírást.
 */

export const PRIVACY_TOKENS = ["controller", "contactEmail", "registrationDays", "messageDays", "backupDays"] as const;
export type PrivacyBlock = { kind: "h2"; text: string } | { kind: "p"; text: string } | { kind: "ul"; items: string[] };

/** A jelölők értéke egy nyelven. A {{controller}} több soros felsorolás („- Címke: érték”). */
export function privacyValues(site: Pick<SiteContent, "legal" | "contact">, lang: Lang): Record<(typeof PRIVACY_TOKENS)[number], string> {
  const d = getDict(lang).legal; const i = site.legal.imprint;
  const rows: Array<[string, string]> = [[d.operator, i.operator], [d.person, i.person], [d.address, i.address], [d.email, i.email], [d.phone, i.phone], [d.taxId, i.taxId], [d.regNo, i.regNo]];
  const filled = rows.map(([k, v]) => [k, (v ?? "").trim()] as const).filter(([, v]) => v);
  return {
    controller: filled.length ? filled.map(([k, v]) => `- ${k}: ${v}`).join("\n") : d.controllerMissing,
    contactEmail: (i.email || site.contact.email || "").trim(),
    registrationDays: String(REGISTRATION_RETENTION_DAYS),
    messageDays: String(MESSAGE_RETENTION_DAYS),
    backupDays: String(BACKUPS_KEPT),
  };
}

export function fillPrivacy(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*([A-Za-z]+)\s*\}\}/g, (m, k: string) => (Object.hasOwn(values, k) ? values[k] : m));
}

/** Egyszerű szerkezet a sablon szövegéből: alcímek, bekezdések, felsorolások. */
export function parsePrivacy(text: string): PrivacyBlock[] {
  const out: PrivacyBlock[] = [];
  let para: string[] = [];
  let list: string[] | null = null;
  const flush = () => {
    if (para.length) { out.push({ kind: "p", text: para.join(" ") }); para = []; }
    if (list) { out.push({ kind: "ul", items: list }); list = null; }
  };
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith("## ")) { flush(); out.push({ kind: "h2", text: line.slice(3).trim() }); continue; }
    if (/^[-•]\s+/.test(line)) { if (para.length) { out.push({ kind: "p", text: para.join(" ") }); para = []; } (list ??= []).push(line.replace(/^[-•]\s+/, "")); continue; }
    if (list) { out.push({ kind: "ul", items: list }); list = null; }
    para.push(line);
  }
  flush();
  return out;
}

/** A megjelenítendő tájékoztató egy nyelven: a (magyarra visszaeső) sablon, kitöltve, szerkezetre bontva. */
export function renderPrivacy(site: Pick<SiteContent, "legal" | "contact">, lang: Lang): PrivacyBlock[] {
  return parsePrivacy(fillPrivacy(t(site.legal.privacy, lang), privacyValues(site, lang)));
}
