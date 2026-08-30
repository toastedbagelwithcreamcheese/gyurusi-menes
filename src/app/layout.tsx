import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

/* Betűk build-időben letöltve és saját domainről kiszolgálva (nincs Google-kapcsolat). */
/* Fraunces: a Google változó betűjéből (SOFT, WONK, opsz, wght) fontTools-szal készült példány —
   wght 500, SOFT 0, WONK 0 rögzítve, az opsz tengely megtartva (ez adja a címek finom, vékony rajzát),
   latin + latin-ext részhalmaz, egyetlen woff2. A teljes változó betű 2×110 KB volt. */
const fraunces = localFont({
  variable: "--font-fraunces", display: "swap", weight: "500", style: "normal",
  src: "../fonts/fraunces-opsz-500.woff2",
  declarations: [{ prop: "font-optical-sizing", value: "auto" }],
});
const instrument = Instrument_Sans({
  subsets: ["latin", "latin-ext"], variable: "--font-instrument", display: "swap", weight: ["400", "500", "600"],
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Gyűrűsi Ménes – hucul lovak Zalában", template: "%s · Gyűrűsi Ménes" },
  description: "Hucul ménes a zalai dombok között: lovaglás, Hucul Ösvény, csikósbemutató, közösségi lovas napok Gyűrűsön.",
  openGraph: { type: "website", locale: "hu_HU", siteName: "Gyűrűsi Ménes" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" className={`${fraunces.variable} ${instrument.variable}`}>
      <head>
        <noscript><style>{`.rise,.unveil{opacity:1!important;transform:none!important;clip-path:none!important} .hdr .brand-line,.hdr .hdr-nav a,.hdr .hdr-phone{opacity:1!important;transform:none!important} .hero-media img{transform:none!important}`}</style></noscript>
      </head>
      <body><div className="grain" aria-hidden="true" />{children}</body>
    </html>
  );
}
