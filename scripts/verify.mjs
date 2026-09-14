/**
 * Ellenőrző futtatások a GATES.md-hez. Használat: node scripts/verify.mjs <név>
 * Minden ág csak akkor ír „PASS: <név>"-et, ha minden feltétel teljesült.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import os from "node:os";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const which = process.argv[2];
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const fail = (m) => { console.error("FAIL:", m); process.exit(1); };
const readJson = async (p) => JSON.parse(await fs.readFile(path.join(ROOT, p), "utf8"));

if (which === "images") {
  const dir = path.join(ROOT, "public/images/photos");
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".webp"));
  if (files.length < 20) fail(`csak ${files.length} kép`);
  let total = 0;
  for (const f of files) { const s = (await fs.stat(path.join(dir, f))).size; total += s; if (s > 560 * 1024) fail(`${f} túl nagy: ${(s/1024)|0} KB`); }
  if (total > 8 * 1024 * 1024) fail(`összes ${(total/1024/1024).toFixed(1)} MB > 8 MB`);
  const manifest = await readJson("src/content/photos.json");
  for (const k of Object.keys(manifest)) if (!manifest[k].alt || manifest[k].alt.length < 12) fail(`hiányzó/rövid alt: ${k}`);
  const site = await readJson("data/seed.json");
  const ids = new Set([...Object.keys(manifest), ...site.uploads.map((u) => u.id)]);
  const used = [site.hero.image, site.owner.image, ...Object.values(site.pages).flatMap((p) => p.images), ...site.events.map((e) => e.image)].filter(Boolean);
  for (const id of used) if (!ids.has(id)) fail(`a tartalom nem létező képre hivatkozik: ${id}`);
  console.log(`${files.length} kép, ${(total/1024/1024).toFixed(1)} MB, minden alt megvan, ${used.length} hivatkozás érvényes`);
  console.log("PASS: images");
}

if (which === "content-no-fabrication") {
  const site = await readJson("data/seed.json");
  const verified = await readJson("docs/verified-facts.json");
  const text = JSON.stringify(site);
  for (const pattern of verified.forbiddenPatterns) {
    const m = text.match(new RegExp(pattern, "g"));
    if (m) fail(`tiltott minta a tartalomban: ${pattern} → ${m.slice(0, 3).join(", ")}`);
  }
  for (const must of verified.mustContain) if (!text.includes(must)) fail(`hiányzó igazolt adat: ${must}`);
  /* A tulajdonos telefonszáma és e-mailje NEM igazolt adat: amíg az ügyféltől meg nem kapjuk, üresen kell állnia. */
  if (site.owner.phone && !verified.ownerPhone) fail(`a tulajdonos telefonszáma ki van töltve (${site.owner.phone}), de a docs/verified-facts.json nem igazolja (ownerPhone)`);
  if (site.owner.email && !verified.ownerEmail) fail(`a tulajdonos e-mailje ki van töltve, de nincs igazolva (ownerEmail)`);
  if (site.owner.name !== "Vörös József") fail("a tulajdonos neve nem Vörös József");
  console.log("PASS: content-no-fabrication");
}

if (which === "i18n") {
  const site = await readJson("data/seed.json");
  let n = 0; const missing = [];
  const walk = (v, p) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const keys = Object.keys(v);
      if (keys.length === 3 && keys.includes("hu") && keys.includes("en") && keys.includes("de")) {
        n++; for (const l of ["hu", "en", "de"]) if (typeof v[l] !== "string" || !v[l].trim()) missing.push(`${p}.${l}`);
        return;
      }
      for (const k of keys) walk(v[k], `${p}.${k}`);
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
  };
  walk(site, "site");
  if (missing.length) fail(`üres nyelvi mezők: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? ` (+${missing.length - 8})` : ""}`);
  for (const f of ["en", "de"]) {
    const src = await fs.readFile(path.join(ROOT, `src/content/${f}.ts`), "utf8");
    const empties = src.match(/:\s*(""|'')/g);
    if (empties) fail(`üres szöveg a ${f}.ts szótárban (${empties.length} db)`);
  }
  console.log(`${n} háromnyelvű mező, mind kitöltve; a szótárakban nincs üres érték`);
  console.log("PASS: i18n");
}

