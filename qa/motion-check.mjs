import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { access,mkdir,writeFile } from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const directory=path.dirname(fileURLToPath(import.meta.url));
const base=(process.env.QA_BASE_URL || 'http://127.0.0.1:4174/study-journal/').replace(/\/?$/,'/');
const shots=path.join(directory,'screenshots');
await mkdir(shots,{recursive:true});
let executablePath;
for(const candidate of [process.env.BROWSER_EXECUTABLE,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean)) {
  try{await access(candidate);executablePath=candidate;break;}catch{}
}
const browser=await chromium.launch({executablePath,headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
const result={base,browser:browser.version(),checks:[],errors:[],measurements:{},screenshots:[]};
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference',locale:'ko-KR'});
await context.addInitScript(() => {
  window.layoutShiftTotal=0;
  new PerformanceObserver(list => {for(const entry of list.getEntries())if(!entry.hadRecentInput)window.layoutShiftTotal+=entry.value;}).observe({type:'layout-shift',buffered:true});
});
const page=await context.newPage();
page.on('pageerror',error=>result.errors.push(error.message));
const go=(route='')=>page.goto(new URL(route,base).href);
const shot=async name=>{await page.screenshot({path:path.join(shots,name+'.png'),fullPage:true});result.screenshots.push(name+'.png');};
const check=async(name,fn)=>{try{await fn();result.checks.push({name,passed:true});console.log('PASS '+name);}catch(error){result.checks.push({name,passed:false,error:error.stack});console.error('FAIL '+name+': '+error.message.slice(0,500));}};
const settled=tab=>tab.waitForFunction(()=>document.getAnimations().filter(a=>(a.playState==='running'||a.playState==='pending') && a.effect.getTiming().iterations!==Infinity).length===0);
const visible=async tab=>assert.ok(await tab.locator('main h1').evaluate(n=>getComputedStyle(n).visibility==='visible' && Number(getComputedStyle(n).opacity)>0 && n.getBoundingClientRect().height>0));
try {
  await check('Generated hero loads, responsive candidates and explicit disclosure',async()=>{
    assert.equal((await go()).status(),200);
    await page.locator('body[data-motion="on"]').waitFor();
    await page.locator('.portal-image').evaluate(img=>img.decode());
    assert.equal(await page.locator('.portal-caption').getByText('AI 생성 이미지 · 상상한 가상 세계',{exact:true}).isVisible(),true);
    assert.ok(await page.locator('.portal-image').evaluate(img=>img.naturalWidth>=960 && img.alt.length>20 && img.srcset.includes('480w')));
    const bytes=(await(await context.request.get(new URL('images/threshold-1672.jpg',base).href)).body()).length;
    assert.ok(bytes<250000);result.measurements.desktopHeroBytes=bytes;
  });
  await check('Content entrances finish; decorative motion is separately pausable; no layout shift',async()=>{
    await settled(page);await visible(page);
    assert.equal(await page.locator('.portal-copy h1').evaluate(n=>getComputedStyle(n).opacity),'1');
    const metrics=await page.evaluate(()=>({cls:window.layoutShiftTotal,animations:document.getAnimations().length,external:performance.getEntriesByType('resource').map(r=>r.name).filter(u=>new URL(u).origin!==location.origin)}));
    result.measurements.initial=metrics;assert.ok(metrics.cls<.05);assert.deepEqual(metrics.external,[]);
    await shot('motion-desktop-home');
  });
  await check('Scroll response is bounded; no scroll interception',async()=>{
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    await page.waitForFunction(()=>document.querySelector('.portal-scene').style.getPropertyValue('--scene-y')!=='');
    const before=await page.locator('.portal-scene').evaluate(n=>n.style.getPropertyValue('--scene-y'));
    await page.evaluate(()=>scrollTo({top:350,behavior:'instant'}));
    await page.waitForFunction(value=>document.querySelector('.portal-scene').style.getPropertyValue('--scene-y')!==value,before);
    const after=await page.locator('.portal-scene').evaluate(n=>parseFloat(n.style.getPropertyValue('--scene-y')));
    assert.ok(Math.abs(after)<=24);assert.ok(await page.evaluate(()=>scrollY>=340));
    result.measurements.parallax={before,after};await settled(page);
  });
  await check('Keyboard motion toggle stops effects and persists across pages',async()=>{
    const toggle=page.locator('.motion-toggle');await toggle.focus();await page.keyboard.press('Enter');
    assert.equal(await toggle.getAttribute('aria-pressed'),'false');
    assert.equal(await page.locator('body').getAttribute('data-motion'),'off');
    assert.equal(await page.locator('.portal-scene').evaluate(n=>getComputedStyle(n).transform),'none');
    await go('notes/2026-11-03-beginning/');assert.equal(await page.locator('body').getAttribute('data-motion'),'off');
    await page.reload();assert.equal(await page.locator('.motion-toggle').getAttribute('aria-pressed'),'false');
    assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
  });
  await check('OS reduced motion overrides saved on and reacts immediately',async()=>{
    await page.evaluate(()=>localStorage.setItem('study-journal-motion','on'));
    await page.emulateMedia({reducedMotion:'reduce'});await go();
    assert.equal(await page.locator('body').getAttribute('data-motion'),'off');
    assert.equal(await page.locator('.motion-toggle').isDisabled(),true);
    assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.waitForFunction(()=>document.body.dataset.motion==='on');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>document.body.dataset.motion==='off');
    assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
  });
  await check('Keyboard focus is visible over the scene and skip link works',async()=>{
    await go();await page.keyboard.press('Tab');
    assert.equal(await page.locator('.skip-link').evaluate(n=>n===document.activeElement),true);
    await page.keyboard.press('Enter');assert.ok(page.url().endsWith('#main'));
    await page.locator('.portal-link').focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');
    assert.ok(await page.locator('.portal-link').evaluate(n=>n.matches(':focus-visible') && parseFloat(getComputedStyle(n).outlineWidth)>=3));
  });
  await check('Normal-motion desktop WCAG audit and reading progress',async()=>{
    await page.emulateMedia({reducedMotion:'no-preference'});await go();await settled(page);
    const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();assert.deepEqual(audit.violations,[]);
    await go('guide/themes/ocean/');await page.evaluate(()=>scrollTo({top:650,behavior:'instant'}));
    await page.waitForFunction(()=>parseFloat(document.querySelector('.reading-progress').style.getPropertyValue('--reading-progress'))>0);
    assert.equal(await page.locator('.prose').evaluate(n=>getComputedStyle(n).opacity),'1');
    assert.equal(await page.locator('.prose').evaluate(n=>getComputedStyle(n).transform),'none');
  });
  await check('Mobile composition, image budget, no parallax and WCAG audit',async()=>{
    const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
    const tab=await mobile.newPage();await tab.goto(base);await tab.locator('.portal-image').evaluate(img=>img.decode());await settled(tab);
    const image=await tab.locator('.portal-image').evaluate(img=>({src:img.currentSrc,width:img.naturalWidth}));
    const bytes=(await(await mobile.request.get(image.src)).body()).length;assert.ok(bytes<100000);result.measurements.mobileHero={...image,bytes};
    assert.ok(await tab.evaluate(()=>document.querySelector('.portal-copy').getBoundingClientRect().bottom<=document.querySelector('.portal-scene').getBoundingClientRect().top+1));
    await tab.evaluate(()=>scrollTo({top:220,behavior:'instant'}));assert.equal(await tab.locator('.portal-scene').evaluate(n=>getComputedStyle(n).transform),'none');
    // Audit while reveals may be running: text must keep its full contrast.
    await tab.evaluate(()=>document.getAnimations().forEach(animation=>{animation.pause();animation.currentTime=0;}));
    await tab.screenshot({path:path.join(shots,'motion-mobile-home.png'),fullPage:true});result.screenshots.push('motion-mobile-home.png');
    const audit=await new AxeBuilder({page:tab}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();assert.deepEqual(audit.violations,[]);
    for(const width of [320,390,760]){await tab.setViewportSize({width,height:844});assert.ok(await tab.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
    await mobile.close();
  });
  await check('No JavaScript keeps hero, entry and theme articles fully visible',async()=>{
    const plain=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const tab=await plain.newPage();await tab.goto(base);await visible(tab);
    assert.equal(await tab.locator('.motion-toggle').isVisible(),false);assert.equal(await tab.locator('.portal-image').evaluate(n=>n.complete && n.naturalWidth>0),true);
    await tab.screenshot({path:path.join(shots,'motion-no-js.png'),fullPage:true});result.screenshots.push('motion-no-js.png');
    for(const route of ['notes/2026-11-03-beginning/','guide/themes/ocean/','guide/themes/clay/']){await tab.goto(new URL(route,base).href);await visible(tab);assert.equal(await tab.locator('.prose').evaluate(n=>getComputedStyle(n).opacity),'1');}
    await plain.close();
  });
  await check('Missing motion script and unsupported animation API leave content visible',async()=>{
    const fallback=await browser.newContext();const tab=await fallback.newPage();await tab.route('**/assets/motion.js',route=>route.abort());await tab.goto(base);await visible(tab);assert.equal(await tab.locator('.motion-toggle').isVisible(),false);
    await tab.unroute('**/assets/motion.js');await tab.addInitScript(()=>{Element.prototype.animate=undefined;});await tab.reload();await visible(tab);assert.equal(await tab.locator('.motion-toggle').isVisible(),false);await fallback.close();
  });
  await check('Data saver and slow connection force static presentation',async()=>{
    for(const policy of [{saveData:true,effectiveType:'4g'},{saveData:false,effectiveType:'2g'}]){
      const slow=await browser.newContext();await slow.addInitScript(value=>Object.defineProperty(navigator,'connection',{get:()=>value}),policy);
      const tab=await slow.newPage();await tab.goto(base);assert.equal(await tab.locator('body').getAttribute('data-motion'),'off');assert.equal(await tab.locator('.motion-toggle').isDisabled(),true);assert.equal(await tab.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);await visible(tab);await slow.close();
    }
  });
  await check('Delayed JavaScript and throttled CPU never hide content or replay hero',async()=>{
    const slow=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});const tab=await slow.newPage();
    const cdp=await slow.newCDPSession(tab);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    await tab.route('**/assets/motion.js',async route=>{await new Promise(resolve=>setTimeout(resolve,2200));await route.continue();});
    await tab.goto(base,{waitUntil:'commit'});await tab.locator('main h1').waitFor();await visible(tab);assert.equal(await tab.locator('.portal-copy h1').evaluate(n=>getComputedStyle(n).opacity),'1');
    await tab.waitForLoadState('load');await tab.waitForFunction(()=>document.body.dataset.motion==='on');
    const active=await tab.evaluate(()=>document.querySelector('.portal-hero').getAnimations({subtree:true}).filter(a=>a.playState==='running' && a.effect.getTiming().iterations!==Infinity).length);assert.equal(active,0);await visible(tab);result.measurements.slowCPU=4;await slow.close();
  });
  await check('Orbit artwork animates on home, archive and article; offscreen art pauses',async()=>{
    await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>localStorage.setItem('study-journal-motion','on'));
    for(const route of ['', 'notes/', 'notes/2026-11-03-beginning/']) {
      await go(route);await page.waitForFunction(()=>document.querySelector('.orbit-art[data-active="true"]'));
      const rotor=page.locator('.orbit-art[data-active="true"] .orbit-rotor').first();
      assert.equal(await rotor.evaluate(n=>getComputedStyle(n).animationPlayState),'running');
      const first=await rotor.evaluate(n=>getComputedStyle(n).transform);
      await page.waitForFunction(value=>getComputedStyle(document.querySelector('.orbit-art[data-active="true"] .orbit-rotor')).transform!==value,first);
      await page.evaluate(()=>scrollTo({top:document.body.scrollHeight,behavior:'instant'}));
      await page.waitForFunction(()=>{
        const outside=[...document.querySelectorAll('.orbit-art')].filter(n=>{const r=n.getBoundingClientRect();return r.bottom<0||r.top>innerHeight;});
        return outside.length>0&&outside.every(n=>getComputedStyle(n.querySelector('.orbit-rotor')).animationPlayState==='paused');
      });
    }
  });
  await check('Pointer feedback, scroll typography and sticky reading navigation respond',async()=>{
    await go();const path=page.locator('.path-art');await path.scrollIntoViewIfNeeded();
    const box=await path.boundingBox();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.25);
    await page.waitForFunction(()=>document.querySelector('.path-art .orbit-art').style.getPropertyValue('--tilt-y')!=='');
    await page.locator('[data-scroll-line]').nth(1).scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-scroll-line][data-current="true"]'));
    await go('notes/2026-11-03-beginning/');await page.locator('.prose h2').nth(2).scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('.toc [aria-current="location"]'));
    assert.equal(await page.locator('.site-header').evaluate(n=>getComputedStyle(n).position),'sticky');
    assert.ok(await page.locator('.prose h2').nth(2).evaluate(n=>n.getBoundingClientRect().top>=0));
  });
  await check('Top control pauses all ambient motion immediately and keyboard restores it',async()=>{
    await go('notes/');await page.waitForFunction(()=>document.querySelector('.orbit-art[data-active="true"]'));
    const toggle=page.locator('.motion-toggle');await toggle.focus();await page.keyboard.press('Enter');
    assert.equal(await page.locator('body').getAttribute('data-motion'),'off');await settled(page);
    assert.ok(await page.locator('.orbit-rotor').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).animationPlayState==='paused')));
    await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.orbit-art[data-active="true"]'));
    assert.equal(await page.locator('.motion-toggle').getAttribute('aria-pressed'),'true');
  });
  await check('No uncaught errors in normal interactions',async()=>assert.deepEqual(result.errors,[]));
} finally {
  result.passed=result.checks.every(c=>c.passed);
  await writeFile(process.env.QA_MOTION_REPORT_PATH || path.join(directory,'motion-results.json'),JSON.stringify(result,null,2));
  await browser.close();
}
console.log(JSON.stringify({passed:result.passed,checks:result.checks.length}));if(!result.passed)process.exitCode=1;
