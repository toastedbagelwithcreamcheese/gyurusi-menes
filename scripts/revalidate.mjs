/**
 * A nyilvános lapok gyorsítótárának érvénytelenítése egy futó szerveren: POST /api/admin/revalidate.
 * A P7 óta a nyilvános lapok ISR-en futnak (első kéréskor a tárból renderelődnek, utána gyorsítótárból mennek). Az admin mentései
 * maguk érvénytelenítenek; a helyi adatbázis KÖZVETLEN írása után (data/site.json kézzel, db:reset, db:demo, a tesztek
 * próbaadatai) ez kell ahhoz, hogy a lap a tárból újraépüljön.
 *
 * Használat modulként: import { revalidateSite } from "./revalidate.mjs"; await revalidateSite(BASE)
 * Parancssorból:        BASE_URL=http://localhost:3012 node scripts/revalidate.mjs
 * Jelszavas adminnál az ADMIN_USER / ADMIN_PASSWORD környezeti változóból Basic Auth-tal hív.
 * `required: false`: ha a szerver nem érhető el (pl. db:reset futó szerver nélkül), csak figyelmeztet.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function revalidateSite(base = process.env.BASE_URL, { required = true } = {}) {
  if (!base) { if (required) throw new Error("revalidate: nincs megadva a szerver címe (BASE_URL)"); return false; }
  const url = `${base.replace(/\/$/, "")}/api/admin/revalidate`;
  const headers = process.env.ADMIN_PASSWORD ? { authorization: `Basic ${Buffer.from(`${process.env.ADMIN_USER ?? ""}:${process.env.ADMIN_PASSWORD}`).toString("base64")}` } : {};
  let res;
  try { res = await fetch(url, { method: "POST", headers }); }
  catch (e) {
    const msg = `revalidate: a szerver nem érhető el (${url}): ${e instanceof Error ? e.message : e}`;
    if (required) throw new Error(msg);
    console.warn(`(${msg} — a nyilvános lapok gyorsítótára nem frissült)`);
    return false;
  }
  if (!res.ok) {
    const msg = `revalidate: ${url} → HTTP ${res.status} ${(await res.text()).slice(0, 200)}`;
    if (required) throw new Error(msg);
    console.warn(`(${msg})`);
    return false;
  }
  return true;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await revalidateSite(process.env.BASE_URL ?? "http://localhost:3000");
  console.log("A nyilvános lapok a következő kérésnél a tárból épülnek újra.");
}
