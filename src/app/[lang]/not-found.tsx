import type { Metadata } from "next";
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
export default function NotFound() {
  /* FIGYELEM, gyorsítótár: a not-found elemet a Next minden [lang] alatti lap RSC-csomagjába előre belerendereli, ezért itt
     kérés-idejű API (headers(), cookies(), connection()) NEM lehet: az ÖSSZES nyilvános lapot kérésenként rendereltté tenné,
     és kiesnének a gyorsítótárból (P7). A nyelvet a NotFoundBody a kliens-oldali útvonal-paraméterből veszi. A tesztek
     közvetlen DB-írásai után a POST /api/admin/revalidate érvényteleníti a lapokat (scripts/revalidate.mjs). */
  return <NotFoundBody texts={{ hu: DICTS.hu.notFound, en: DICTS.en.notFound, de: DICTS.de.notFound }} />;
}
