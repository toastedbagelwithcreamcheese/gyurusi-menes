/**
 * Ellenőrző futtatások a GATES.md-hez. Használat: node scripts/verify.mjs <név>
 * Minden ág csak akkor ír „PASS: <név>"-et, ha minden feltétel teljesült.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const which = process.argv[2];
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const fail = (m) => { console.error("FAIL:", m); process.exit(1); };

if (which === "images") {
  const dir = path.join(ROOT, "public/images/photos");
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".webp"));
  if (files.length < 20) fail(`csak ${files.length} kép`);
  let total = 0;
  for (const f of files) { const s = (await fs.stat(path.join(dir, f))).size; total += s; if (s > 560 * 1024) fail(`${f} túl nagy: ${(s/1024)|0} KB`); }
  if (total > 8 * 1024 * 1024) fail(`összes ${(total/1024/1024).toFixed(1)} MB > 8 MB`);
  const manifest = JSON.parse(await fs.readFile(path.join(ROOT, "src/content/photos.json"), "utf8"));
  for (const k of Object.keys(manifest)) if (!manifest[k].alt || manifest[k].alt.length < 12) fail(`hiányzó/rövid alt: ${k}`);
  console.log(`${files.length} kép, ${(total/1024/1024).toFixed(1)} MB, minden alt megvan`);
  console.log("PASS: images");
}

if (which === "content-no-fabrication") {
  // Tiltott, kitalált tartalom-minták: konkrét árak, alapítási évek, telefonszámok csak a data fájlban engedettek, ott is csak ha a kutatásban igazoltak.
  const site = JSON.parse(await fs.readFile(path.join(ROOT, "data/site.json"), "utf8"));
  const verified = JSON.parse(await fs.readFile(path.join(ROOT, "docs/verified-facts.json"), "utf8"));
  const text = JSON.stringify(site);
  for (const pattern of verified.forbiddenPatterns) {
    const re = new RegExp(pattern, "g");
    const m = text.match(re);
    if (m) fail(`tiltott minta a tartalomban: ${pattern} → ${m.slice(0,3).join(", ")}`);
  }
  for (const must of verified.mustContain) if (!text.includes(must)) fail(`hiányzó igazolt adat: ${must}`);
  console.log("PASS: content-no-fabrication");
}

if (which === "http") {
  const get = (p, init) => fetch(BASE + p, { redirect: "manual", ...init });
  const home = await get("/");
  if (home.status !== 200) fail(`/ → ${home.status}`);
  const html = await home.text();
  for (const needle of ["<title>", 'name="description"', 'property="og:image"', "<h1", 'lang="hu"', "application/ld+json"]) if (!html.includes(needle)) fail(`főoldal: hiányzik ${needle}`);
  if ((html.match(/<h1/g) || []).length !== 1) fail("nem pontosan egy H1");
  for (const p of ["/robots.txt", "/sitemap.xml"]) { const r = await get(p); if (r.status !== 200) fail(`${p} → ${r.status}`); }
  const guarded = !!(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD);
  const adm = await get("/admin"); if (adm.status !== (guarded ? 401 : 200)) fail(`/admin hitelesítés nélkül → ${adm.status} (várt: ${guarded ? 401 : 200})`);
  if (guarded) { const admOk = await get("/admin", { headers: { Authorization: "Basic " + Buffer.from(`${process.env.ADMIN_USER}:${process.env.ADMIN_PASSWORD}`).toString("base64") } }); if (admOk.status !== 200) fail(`/admin hitelesítéssel → ${admOk.status}`); }
  const bad = await get("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "x", email: "nem-email", message: "rövid" }) });
  if (bad.status !== 400) fail(`hibás űrlap → ${bad.status}`);
  const ok = await get("/api/contact", { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": "9.9.9.9" }, body: JSON.stringify({ name: "Teszt Elek", email: "teszt@example.com", message: "Ez egy tesztüzenet a verify scriptből." }) });
  if (ok.status !== 200) fail(`jó űrlap → ${ok.status}`);
  const site = JSON.parse(await fs.readFile(path.join(ROOT, "data/site.json"), "utf8"));
  if (!site.messages.some((m) => m.email === "teszt@example.com")) fail("az üzenet nem került a tárba");
  console.log("PASS: http");
}

if (which === "css-motion") {
  const css = await fs.readFile(path.join(ROOT, "src/app/globals.css"), "utf8");
  const n = (css.match(/prefers-reduced-motion/g) || []).length;
  if (n < 4) fail(`reduced-motion blokkok: ${n}`);
  if (/transition:\s*all/.test(css)) fail("transition: all előfordul");
  console.log("PASS: css-motion");
}
