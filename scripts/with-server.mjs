/**
 * Egy parancs futtatása friss `next start` mellett a 3012-es porton: a kapuk így nem függnek attól,
 * hogy fut-e (és melyik buildet adja) egy korábban indított szerver. Használat:
 *   node scripts/with-server.mjs node scripts/verify.mjs http
 */
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.env.PORT ?? "3012";
spawnSync("sh", ["-c", `lsof -ti tcp:${PORT} -sTCP:LISTEN | xargs kill -9 2>/dev/null`], { stdio: "ignore" });
/* Jelszó nélkül a production build admin-ja zárva (src/lib/admin-auth.ts, fail-closed): a helyi kapuk a nyitott demót kifejezetten
   kérik (ADMIN_OPEN_DEMO=1). Jelszavas próbánál (ADMIN_PASSWORD) ez hatástalan; ADMIN_OPEN_DEMO=0-val a zárt viselkedés is kipróbálható. */
/* A next start magától betölti a .env.local-t — abban valódi kulcsok lehetnek (Resend, Supabase, Google, admin-jelszó). A próbaszerver
   ezeket CSAK akkor kapja meg, ha a hívó kifejezetten beállította: különben egy helyi teszt valódi e-mailt küldene az info@-ra,
   vagy az éles adatbázisba írna. Az üres érték a Next szerint „be van állítva”, ezért a .env.local nem írja felül. */
const ISOLATED = ["RESEND_API_KEY", "RESEND_API_BASE", "RESEND_API_URL", "CONTACT_TO", "CONTACT_FROM", "GOOGLE_PLACES_KEY", "GOOGLE_PLACE_ID",
  "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY", "SUPABASE_PROJECT_ID", "ADMIN_USER", "ADMIN_PASSWORD"];
const isolated = Object.fromEntries(ISOLATED.filter((k) => !(k in process.env)).map((k) => [k, ""]));
const srv = spawn("npx", ["next", "start", "-p", PORT], { cwd: ROOT, env: { ...isolated, ...process.env, ADMIN_OPEN_DEMO: process.env.ADMIN_OPEN_DEMO ?? "1", PORT }, stdio: ["ignore", "ignore", "inherit"] });
const url = `http://localhost:${PORT}/`;
for (let i = 0; i < 120; i++) { try { const r = await fetch(url, { redirect: "manual" }); if (r.status < 500) break; } catch { /* még indul */ } await new Promise((r) => setTimeout(r, 500)); }
/* P7: a nyilvános lapok ISR-en futnak, és a Next a renderelt lapot a (közös) .next könyvtárba is kiírja — egy korábbi futás, más
   adatbázissal renderelt lapja ne jöjjön: induláskor minden nyilvános lap érvénytelen, az első kérés a mostani tárból renderel. */
{ const { revalidateSite } = await import("./revalidate.mjs"); await revalidateSite(`http://localhost:${PORT}`); }
const [cmd, ...args] = process.argv.slice(2);
const run = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit", env: { ...process.env, BASE_URL: `http://localhost:${PORT}` } });
srv.kill("SIGTERM"); spawnSync("sh", ["-c", `lsof -ti tcp:${PORT} -sTCP:LISTEN | xargs kill -9 2>/dev/null`], { stdio: "ignore" });
process.exit(run.status ?? 1);
