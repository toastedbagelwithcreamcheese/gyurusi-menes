/**
 * A sharp Linux x64 binárisai a Netlify-függvényekhez. A build macOS-en fut, a függvény Linuxon;
 * az npm egyszerre csak az aktuális platform csomagját tartja, ezért a két Linux-csomagot
 * `npm pack`-kel (platformfüggetlen letöltés) húzzuk le és csomagoljuk ki a node_modules/@img alá.
 * postinstall-ként fut, idempotens; a verziók a telepített sharp optionalDependencies-éből jönnek.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SIDE = path.join(ROOT, ".sharp-linux");
const PKGS = ["@img/sharp-linux-x64", "@img/sharp-libvips-linux-x64"];
const dst = (p) => path.join(ROOT, "node_modules", p);
if (PKGS.every((p) => fs.existsSync(path.join(dst(p), "package.json")))) { console.log("[sharp-linux] már megvan"); process.exit(0); }
const sharpPkg = JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules/sharp/package.json"), "utf8"));
fs.rmSync(SIDE, { recursive: true, force: true }); fs.mkdirSync(SIDE, { recursive: true });
for (const p of PKGS) {
  const ver = sharpPkg.optionalDependencies?.[p]; if (!ver) { console.error("[sharp-linux] nincs verzió:", p); process.exit(1); }
  const r = spawnSync("npm", ["pack", `${p}@${ver}`, "--pack-destination", SIDE, "--silent"], { cwd: SIDE, encoding: "utf8" });
  if (r.status !== 0) { console.error("[sharp-linux] npm pack hiba:", p, r.stderr); process.exit(1); }
  const tgz = fs.readdirSync(SIDE).find((f) => f.startsWith(p.replace("@", "").replace("/", "-")) && f.endsWith(".tgz"));
  const out = path.join(SIDE, "x", p); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const t = spawnSync("tar", ["-xzf", path.join(SIDE, tgz), "-C", out, "--strip-components=1"], { encoding: "utf8" });
  if (t.status !== 0) { console.error("[sharp-linux] tar hiba:", t.stderr); process.exit(1); }
  fs.rmSync(dst(p), { recursive: true, force: true }); fs.cpSync(out, dst(p), { recursive: true });
  console.log("[sharp-linux] bemásolva:", p, ver);
}
fs.rmSync(SIDE, { recursive: true, force: true }); /* az oldalsó mappa ne maradjon a repóban (lint, git) */
