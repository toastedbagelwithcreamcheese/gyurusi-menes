import type { CSSProperties } from "react";

/**
 * Könnyű helyőrző minden kép mögé (P7) — szerver- és kliens-komponensből is hívható: a domináns szín és a manifest apró
 * (~16 px-es) WebP-előnézete CSS-háttérként, amit a böngésző lágyan nagyít fel. A next/image `placeholder="blur"`-je helyett,
 * ami képenként egy SVG-szűrős (feGaussianBlur) data-URL-t tesz a HTML-be és az RSC-adatba is: nagyobb HTML, és a szűrőt
 * telefonon a teljes képméretben kell raszterizálni. A betöltött, átlátszatlan fotó eltakarja a hátteret.
 */
export function placeholderStyle(im: { blur?: string; color?: string }): CSSProperties {
  return {
    backgroundColor: im.color,
    ...(im.blur ? { backgroundImage: `url("${im.blur}")`, backgroundSize: "cover", backgroundPosition: "50% 50%", backgroundRepeat: "no-repeat" } : {}),
  };
}
