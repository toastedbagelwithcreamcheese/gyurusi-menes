/**
 * Helyi Resend-mock az e-mail-próbákhoz (scripts/checks/p5-mail.mjs). Nincs függősége, nem küld semmit.
 *
 * Importálva:  const m = await startMockResend({ port: 0, status: 200, out: "levelek.json" });
 *              m.url · m.mails() · m.clear() · m.setStatus(500) · await m.close()
 * Önállóan:    node scripts/mock-resend.mjs [--port 4010] [--status 200] [--out data/mock-mails.json]
 *              majd RESEND_API_KEY=teszt RESEND_API_BASE=http://127.0.0.1:4010 npm start
 *
 * Végpontok:
 *   POST   /emails     — a Resend „send email” hívása; a választ a beállított kód adja (2xx: { id }, más: hibaüzenet)
 *   GET    /__mails    — minden beérkezett próbálkozás: { at, status, auth, body }
 *   DELETE /__mails    — a gyűjtés ürítése
 *   POST   /__status   — { "status": 500 } → a következő válaszok kódja (a hibaágak próbájához)
 * Minden próbálkozás a gyűjtésbe kerül (a sikertelen is, a válaszkódjával), és ha van `out`, JSON-fájlba is.
 */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function startMockResend({ port = 0, status = 200, out } = {}) {
  let code = status;
  let seq = 0;
  const mails = [];
  const persist = async () => { if (out) { await fs.mkdir(path.dirname(out), { recursive: true }); await fs.writeFile(out, JSON.stringify(mails, null, 2)); } };
  const readBody = (req) => new Promise((resolve) => { let s = ""; req.setEncoding("utf8"); req.on("data", (c) => (s += c)); req.on("end", () => resolve(s)); });
  const json = (res, st, obj) => { res.writeHead(st, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://mock");
    if (req.method === "POST" && url.pathname === "/emails") {
      const raw = await readBody(req);
      let body = null; try { body = JSON.parse(raw); } catch { /* hibás JSON — alább 422 */ }
      const auth = req.headers.authorization ?? "";
      /* Ahogy a valódi szolgáltató: kulcs nélkül 401, hiányos levélre 422 — a beállított hibakód ezek után jön. */
      let st = code;
      if (!/^Bearer \S+/.test(auth)) st = 401;
      else if (!body || !body.from || !body.subject || !Array.isArray(body.to) || body.to.length === 0) st = 422;
      mails.push({ at: new Date().toISOString(), status: st, auth, body: body ?? raw });
      await persist();
      if (st >= 200 && st < 300) return json(res, st, { id: `mock-${++seq}` });
      return json(res, st, { statusCode: st, name: "mock_error", message: `A mock ${st}-es kódot adott` });
    }
    if (url.pathname === "/__mails" && req.method === "GET") return json(res, 200, mails);
    if (url.pathname === "/__mails" && req.method === "DELETE") { mails.length = 0; await persist(); return json(res, 200, { ok: true }); }
    if (url.pathname === "/__status" && req.method === "POST") {
      try { const n = Number(JSON.parse(await readBody(req)).status); if (Number.isInteger(n) && n >= 100 && n <= 599) { code = n; return json(res, 200, { status: code }); } } catch { /* alább 400 */ }
      return json(res, 400, { error: "status: 100–599 közötti egész kell" });
    }
    json(res, 404, { error: "ismeretlen végpont" });
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  const actual = server.address().port;
  return {
    port: actual,
    url: `http://127.0.0.1:${actual}`,
    mails: () => structuredClone(mails),
    clear: () => { mails.length = 0; },
    setStatus: (n) => { code = n; },
    close: () => new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); }),
  };
}

/* Önálló futtatás */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : def; };
  const m = await startMockResend({ port: Number(arg("port", "4010")), status: Number(arg("status", "200")), out: arg("out") && path.resolve(arg("out")) });
  console.log(`Resend-mock: ${m.url}  (RESEND_API_BASE=${m.url})`);
}