if (which === "css-motion") {
  const css = await fs.readFile(path.join(ROOT, "src/app/globals.css"), "utf8");
  if (/transition:\s*all\b/.test(css)) fail("transition: all a CSS-ben");
  if (!css.includes("prefers-reduced-motion")) fail("nincs prefers-reduced-motion");
  /* Osztály-lefedettség: az új komponensek osztályai tényleg ott vannak (egy rossz blokk-csere levághatja a fájl végét). */
  const required = [".map-ph", ".hdr-pill", ".hero-line", ".sub-contact", ".grain", ".lang ", ".owner-grid", ".tiles", ".tile-card", ".ev-feat", ".evc", ".reg-grid", ".rep-year", ".sub-strip", ".contact-card", ".breed-strip", ".mnav", ".dock", ".sub-hero", ".zoom", ".route-map", ".sub-form", ".ev-grid", ".ftr2", ".legal-dl"];
  for (const c of required) if (!css.includes(c)) fail(`hiányzó osztály a globals.css-ből: ${c}`);
  for (const gone of [".lb ", ".gal ", ".marquee"]) if (css.includes(gone)) fail(`ott maradt a kivett blokk: ${gone}`);
  console.log(`${required.length} kötelező osztály megvan, a galéria/marquee CSS ki`);
  console.log("PASS: css-motion");
}

if (which === "no-gallery") {
  const bad = [];
  const scan = async (dir) => {
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (/galeria|hirek|programok/.test(e.name)) bad.push(`útvonal: ${path.relative(ROOT, p)}`); await scan(p); }
      else if (/\.(tsx?|css)$/.test(e.name)) { const s = await fs.readFile(p, "utf8"); if (/Lightbox|Marquee|from "\.\/Lightbox"|id="galeria"/.test(s)) bad.push(`hivatkozás: ${path.relative(ROOT, p)}`); }
    }
  };
  await scan(path.join(ROOT, "src"));
  const site = await readJson("data/seed.json");
  if ("gallery" in site || "news" in site || "programs" in site) bad.push("site.json: gallery/news/programs kulcs");
  if (bad.length) fail(bad.join("; "));
  console.log("PASS: no-gallery");
}

