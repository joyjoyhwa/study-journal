import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const directory=path.dirname(fileURLToPath(import.meta.url));
const base=(process.env.QA_BASE_URL||'http://127.0.0.1:4174/study-journal/').replace(/\/?$/,'/');
const shots=path.join(directory,'screenshots');await mkdir(shots,{recursive:true});
let executablePath;
for(const candidate of [process.env.BROWSER_EXECUTABLE,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean)){try{await access(candidate);executablePath=candidate;break;}catch{}}
const browser=await chromium.launch({executablePath,headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference',locale:'ko-KR'});
const page=await context.newPage();context.setDefaultTimeout(12000);const report={base,browser:browser.version(),checks:[],errors:[],states:[],accessibility:[],screenshots:[]};
page.on('pageerror',e=>report.errors.push(e.message));
const check=async(name,fn)=>{try{await fn();report.checks.push({name,passed:true});console.log('PASS '+name);}catch(e){report.checks.push({name,passed:false,error:e.stack});console.error('FAIL '+name+': '+e.message.slice(0,600));}};
const go=async(tab=page,url=base)=>{const response=await tab.goto(url);await tab.evaluate(()=>Promise.all([document.fonts.ready,...[...document.images].map(img=>img.decode())]));return response;};
const ready=tab=>tab.waitForFunction(()=>document.querySelector('.scroll-story')?.dataset.ready==='true');
// Wait for native PageDown/touch inertia before a new intentional gesture.
const settleScroll=tab=>tab.evaluate(()=>new Promise(resolve=>{let y=scrollY,stable=0,count=0;const tick=()=>{stable=Math.abs(scrollY-y)<1?stable+1:0;y=scrollY;if(stable>=10||++count>180)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);}));
// Protocol scrollIntoView on sticky header controls moves the page in Edge. A real pointer does not.
const pointerClick=async(tab,locator)=>{const r=await locator.boundingBox();assert.ok(r&&r.y>=0&&r.y+r.height<=tab.viewportSize().height);await tab.mouse.click(r.x+r.width/2,r.y+r.height/2);};
const seek=async(tab,p)=>{await settleScroll(tab);await tab.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await tab.evaluate(progress=>{const root=document.querySelector('.scroll-story'),stage=root.querySelector('.story-stage'),header=document.querySelector('.site-header');scrollTo({top:root.getBoundingClientRect().top+scrollY-header.getBoundingClientRect().height+(root.offsetHeight-stage.offsetHeight)*progress,behavior:'instant'});},p);await tab.waitForFunction(progress=>Math.abs(Number(document.querySelector('.scroll-story').dataset.progress)-progress)<.003,p);};
const capture=async(tab,name)=>{await tab.screenshot({path:path.join(shots,name+'.png')});report.screenshots.push(name+'.png');};
const state=tab=>tab.evaluate(()=>{const root=document.querySelector('.scroll-story'),signal=root.querySelector('.story-signal'),r=signal.getBoundingClientRect();return{scene:root.dataset.scene,progress:Number(root.dataset.progress),x:r.x+r.width/2,y:r.y+r.height/2,size:r.width,gate:root.querySelector('.story-stage').style.getPropertyValue('--gate-open'),caption:root.querySelector('[data-scene][aria-hidden="false"] h2').innerText};});
const audit=async(tab,name)=>{const a=await new AxeBuilder({page:tab}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();const violations=a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,message:n.failureSummary}))}));report.accessibility.push({name,violations});assert.deepEqual(violations,[]);};
try{
 await check('Desktop: one signal, four visibly distinct scroll-controlled scenes',async()=>{
  assert.equal((await go()).status(),200);await ready(page);assert.equal(await page.locator('.story-signal').count(),1);
  await page.evaluate(()=>window.originalSignal=document.querySelector('.story-signal'));
  for(const [index,p] of [0,.34,.64,1].entries()){
   await seek(page,p);const s=await state(page);report.states.push({device:'desktop',...s});assert.equal(Number(s.scene),index);assert.ok(s.x>0&&s.x<1440&&s.y>90&&s.y<1000);assert.equal(await page.evaluate(()=>originalSignal===document.querySelector('.story-signal')),true);
   await capture(page,'story-desktop-'+['start','connections','threshold','end'][index]);await audit(page,'desktop-scene-'+index);
  }
  assert.equal(new Set(report.states.map(s=>Math.round(s.x)+':'+Math.round(s.y))).size,4);assert.equal(report.states[0].gate,'0.0000');assert.equal(report.states[3].gate,'1.0000');
 });
 await check('Reverse scrolling reproduces the same object and scene state',async()=>{
  await seek(page,.64);const middle=await state(page);await seek(page,.9);await seek(page,.64);const reverse=await state(page);assert.ok(Math.abs(reverse.x-middle.x)<1&&Math.abs(reverse.y-middle.y)<1);assert.equal(reverse.scene,middle.scene);
  await seek(page,.08);assert.equal((await state(page)).scene,'0');
 });
 await check('Native wheel and PageDown advance the story without scroll interception',async()=>{
  await seek(page,.1);await page.mouse.move(1000,700);await page.mouse.wheel(0,420);await page.waitForFunction(()=>Number(document.querySelector('.scroll-story').dataset.progress)>.15);
  const before=await page.evaluate(()=>scrollY);await page.keyboard.press('PageDown');await page.waitForFunction(y=>scrollY>y+150,before);await settleScroll(page);
 });
 await check('Chapter controls work with keyboard and show visible focus',async()=>{
  const first=page.locator('[data-story-step="0"]');await first.evaluate(n=>n.focus({preventScroll:true}));await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.scroll-story').dataset.scene==='0');
  await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[data-story-step="1"]').getAttribute('aria-current'),'step');
  assert.ok(await page.locator('[data-story-step="1"]').evaluate(n=>n.matches(':focus-visible')&&parseFloat(getComputedStyle(n).outlineWidth)>=2));
  await page.keyboard.press('End');assert.equal(await page.locator('[data-story-step="3"]').getAttribute('aria-current'),'step');
 });
 await check('Skip and direct archive navigation avoid the entire scroll sequence',async()=>{
  await seek(page,.3);await page.locator('.story-ui .story-skip').click();assert.equal(await page.locator('#study-records').evaluate(n=>document.activeElement===n),true);
  const r=await page.locator('#study-records').boundingBox();assert.ok(r.y>=85&&r.y<150);await page.getByRole('link',{name:'공부를 기록할 작은 공간을 만들었다',exact:true}).click();assert.equal(await page.locator('.prose h2').count(),6);
  await go();await ready(page);await page.getByRole('link',{name:'공부 기록 펼쳐 보기',exact:true}).click();assert.ok(page.url().endsWith('/notes/'));assert.equal(await page.locator('.scroll-story').count(),0);
 });
 await check('Reload and browser back restore the middle of the story',async()=>{
  await go();await ready(page);await seek(page,.63);await page.reload();await ready(page);await page.waitForFunction(()=>Math.abs(Number(document.querySelector('.scroll-story').dataset.progress)-.63)<.01);
  await pointerClick(page,page.getByRole('navigation',{name:'주 메뉴'}).getByRole('link',{name:'모든 기록',exact:true}));await page.waitForURL('**/notes/');await page.goBack();await ready(page);await page.waitForFunction(()=>Math.abs(Number(document.querySelector('.scroll-story').dataset.progress)-.63)<.01);
 });
 await check('Motion toggle switches to complete static chapters and preserves reading position',async()=>{
  await seek(page,.64);await pointerClick(page,page.locator('.motion-toggle'));await page.waitForFunction(()=>!document.querySelector('.scroll-story').classList.contains('is-story-enhanced'));
  assert.equal(await page.locator('.story-scene:visible').count(),4);assert.equal(await page.locator('.story-flight').isVisible(),false);await audit(page,'manual-static');
  await pointerClick(page,page.locator('.motion-toggle'));await page.waitForFunction(()=>document.querySelector('.scroll-story').classList.contains('is-story-enhanced'));assert.equal((await state(page)).scene,'2');
 });
 await check('Reduced motion always provides a static readable alternative',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!document.querySelector('.scroll-story').classList.contains('is-story-enhanced'));
  assert.equal(await page.locator('.motion-toggle').isDisabled(),true);assert.equal(await page.locator('.story-scene:visible').count(),4);assert.equal(await page.locator('.story-stage').evaluate(n=>getComputedStyle(n).position),'relative');
  assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);const staticChapter=await page.locator('.story-scene[data-scene="2"]').boundingBox();assert.ok(staticChapter.y>=80&&staticChapter.y<160);await capture(page,'story-reduced-motion');
  await page.locator('.story-scene[data-scene="2"]').scrollIntoViewIfNeeded();const y=await page.evaluate(()=>scrollY);await page.reload();await ready(page);await page.waitForFunction(value=>Math.abs(scrollY-value)<20,y);
  await page.emulateMedia({reducedMotion:'no-preference'});
 });
 await check('Mobile touch, all four scenes, no overflow and readable contrast',async()=>{
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'no-preference'});const tab=await mobile.newPage();await go(tab);await ready(tab);
  for(const [index,p] of [0,.34,.64,1].entries()){
   await seek(tab,p);const s=await state(tab);report.states.push({device:'mobile',...s});assert.equal(Number(s.scene),index);assert.ok(s.x>0&&s.x<390&&s.y>74&&s.y<844);assert.ok(await tab.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await capture(tab,'story-mobile-'+['start','connections','threshold','end'][index]);await audit(tab,'mobile-scene-'+index);
  }
  await seek(tab,.1);const cdp=await mobile.newCDPSession(tab);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:330,y:650}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:330,y:250}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await tab.waitForFunction(()=>Number(document.querySelector('.scroll-story').dataset.progress)>.15);
  for(const width of [320,760]){await tab.setViewportSize({width,height:844});await seek(tab,.64);assert.ok(await tab.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await tab.setViewportSize({width:320,height:568});await seek(tab,.64);await capture(tab,'story-small-screen');await audit(tab,'small-screen');await mobile.close();
 });
 await check('Orientation change preserves the current scene',async()=>{
  await go();await ready(page);await seek(page,.64);await page.setViewportSize({width:768,height:900});await page.waitForFunction(()=>Math.abs(Number(document.querySelector('.scroll-story').dataset.progress)-.64)<.01);await page.setViewportSize({width:1440,height:1000});
 });
 await check('No JavaScript shows every chapter and preserves direct reading',async()=>{
  const plain=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const tab=await plain.newPage();await go(tab);assert.equal(await tab.locator('.story-scene:visible').count(),4);assert.equal(await tab.locator('.story-flight').isVisible(),false);assert.equal(await tab.locator('.story-chapters').isVisible(),false);await capture(tab,'story-no-js');
  await tab.getByRole('link',{name:'공부 기록 펼쳐 보기',exact:true}).click();await tab.getByRole('link',{name:'공부를 기록할 작은 공간을 만들었다',exact:true}).click();assert.equal(await tab.locator('.prose h2').count(),6);await plain.close();
 });
 await check('Failed story module or model leaves all content visible',async()=>{
  for(const resource of ['story.js','story-model.js']){const safe=await browser.newContext();const tab=await safe.newPage();await tab.route('**/assets/'+resource+'*',r=>r.abort());await go(tab);assert.equal(await tab.locator('.story-scene:visible').count(),4);assert.equal(await tab.locator('.story-stage').evaluate(n=>getComputedStyle(n).position),'relative');await safe.close();}
 });
 await check('Data saving and 2G disable the pinned story',async()=>{
  for(const policy of [{saveData:true,effectiveType:'4g'},{saveData:false,effectiveType:'2g'}]){const slow=await browser.newContext();await slow.addInitScript(value=>Object.defineProperty(navigator,'connection',{get:()=>value}),policy);const tab=await slow.newPage();await go(tab);await ready(tab);assert.equal(await tab.locator('.story-scene:visible').count(),4);assert.equal(await tab.locator('.story-stage').evaluate(n=>getComputedStyle(n).position),'relative');await slow.close();}
 });
 await check('Delayed module and 4x CPU do not hide content; final story is usable',async()=>{
  const slow=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});const tab=await slow.newPage();const cdp=await slow.newCDPSession(tab);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await tab.route('**/assets/story.js*',async r=>{await new Promise(resolve=>setTimeout(resolve,1800));await r.continue();});await tab.goto(base,{waitUntil:'commit'});await tab.locator('main h1').waitFor();assert.equal(await tab.locator('main h1').isVisible(),true);await ready(tab);await seek(tab,.64);assert.equal((await state(tab)).scene,'2');await slow.close();
 });
 await check('Direct record anchor remains correct after enhancement',async()=>{await go(page,base+'#study-records');await ready(page);await page.waitForFunction(()=>{const r=document.getElementById('study-records').getBoundingClientRect();return r.top>=70&&r.top<180;});});
 await check('Story and reading use the same signal motif without altering article text',async()=>{await go(page,new URL('notes/2026-11-03-beginning/',base).href);assert.equal(await page.locator('.chapter-art .signal-mark').count(),1);assert.equal(await page.locator('.prose h2').count(),6);assert.equal(await page.locator('.prose').evaluate(n=>getComputedStyle(n).transform),'none');});
 await check('No unexpected page errors',async()=>assert.deepEqual(report.errors,[]));
}finally{report.passed=report.checks.every(c=>c.passed);await writeFile(process.env.QA_STORY_REPORT_PATH||path.join(directory,'story-results.json'),JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length}));if(!report.passed)process.exitCode=1;
