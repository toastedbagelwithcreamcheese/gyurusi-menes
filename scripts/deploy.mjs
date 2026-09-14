/**
 * Netlify-deploy a helyi titkos .env fájlok NÉLKÜL.
 * A @netlify/plugin-nextjs a szerverfüggvénybe másolja az alkalmazás .env* fájljait — a .env.local-lal a valódi kulcsok
 * (Resend, Supabase service role, admin-jelszó) is a deploy részévé válnának, és élesben minden olyan változó onnan jönne,
 * ami a Netlify-on nincs beállítva. Ezért a build idejére félreteszi őket, utána visszarakja, és ellenőrzi a függvénycsomagot.
 * Élesben a változók kizárólag a Netlify környezeti változóiból jönnek (netlify env:set).
 *
 *   node scripts/deploy.mjs            draft deploy → .netlify/draft.json, .netlify/draft-url.txt
 *   node scripts/deploy.mjs --prod     production deploy → .netlify/prod.json
 * Build előtt ellenőrzi a sharp Linux x64 binárisait is (a képfeltöltés a Netlify-függvényben ezekkel fut): egy `npm uninstall` / `npm prune`
 * kitakarítja őket a node_modules-ból (az npm nem tud róluk) — ilyenkor a scripts/sharp-linux.mjs visszahozza, és ha így sincs meg, nem deployol.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, renameSync, writeFileSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROD = process.argv.includes("--prod");
const HOLD = ".deploy-hold";
const SECRET_FILES = [".env", ".env.local", ".env.production", ".env.production.local", ".env.development.local"];
const FUNC_DIR = path.join(ROOT, ".netlify/functions-internal");

const LINUX_SHARP = ["@img/sharp-linux-x64", "@img/sharp-libvips-linux-x64"];
const linuxSharpOk = () => LINUX_SHARP.every((p) => existsSync(path.join(ROOT, "node_modules", p, "package.json")));
if (!linuxSharpOk()) {
  console.log("a sharp Linux-binárisai hiányoznak a node_modules-ból → scripts/sharp-linux.mjs");
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts/sharp-linux.mjs")], { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0 || !linuxSharpOk()) { console.error("FAIL: deploy — a sharp Linux-binárisai nélkül a képfeltöltés élesben elbukna (sharp.libvipsVersion is not a function)"); process.exit(1); }
}

const stale = readdirSync(ROOT).filter((n) => n.endsWith(HOLD));
if (stale.length) {
  console.error(`FAIL: deploy — egy korábbi, megszakadt deploy félretett fájlja maradt: ${stale.join(", ")}. Nevezd vissza (a ${HOLD} végződés nélkül), és indítsd újra.`);
  process.exit(1);
}
const held = SECRET_FILES.filter((f) => existsSync(path.join(ROOT, f)));
const restore = () => { for (const f of held) { const from = path.join(ROOT, f + HOLD); if (existsSync(from)) renameSync(from, path.join(ROOT, f)); } };
for (const f of held) renameSync(path.join(ROOT, f), path.join(ROOT, f + HOLD));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restore(); process.exit(130); });
console.log(`félretéve a build idejére: ${held.join(", ") || "(nincs)"}`);

const out = path.join(ROOT, ".netlify", PROD ? "prod.json" : "draft.json");
let code = 1;
try {
  code = await new Promise((resolve) => {
    const child = spawn("netlify", ["deploy", "--build", "--json", ...(PROD ? ["--prod"] : [])], { cwd: ROOT, stdio: ["ignore", "pipe", "inherit"] });
    let json = ""; child.stdout.on("data", (d) => { json += d; });
    child.on("close", (c) => { writeFileSync(out, json); resolve(c ?? 1); });
  });
} finally {
  restore();
}
console.log(`visszatéve: ${held.join(", ") || "(nincs)"}`);

/* A függvénycsomagban nem lehet .env fájl. */
const leaked = [];
const walk = (d, depth = 0) => {
  if (!existsSync(d) || depth > 3) return;
  for (const n of readdirSync(d)) {
    const p = path.join(d, n);
    if (/^\.env(\.|$)/.test(n) && n !== ".env.example") leaked.push(path.relative(ROOT, p));
    else if (statSync(p).isDirectory() && n !== "node_modules") walk(p, depth + 1);
  }
};
walk(FUNC_DIR);
if (code !== 0) { console.error(`FAIL: deploy — a netlify deploy ${code} kóddal állt le (részletek: ${path.relative(ROOT, out)})`); process.exit(1); }
if (leaked.length) { console.error(`FAIL: deploy — .env fájl került a függvénycsomagba: ${leaked.join(", ")}`); process.exit(1); }
const j = JSON.parse(readFileSync(out, "utf8"));
if (!PROD) writeFileSync(path.join(ROOT, ".netlify/draft-url.txt"), `${j.deploy_url}\n`);
console.log(`PASS: deploy — ${PROD ? "production" : "draft"} ${j.deploy_id} ${PROD ? j.url : j.deploy_url}; a függvénycsomagban nincs .env fájl`);
