import type { ReactNode } from "react";

export type RevealProps = {
  children: ReactNode; className?: string;
  as?: "div" | "section" | "article" | "header" | "h1" | "h2" | "p" | "figure" | "li";
  delay?: number; variant?: "rise" | "unveil";
} & Record<`data-${string}`, string | boolean>;

/**
 * Belépő animáció — sima elem, nincs saját kliens-kódja (szerver- és kliens-komponens is használhatja). Két mód:
 *  · `trigger="view"` (alapértelmezés): a rejtett kezdőállapot a HTML-ben van (data-in="false"); a gyökér-layout EGYETLEN
 *    RevealObserver-e kapcsolja data-in="true"-ra, amikor a blokk képbe ér (P7: korábban minden példány külön hidratálódott).
 *    JS nélkül a layout <noscript>-je mutat mindent.
 *  · `trigger="mount"` — a hajtás feletti fejlécek (aloldali képfej, naptár, jogi lapok): tisztán CSS-animáció a HTML
 *    megérkezésekor (globals.css, P7-blokk); nem vár a JS-re, reduced-motionra nincs mozgás.
 * `variant="unveil"` a képekhez: clip-path takarás húzódik le. A késleltetés view-nál transition-, mountnál animation-delay.
 */
export function Reveal({ children, className = "", as: Tag = "div", trigger = "view", delay, variant = "rise", ...rest }: RevealProps & { trigger?: "view" | "mount" }) {
  const mount = trigger === "mount";
  return (
    <Tag {...rest} className={`${variant} ${className}`} data-in={mount ? "mount" : "false"}
      style={delay ? (mount ? { animationDelay: `${delay}ms` } : { transitionDelay: `${delay}ms` }) : undefined}>
      {children}
    </Tag>
  );
}
