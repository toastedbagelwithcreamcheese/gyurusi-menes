import { chromium } from "playwright-core"; import os from "node:os"; import path from "node:path";
const BASE=process.env.BASE_URL;
const exe=path.join(os.homedir(),"Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const b=await chromium.launch({executablePath:exe}); const ctx=await b.newContext({viewport:{width:1440,height:900},locale:"hu-HU",extraHTTPHeaders:{"accept-language":"hu-HU,hu;q=0.9"}}); const p=await ctx.newPage();
const errs=[]; p.on("pageerror",e=>errs.push(String(e).slice(0,160))); p.on("console",m=>{ if(m.type()==="error") errs.push(m.text().slice(0,160)); });
for (const from of ["/turak","/esemenyek"]) {
  await p.goto(BASE+from,{waitUntil:"networkidle"}); await p.evaluate(()=>window.scrollTo(0,600)); await p.waitForTimeout(400);
  const t0=Date.now(); await p.click(".brand");
  const tUrl=await p.waitForURL(u=>new URL(u).pathname==="/",{timeout:60000}).then(()=>Date.now()-t0);
  let tIn=null, tVis=null;
  for (let i=0;i<300;i++){ const s=await p.evaluate(()=>{const h=document.querySelector('.hero'); const l=document.querySelector('.hero-line'); return {in:!!h?.classList.contains('in'), op: l?getComputedStyle(l).opacity:null, vis: l? (l.getBoundingClientRect().height>0 && getComputedStyle(l).visibility!=='hidden' && +getComputedStyle(l).opacity>0.5):false}}); if(tIn===null&&s.in) tIn=Date.now()-t0; if(tVis===null&&s.vis) tVis=Date.now()-t0; if(tIn!==null&&tVis!==null) break; await p.waitForTimeout(100); }
  console.log(`${from} → /: URL ${tUrl} ms | hero.in ${tIn} ms | cím látható ${tVis} ms | scrollY ${await p.evaluate(()=>scrollY)}`);
}
console.log("hibák:", errs.length? errs.join(" | ") : "nincs");
await b.close();
