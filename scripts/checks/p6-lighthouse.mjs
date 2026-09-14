/**
 * Lighthouse SEO-kategória (mobil) a főoldalon és egy aloldalon — a P6 fázis 10. pontja, az eredmény a docs/gates/p6.md-be kerül.
 * Használat: PORT=3051 node scripts/with-server.mjs node scripts/checks/p6-lighthouse.mjs
 * LH_PATHS=/,/turak,/en/esemenyek formában más lapok is mérhetők. PASS csak akkor, ha minden mért lap 100.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { BASE, ROOT, report } from "./p6-lib.mjs";

const chrome = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const problems = [], lines = [];
for (const p of (process.env.LH_PATHS ?? "/,/turak").split(",")) {
  const out = path.join(os.tmpdir(), `p6-lighthouse${p.replace(/\W+/g, "-")}.json`);
  const r = spawnSync("npx", ["--yes", "lighthouse@13", BASE + p, "--output=json", `--output-path=${out}`, "--only-categories=seo", "--form-factor=mobile", "--screenEmulation.mobile", "--quiet", "--chrome-flags=--headless=new --no-sandbox --disable-gpu"],
    { cwd: ROOT, env: { ...process.env, CHROME_PATH: chrome }, stdio: ["ignore", "inherit", "inherit"], timeout: 300_000 });
  if (r.status !== 0) { problems.push(`${p}: a lighthouse kilépési kódja ${r.status}`); continue; }
  const lh = JSON.parse(await fs.readFile(out, "utf8"));
  const score = Math.round(lh.categories.seo.score * 100);
  const weighted = new Set(lh.categories.seo.auditRefs.filter((a) => a.weight > 0).map((a) => a.id));
  const failed = Object.values(lh.audits).filter((a) => weighted.has(a.id) && a.score !== null && a.score < 1).map((a) => a.id);
  lines.push(`${p}: SEO ${score}${failed.length ? ` (bukott: ${failed.join(", ")})` : ""} · Lighthouse ${lh.lighthouseVersion} · ${lh.fetchTime}`);
  if (score < 100) problems.push(`${p}: SEO ${score} < 100 — ${failed.join(", ")}`);
}
report("p6-lighthouse", problems, lines.join("\n"));