if (which === "http") {
  const get = (p, init) => fetch(BASE + p, { redirect: "manual", ...init });
  const must = (html, needles, where) => { for (const n of needles) if (!html.includes(n)) fail(`${where}: hiányzik ${n}`); };
  const ownerFirst = (html, where) => {
    const f = html.indexOf("<footer"); const foot = f >= 0 ? html.slice(f) : "";
    const a = foot.indexOf("Vörös József"), b = foot.indexOf("Varga-Kovács Emese");
    if (a < 0 || b < 0 || a > b) fail(`${where}: a láblécben nem a tulajdonos áll elöl (Vörös=${a}, Emese=${b})`);
  };

  /* Főoldal, három nyelven */
  for (const [p, lang] of [["/", "hu"], ["/en", "en"], ["/de", "de"]]) {
    const r = await get(p); if (r.status !== 200) fail(`${p} → ${r.status}`);
    const html = await r.text();
    must(html, ["<title>", 'name="description"', 'property="og:image"', "<h1", `lang="${lang}"`, "application/ld+json", 'data-owner', 'id="kapcsolat"'], p);
    if (!/hreflang="de"/i.test(html) || !/hreflang="x-default"/i.test(html)) fail(`${p}: hiányzik a hreflang de / x-default`);
    if ((html.match(/<h1/g) || []).length !== 1) fail(`${p}: nem pontosan egy H1`);
    if (html.includes('id="galeria"')) fail(`${p}: van galéria`);
    const k = html.indexOf('id="kapcsolat"'); const sec = html.slice(k);
    if (sec.indexOf("Vörös József") > sec.indexOf("Varga-Kovács Emese")) fail(`${p}: a kapcsolat szekcióban nem a tulajdonos áll elöl`);
    ownerFirst(html, p);
    for (const key of ["huculosveny", "turak", "oktatas", "taborok", "egyesulet"]) if (!html.includes(`href="${lang === "hu" ? "" : "/" + lang}/${key}"`)) fail(`${p}: nincs link a(z) /${key} aloldalra`);
  }
  /* Nyelvi útválasztás */
  const hu = await get("/hu"); if (hu.status !== 308 || !/\/$/.test(hu.headers.get("location") ?? "")) fail(`/hu → ${hu.status} ${hu.headers.get("location")}`);
  const de = await get("/", { headers: { "accept-language": "de-DE,de;q=0.9,en;q=0.5" } }); if (de.status !== 302 || !(de.headers.get("location") ?? "").endsWith("/de")) fail(`Accept-Language: de → ${de.status} ${de.headers.get("location")}`);
  const deTur = await get("/turak", { headers: { "accept-language": "de" } }); if (deTur.status !== 302 || !(deTur.headers.get("location") ?? "").endsWith("/de/turak")) fail(`/turak + de → ${deTur.status} ${deTur.headers.get("location")}`);
  const bot = await get("/", { headers: { "accept-language": "de", "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" } }); if (bot.status !== 200) fail(`robot + de → ${bot.status}`);
  const ck = await get("/", { headers: { cookie: "lang=en" } }); if (ck.status !== 302 || !(ck.headers.get("location") ?? "").endsWith("/en")) fail(`süti en → ${ck.status}`);
  /* Aloldalak ×3 nyelv: saját kapcsolati blokk, egy H1 */
  for (const key of ["huculosveny", "turak", "oktatas", "taborok", "egyesulet"]) for (const l of ["", "/en", "/de"]) {
    const r = await get(`${l}/${key}`); if (r.status !== 200) fail(`${l}/${key} → ${r.status}`);
    const html = await r.text();
    must(html, ['data-page-contact="true"', "<h1", "sub-strip"], `${l}/${key}`);
    if ((html.match(/<h1/g) || []).length !== 1) fail(`${l}/${key}: nem pontosan egy H1`);
    ownerFirst(html, `${l}/${key}`);
    if (key === "egyesulet" && !html.includes("data-reports")) fail(`${l}/egyesulet: nincs beszámoló-blokk`);
    if (key === "taborok" && !html.includes("gyurus.lovastabor@gmail.com")) fail(`${l}/taborok: nem a tábor saját e-mailje áll a kapcsolatnál`);
    must(html, ['data-page-form', 'data-contact-form="' + key + '"', 'data-zoom="0"', 'data-footer', 'data-credit'], `${l}/${key}`);
    if (key === "turak" && !html.includes("data-route-map")) fail(`${l}/turak: nincs útvonaltérkép`);
  }
  /* Jogi oldalak, lábléc-hivatkozásokkal */
  for (const p of ["/adatkezeles", "/impresszum", "/de/impresszum"]) { const r = await get(p); if (r.status !== 200) fail(`${p} → ${r.status}`); }
  const homeHtml = await (await get("/")).text();
  must(homeHtml, ['href="/adatkezeles"', 'href="/impresszum"', "+36 30 872 3777", "data-tiles", "data-featured-event", 'data-map="idle"'], "/ lábléc + csempék + kiemelt esemény + térkép");
  if (homeHtml.includes("maps.google.com/maps?q")) fail("a Google-térkép iframe automatikusan betöltődik (kattintás nélkül)");
  /* Események */
  for (const l of ["", "/en", "/de"]) { const r = await get(`${l}/esemenyek`); if (r.status !== 200) fail(`${l}/esemenyek → ${r.status}`); }
  const ev = await get("/esemenyek/lovasnapok-2026"); if (ev.status !== 200) fail(`/esemenyek/lovasnapok-2026 → ${ev.status}`);
  const evDe = await get("/de/esemenyek/lovasnapok-2026"); if (evDe.status !== 200 || !(await evDe.text()).includes("9. Reitertage")) fail("német eseményoldal nem német");
  /* 404, fájlok, robots, sitemap */
  const nf = await get("/ilyen-nincs"); if (nf.status !== 404) fail(`/ilyen-nincs → ${nf.status}`);
  const nfDe = await get("/de/ilyen-nincs"); if (nfDe.status !== 404) fail(`/de/ilyen-nincs → ${nfDe.status}`);
  const nofile = await get("/files/nincs-ilyen.webp"); if (nofile.status !== 404) fail(`/files/nincs → ${nofile.status}`);
  for (const p of ["/robots.txt", "/sitemap.xml"]) { const r = await get(p); if (r.status !== 200) fail(`${p} → ${r.status}`); }
  const sm = await (await get("/sitemap.xml")).text(); must(sm, ["/en/turak", "/de/esemenyek", "/egyesulet"], "sitemap");
  /* Admin (a demón jelszó nélkül; ADMIN_USER+ADMIN_PASSWORD esetén 401 → 200) */
  const guarded = !!(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD);
  const auth = guarded ? { headers: { Authorization: "Basic " + Buffer.from(`${process.env.ADMIN_USER}:${process.env.ADMIN_PASSWORD}`).toString("base64") } } : {};
  const adm0 = await get("/admin"); if (adm0.status !== (guarded ? 401 : 200)) fail(`/admin → ${adm0.status}`);
  for (const p of ["/admin", "/admin/tartalom", "/admin/oldalak", "/admin/oldalak/turak", "/admin/esemenyek", "/admin/esemenyek/uj", "/admin/jelentkezesek", "/admin/beszamolok", "/admin/kepek", "/admin/uzenetek"]) {
    const r = await get(p, auth); if (r.status !== 200) fail(`${p} → ${r.status}`);
  }
  /* API: kapcsolat + jelentkezés validálás */
  const J = (body, extra = {}) => ({ method: "POST", headers: { "Content-Type": "application/json", ...extra }, body: JSON.stringify(body) });
  const bad = await get("/api/contact", J({ name: "x", email: "nem-email", message: "rövid" })); if (bad.status !== 400) fail(`hibás űrlap → ${bad.status}`);
  const ok = await get("/api/contact", J({ name: "Teszt Elek", email: "teszt@example.com", message: "Ez egy tesztüzenet a verify scriptből." }, { "x-forwarded-for": "9.9.9.9" })); if (ok.status !== 200) fail(`jó űrlap → ${ok.status}`);
  const r1 = await get("/api/register", J({ eventId: "lovasnapok-2026", name: "x", phone: "1", count: "0" })); if (r1.status !== 400) fail(`hibás jelentkezés → ${r1.status}`);
  const r2 = await get("/api/register", J({ eventId: "lovasnapok-2026", name: "Teszt Elek", phone: "+36 30 123 4567", count: "2", lang: "de" }, { "x-forwarded-for": "8.8.8.8" }));
  if (r2.status !== 400 || !(await r2.json()).error.includes("keine Anmeldung")) fail(`lezárult eseményre jelentkezés → ${r2.status} (német hibaüzenet várt)`);
  if (!BASE.includes("localhost")) { console.log("PASS: http"); process.exit(0); }
  /* Az üzenetek rekordonként külön fájlban élnek: data/messages/<id>.json (a szerver DATA_DIR-je alatt, ha az be van állítva). */
  const msgDir = path.join(process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data"), "messages");
  const testMsgs = [];
  for (const f of (await fs.readdir(msgDir).catch(() => [])).filter((n) => n.endsWith(".json"))) {
    const m = JSON.parse(await fs.readFile(path.join(msgDir, f), "utf8"));
    if (m.email === "teszt@example.com") testMsgs.push(f);
  }
  if (!testMsgs.length) fail("az üzenet nem került a tárba (data/messages)");
  /* A tesztüzenet ne maradjon a helyi adatbázisban. */
  for (const f of testMsgs) await fs.rm(path.join(msgDir, f), { force: true });
  console.log("PASS: http");
}

if (which === "lighthouse") {
  const out = path.join(os.tmpdir(), "gyurusi-lighthouse.json");
  const chrome = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const r = spawnSync("npx", ["--yes", "lighthouse@13", BASE + "/", "--output=json", `--output-path=${out}`, "--only-categories=performance,accessibility", "--form-factor=mobile", "--screenEmulation.mobile", "--throttling-method=simulate", "--quiet", `--chrome-flags=--headless=new --no-sandbox --disable-gpu`],
    { cwd: ROOT, env: { ...process.env, CHROME_PATH: chrome }, stdio: ["ignore", "inherit", "inherit"], timeout: 300_000 });
  if (r.status !== 0) fail(`lighthouse kilépési kód ${r.status}`);
  const lh = JSON.parse(await fs.readFile(out, "utf8"));
  const perf = Math.round(lh.categories.performance.score * 100), a11y = Math.round(lh.categories.accessibility.score * 100);
  const lcp = lh.audits["largest-contentful-paint"]?.numericValue;
  console.log(`Performance ${perf}, Accessibility ${a11y}, LCP ${lcp ? (lcp / 1000).toFixed(2) + " s" : "?"}`);
  if (perf < 85) fail(`Performance ${perf} < 85`);
  if (a11y < 95) fail(`Accessibility ${a11y} < 95`);
  console.log("PASS: lighthouse");
}
