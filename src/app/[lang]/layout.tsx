import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { isLang, LANGS } from "@/content/types";
import { DICTS, getDict } from "@/lib/i18n";
import "../globals.css";

/* Betűk build-időben letöltve, saját domainről (nincs futásidejű Google-kapcsolat).
   Fraunces: fontTools-szal készült példány — wght 500, SOFT 0, WONK 0 rögzítve, az opsz tengely
   megtartva (ez adja a címek vékony rajzát), latin + latin-ext, egyetlen 51 KB-os woff2. */
const fraunces = localFont({
  variable: "--font-fraunces", display: "swap", weight: "500", style: "normal",
  src: "../../fonts/fraunces-opsz-500.woff2",
  declarations: [{ prop: "font-optical-sizing", value: "auto" }],
});
const instrument = Instrument_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-instrument", display: "swap", weight: ["400", "500", "600"] });

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Gyökér-layout: minden lap az app/[lang]/ alatt él, ezért a <html lang> innen kapja a nyelvet.
 *  Szándékosan nincs dynamicParams=false (Next 16: az admin route-jai NoFallbackError-t dobnának). */
export function generateStaticParams() { return LANGS.map((lang) => ({ lang })); }

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const d = getDict(lang);
  return {
    metadataBase: new URL(SITE),
    title: { default: d.meta.title, template: d.meta.titleTemplate },
    description: d.meta.description,
    openGraph: { type: "website", locale: d.ogLocale, alternateLocale: LANGS.filter((l) => l !== lang).map((l) => DICTS[l].ogLocale), siteName: "Gyűrűsi Ménes",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: d.meta.title }] },
    twitter: { card: "summary_large_image", images: ["/opengraph-image"] },
  };
}

export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Params }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <html lang={lang} className={`${fraunces.variable} ${instrument.variable}`}>
      <head>
        <noscript><style>{`.rise,.unveil{opacity:1!important;transform:none!important;clip-path:none!important} .hdr .brand-line,.hdr .hdr-nav a,.hdr .hdr-phone,.hdr .lang{opacity:1!important;transform:none!important} .hero-media img{transform:none!important}`}</style></noscript>
      </head>
      <body><div className="grain" aria-hidden="true" />{children}</body>
    </html>
  );
}
