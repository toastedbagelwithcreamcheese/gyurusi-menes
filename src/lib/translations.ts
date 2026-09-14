import type { Event, L, TrailRoute } from "./store";

/**
 * Hiányzó fordítások jelzése az adminban (kliens és szerver is használja — Node-import nincs benne).
 * Egy háromnyelvű mező akkor „hiányos”, ha van benne szöveg, de az angol vagy a német üres: a látogató ott magyarul
 * látná (a `t()` a magyarra esik vissza). A teljesen üres (nem kötelező) mezőnél nincs mit fordítani.
 */
export type TrLang = "en" | "de";
const has = (s?: string) => !!s?.trim();

export function missingTranslations(v?: Partial<L> | null): TrLang[] {
  if (!v || (!has(v.hu) && !has(v.en) && !has(v.de))) return [];
  return (["en", "de"] as const).filter((l) => !has(v[l]));
}

/** Több mező együtt: melyik nyelv hiányzik legalább egy mezőből (EN, DE sorrendben). */
export function missingInFields(fields: Array<Partial<L> | null | undefined>): TrLang[] {
  const miss = new Set(fields.flatMap((f) => missingTranslations(f)));
  return (["en", "de"] as const).filter((l) => miss.has(l));
}

export const eventMissingTranslations = (e: Pick<Event, "title" | "summary" | "body">) => missingInFields([e.title, e.summary, e.body]);
export const routeMissingTranslations = (r: Pick<TrailRoute, "name" | "summary">) => missingInFields([r.name, r.summary]);
export const trLabel = (langs: TrLang[]) => langs.map((l) => l.toUpperCase()).join(", ");
