"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Visszajelző sáv az adminban: a szerver-műveletek `?ok=…` vagy `?hiba=…` paraméterrel irányítanak vissza,
 * ez mutatja meg (élesben a dobott hibák szövegét a Next elrejti — ezért nem dobunk, hanem így üzenünk).
 */
function FlashInner() {
  const sp = useSearchParams(); const router = useRouter(); const path = usePathname();
  const ok = sp.get("ok"), hiba = sp.get("hiba");
  if (!ok && !hiba) return null;
  const clear = () => router.replace(path, { scroll: false });
  return (
    <div className={`flash ${hiba ? "flash-err" : "flash-ok"}`} role={hiba ? "alert" : "status"} data-flash={hiba ? "err" : "ok"}>
      <span>{hiba ? "Nem sikerült: " : ""}{hiba ?? ok}</span>
      <button type="button" onClick={clear} aria-label="Bezárás">×</button>
    </div>
  );
}
export function Flash() { return <Suspense fallback={null}><FlashInner /></Suspense>; }
