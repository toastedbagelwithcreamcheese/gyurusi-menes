"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { DEFAULT_LANG, isLang, type Dictionary, type Lang } from "@/content/types";
import { langPath } from "@/lib/paths";

/**
 * A 404-es lap törzse a kért útvonal nyelvén. A not-found komponens nem kap params-t, és éles szerveren a kért
 * útvonal a fejlécekből sem olvasható megbízhatóan (így minden 404 magyarul jelent meg) — a [lang] szegmens
 * paramétere viszont a kliens-oldali útvonal-állapotban megvan. A három nyelv szövege propként jön (pár sor).
 */
export function NotFoundBody({ texts }: { texts: Record<Lang, Dictionary["notFound"]> }) {
  const raw = useParams()?.lang;
  const lang: Lang = typeof raw === "string" && isLang(raw) ? raw : DEFAULT_LANG;
  const d = texts[lang];
  return (
    <main className="wrap-narrow section" style={{ paddingTop: 160, minHeight: "70vh" }}>
      <p className="eyebrow">{d.eyebrow}</p>
      <h1 className="h1">{d.title}</h1>
      <p className="lead">{d.body}</p>
      <p><Link href={langPath(lang)} className="btn btn-primary">{d.back}</Link></p>
    </main>
  );
}
