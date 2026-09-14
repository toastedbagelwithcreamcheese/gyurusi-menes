import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLang } from "@/content/types";
import { notFoundMetadata } from "@/lib/seo";

type P = { params: Promise<{ lang: string }> };

/* Ismeretlen címek 404-e ne kerüljön a gyorsítótárba (bármilyen cím érkezhet): kérésenként renderelődik. */
export const dynamic = "force-dynamic";

/** A 404 saját címe a böngésző újrarajzolása után is (lásd seo.ts notFoundMetadata). */
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? notFoundMetadata(lang) : {};
}

/** Minden ismeretlen útvonal a nyelv alatt → 404 (a nyelvi not-found lappal). */
export default function CatchAll() { notFound(); }
