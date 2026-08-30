import type { Metadata } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";

/* Betűk build-időben letöltve és saját domainről kiszolgálva (nincs Google-kapcsolat). */
const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"], variable: "--font-fraunces", display: "swap",
  axes: ["opsz", "SOFT"], weight: "variable",
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
        <noscript><style>{`.rise,.unveil{opacity:1!important;transform:none!important;clip-path:none!important}`}</style></noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
