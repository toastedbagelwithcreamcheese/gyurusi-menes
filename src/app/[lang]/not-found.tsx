import type { Metadata } from "next";
import { connection } from "next/server";
import { isLang, DEFAULT_LANG } from "@/content/types";
import { DICTS, getDict } from "@/lib/i18n";
import { NotFoundBody } from "@/components/site/NotFoundBody";

/** Saját cím nyelvenként. A Next a hibakonvenció (not-found) metaadatát a szegmens paramétereivel hívja, így itt —
 *  a komponenssel ellentétben — a `lang` megvan. A noindex-et a Next a 404-es válaszhoz magától teszi (külön ne, mert duplázódna). */
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: { absolute: getDict(isLang(lang) ? lang : DEFAULT_LANG).seo.notFound } };
}

/** 404 — a törzs nyelvét a NotFoundBody az útvonal paraméteréből választja (lásd ott, miért nem itt). */
export default async function NotFound() {
  /* FIGYELEM, gyorsítótár: a not-found elemet a Next minden [lang] alatti lap RSC-csomagjába előre belerendereli, ezért
     egy itteni kérés-idejű API az ÖSSZES nyilvános lapot kérésenként rendereltté teszi. Korábban ezt az itt olvasott
     headers() tette (mellékhatásként); nélküle a lapok statikussá váltak, és a helyi DB közvetlen írása (qa-flow) nem
     látszott. A connection() ugyanezt a viselkedést tartja meg, most kimondva. A statikus/ISR-kiszolgálásról a P7 dönt —
     ha ezt a sort elveszi, a qa-flow közvetlen DB-írásait revalidate-tel kell kísérni. */
  await connection();
  return <NotFoundBody texts={{ hu: DICTS.hu.notFound, en: DICTS.en.notFound, de: DICTS.de.notFound }} />;
}
