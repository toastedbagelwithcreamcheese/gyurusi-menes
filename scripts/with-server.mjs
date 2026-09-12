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
const srv = spawn("npx", ["next", "start", "-p", PORT], { cwd: ROOT, env: { ...process.env, PORT }, stdio: ["ignore", "ignore", "inherit"] });
const url = `http://localhost:${PORT}/`;
for (let i = 0; i < 120; i++) { try { const r = await fetch(url, { redirect: "manual" }); if (r.status < 500) break; } catch { /* még indul */ } await new Promise((r) => setTimeout(r, 500)); }
const [cmd, ...args] = process.argv.slice(2);
const run = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit", env: { ...process.env, BASE_URL: `http://localhost:${PORT}` } });
srv.kill("SIGTERM"); spawnSync("sh", ["-c", `lsof -ti tcp:${PORT} -sTCP:LISTEN | xargs kill -9 2>/dev/null`], { stdio: "ignore" });
process.exit(run.status ?? 1);
