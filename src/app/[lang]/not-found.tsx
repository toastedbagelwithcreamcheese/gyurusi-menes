import Link from "next/link";
import { headers } from "next/headers";
import { isLang, DEFAULT_LANG, type Lang } from "@/content/types";
import { getDict } from "@/lib/i18n";
import { langPath } from "@/lib/paths";

/** 404 — a nyelvet a kért útvonalból olvassuk (a not-found nem kap params-t). */
export default async function NotFound() {
  const h = await headers();
  const path = h.get("x-invoke-path") ?? h.get("next-url") ?? "";
  const m = path.match(/^\/(hu|en|de)(?=\/|$)/);
  const lang: Lang = m && isLang(m[1]) ? m[1] : DEFAULT_LANG;
  const d = getDict(lang);
  return (
    <main className="wrap-narrow section" style={{ paddingTop: 160, minHeight: "70vh" }}>
      <p className="eyebrow">{d.notFound.eyebrow}</p>
      <h1 className="h1">{d.notFound.title}</h1>
      <p className="lead">{d.notFound.body}</p>
      <p><Link href={langPath(lang)} className="btn btn-primary">{d.notFound.back}</Link></p>
    </main>
  );
}
