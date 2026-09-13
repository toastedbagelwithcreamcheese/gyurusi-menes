import { chromium } from "playwright-core";
import os from "node:os"; import path from "node:path";
const BASE="http://localhost:3012"; const OUT=process.argv[2];
const exe=path.join(os.homedir(),"Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const b=await chromium.launch({executablePath:exe});
const pages=[["/","home"],["/turak","turak"],["/esemenyek","esemenyek"],["/esemenyek/oszi-lovastura-2026-09-19","esemeny"],["/impresszum","impresszum"],["/admin/jogi","admin-jogi"]];
const report=[];
for (const [w,h,tag] of [[1440,900,"d"],[390,844,"m"]]) {
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,locale:"hu-HU"}); const p=await ctx.newPage();
  const errs=[]; p.on("console",m=>{ if(m.type()==="error") errs.push(m.text()); }); p.on("pageerror",e=>errs.push(String(e)));
  for (const [u,name] of pages) {
    await p.goto(BASE+u,{waitUntil:"networkidle"});
    // minden Reveal betöltése: végiggörgetünk
    await p.evaluate(async()=>{ for(let y=0;y<document.body.scrollHeight;y+=600){ window.scrollTo(0,y); await new Promise(r=>setTimeout(r,150)); } window.scrollTo(0,0); await new Promise(r=>setTimeout(r,700)); });
    const sw=await p.evaluate(()=>[document.documentElement.scrollWidth, window.innerWidth]);
    await p.screenshot({path:`${OUT}/${tag}-${name}.png`, fullPage: name!=="home"||tag==="m"});
    report.push(`${tag} ${u}: scrollWidth ${sw[0]}/${sw[1]}${sw[0]>sw[1]?"  ← VÍZSZINTES GÖRGETÉS":""}`);
  }
  if (tag==="m") { await p.goto(BASE+"/turak",{waitUntil:"networkidle"}); await p.click(".burger"); await p.waitForTimeout(900); await p.screenshot({path:`${OUT}/m-menu.png`}); }
  report.push(`${tag} konzol-hibák: ${errs.length}${errs.length?"\n   "+errs.slice(0,5).join("\n   "):""}`);
  await ctx.close();
}
await b.close(); console.log(report.join("\n"));
