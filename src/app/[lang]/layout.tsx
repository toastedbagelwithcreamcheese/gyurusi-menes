import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { isLang, LANGS } from "@/content/types";
import { DICTS, getDict } from "@/lib/i18n";
import { ScrollTop } from "@/components/ScrollTop";
import { RevealObserver } from "@/components/RevealObserver";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import "../globals.css";

/* Betűk build-időben letöltve, saját domainről (nincs futásidejű Google-kapcsolat).
   Fraunces: fontTools-szal készült példány — wght 500, SOFT 0, WONK 0 rögzítve, az opsz tengely
   megtartva (ez adja a címek vékony rajzát), latin + latin-ext, egyetlen 51 KB-os woff2. */
const fraunces = localFont({
  variable: "--font-fraunces", display: "swap", weight: "500", style: "normal",
  src: "../../fonts/fraunces-opsz-500.woff2",
  declarations: [{ prop: "font-optical-sizing", value: "auto" }],
});
/* A törzsszöveg betűje is előtöltött (P7, mérve): előtöltés nélkül a két fájlt (41 KB) csak a CSS letöltése után fedezi fel a
   böngésző — a lánc (HTML → CSS → betű) a Lighthouse mobil szimulációjában ~450 ms-mal később adta az első festést (FCP 1,36 s
   a 0,90 s helyett), és a Chrome az első festést a függő betűkre várva helyben is 20 ms-mal később tette meg. */
const instrument = Instrument_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-instrument", display: "swap", weight: ["400", "500", "600"] });

/** Gyökér-layout: minden lap az app/[lang]/ alatt él, ezért a <html lang> innen kapja a nyelvet.
 *  Szándékosan nincs dynamicParams=false (Next 16: az admin route-jai NoFallbackError-t dobnának, és a revalidatePath sem hatna).
 *
 *  Gyorsítótár (P7): a nyilvános lapok ISR-en futnak — mindegyik `revalidate = 3600`-at és ÜRES generateStaticParams-t exportál.
 *  Így a build egyetlen nyilvános lapot sem renderel előre: a mag (data/seed.json) nem sül bele a deployba, és egy új deploy nem
 *  mutathat régi tartalmat a tárban lévő, admin által szerkesztett helyett. A lap az első kérésnél a tárból renderelődik, utána
 *  gyorsítótárból megy. Az admin minden mentése revalidatePath("/", "layout")-ot hív (actions.ts refresh(), admin-api.ts
 *  revalidateSite()); az óránkénti újragenerálás a dátumfüggő részeket (közelgő / korábbi esemény) frissíti.
 *  Ezért itt, a layoutban sincs generateStaticParams: a három nyelvvel a build a három főoldalt előre renderelné. */

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const d = getDict(lang);
  /* Alapértékek (pl. az admin lapjaihoz). A nyilvános lapok a seo.ts metadataFor()-jával teljes készletet adnak:
     lapfüggő címet, leírást, canonicalt, hreflangot és megosztási képet. */
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: d.meta.title, template: d.meta.titleTemplate },
    description: d.meta.description,
    applicationName: SITE_NAME,
    openGraph: { type: "website", locale: d.ogLocale, alternateLocale: LANGS.filter((l) => l !== lang).map((l) => DICTS[l].ogLocale), siteName: SITE_NAME },
    twitter: { card: "summary_large_image" },
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
      <body><ScrollTop /><RevealObserver /><div className="grain" aria-hidden="true" />{children}</body>
    </html>
  );
}
