import { chromium } from "playwright-core"; import os from "node:os"; import path from "node:path";
const BASE=process.env.BASE_URL;
const exe=path.join(os.homedir(),"Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const b=await chromium.launch({executablePath:exe}); const ctx=await b.newContext({viewport:{width:1440,height:900},locale:"hu-HU",extraHTTPHeaders:{"accept-language":"hu-HU,hu;q=0.9"}}); const p=await ctx.newPage();
const reqs=[]; p.on("response",r=>{ const u=new URL(r.url()); if(u.origin===new URL(BASE).origin && (u.searchParams.has("_rsc")||u.pathname==="/")) reqs.push(`${r.status()} ${u.pathname}${u.search.slice(0,12)}`); });
for (let i=0;i<2;i++){ await p.goto(BASE+"/turak",{waitUntil:"networkidle"}); reqs.length=0; const t0=Date.now(); await p.click(".brand"); await p.waitForURL(u=>new URL(u).pathname==="/",{timeout:60000}); await p.waitForSelector("#top",{timeout:60000}); console.log(`logó → főoldal #${i+1}:`, Date.now()-t0, "ms |", reqs.slice(0,8).join(" → ")); }
await b.close();
