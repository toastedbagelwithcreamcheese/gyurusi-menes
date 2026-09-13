"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Útvonalváltásnál a lap tetejére görget. A Next csak akkor görget, ha a lap első eleme nincs a képernyőn —
 * nálunk a fixált fejléc az első, ami mindig látszik, ezért a logóra kattintva a főoldal közepén landoltunk.
 * Horgonyos címnél (#kapcsolat) nem avatkozik be.
 */
export function ScrollTop() {
  const pathname = usePathname();
  const last = useRef(pathname);
  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}
