import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true,chromiumSandbox:true});
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4175/study-journal/';
const report={base,frames:[],devices:[],passed:false};
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport,reducedMotion:'no-preference'});const page=await context.newPage();
  await page.goto(base);await page.waitForFunction(()=>document.querySelector('.scroll-story')?.dataset.ready==='true');
  await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
  const seek=async progress=>{await page.evaluate(p=>{const r=document.querySelector('.scroll-story'),s=r.querySelector('.story-stage');scrollTo({top:r.getBoundingClientRect().top+scrollY-document.querySelector('.site-header').offsetHeight+(r.offsetHeight-s.offsetHeight)*p,behavior:'instant'});},progress);await page.waitForFunction(p=>Math.abs(Number(document.querySelector('.scroll-story').dataset.progress)-p)<.002,progress);};
  for(const progress of [0,.4,.46,.51,.56,.61,.66,.73,.81,.9,1]){
   await seek(progress);const name=`passage-${viewport.width}-${String(Math.round(progress*100)).padStart(3,'0')}.png`;await page.screenshot({path:new URL('./screenshots/'+name,import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
   const state=await page.evaluate(()=>{const r=document.querySelector('.scroll-story'),s=r.querySelector('.story-stage');return{progress:Number(r.dataset.progress),gateOpen:Number(s.style.getPropertyValue('--gate-open')),cameraScale:Number(s.style.getPropertyValue('--depth-1')),image:document.querySelector('.space-landscape img').currentSrc,scrollY};});
   report.frames.push({viewport,...state,screenshot:name});
  }
  // A series of ordinary 120px wheel steps must expose multiple opening states.
  await seek(.46);const openings=[];for(let i=0;i<8;i++){await page.mouse.wheel(0,120);await page.waitForTimeout(180);openings.push(await page.evaluate(()=>Number(document.querySelector('.story-stage').style.getPropertyValue('--gate-open'))));}
  assert.ok(new Set(openings.map(n=>n.toFixed(2))).size>=5);
  await seek(.18);await page.mouse.wheel(0,2200);await page.waitForTimeout(350);await page.mouse.wheel(0,-1700);await page.waitForTimeout(350);
  const consistent=await page.evaluate(()=>{const r=document.querySelector('.scroll-story'),s=r.querySelector('.story-stage'),head=document.querySelector('.site-header').offsetHeight;const p=Math.max(0,Math.min(1,(scrollY-(r.getBoundingClientRect().top+scrollY-head))/(r.offsetHeight-s.offsetHeight)));return Math.abs(Number(r.dataset.progress)-p)<.002;});assert.ok(consistent);
  report.devices.push({viewport,openingWheelStates:openings,fastReverseConsistent:consistent});await context.close();
 }
 report.passed=true;
}finally{await browser.close();await writeFile(process.env.QA_PASSAGE_REPORT_PATH||new URL('./passage-results.json',import.meta.url),JSON.stringify(report,null,2));}
console.log(JSON.stringify({passed:report.passed,frames:report.frames.length,devices:report.devices.length}));
