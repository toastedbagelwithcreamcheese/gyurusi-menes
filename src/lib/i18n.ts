import { de } from "@/content/de";
import { en } from "@/content/en";
import { hu } from "@/content/hu";
import type { Dictionary, Lang } from "@/content/types";

/** A három szótár egy helyen — csak szerver-komponensből importáld; a kliens propként kapja, amit kell. */
export const DICTS: Record<Lang, Dictionary> = { hu, en, de };
export const getDict = (lang: Lang): Dictionary => DICTS[lang];
