import { DEFAULT_LANG, LANGS, type Lang } from "@/content/types";

/**
 * Nyelvfüggő útvonalak — kliensen és szerveren egyaránt. A magyar a gyökéren
 * (`/turak`), a többi nyelv előtaggal (`/en/turak`). Az útvonal-szeletek mindhárom
 * nyelven ugyanazok (egyszerűbb admin, egyszerűbb váltó); a `/hu` előtagot a proxy
 * a gyökérre irányítja, hogy egy oldalnak egy címe legyen.
 */
export const LANG_NAMES: Record<Lang, string> = { hu: "Magyar", en: "English", de: "Deutsch" };
export const LANG_COOKIE = "lang";

export function langPath(lang: Lang, path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (lang === DEFAULT_LANG) return p;
  return p === "/" ? `/${lang}` : `/${lang}${p}`;
}

/** `hreflang` térkép egy útvonalhoz; az `x-default` a magyar. */
export function alternatesFor(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of LANGS) out[l] = langPath(l, path);
  out["x-default"] = langPath(DEFAULT_LANG, path);
  return out;
}
