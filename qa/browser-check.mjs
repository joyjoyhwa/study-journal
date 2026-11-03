import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const base = (process.env.QA_BASE_URL || 'http://127.0.0.1:4173/').replace(/\/?$/, '/');
const screenshots = path.join(directory,'screenshots');
await mkdir(screenshots,{recursive:true});
const candidates = [process.env.BROWSER_EXECUTABLE, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean);
let executablePath;
for (const candidate of candidates) { try { await access(candidate); executablePath = candidate; break; } catch {} }
if (!executablePath) throw new Error('설치된 Edge 또는 Chrome 경로를 BROWSER_EXECUTABLE에 지정하세요.');
const browser = await chromium.launch({executablePath,headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
const context = await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1,locale:'ko-KR',reducedMotion:'reduce'});
context.setDefaultTimeout(10000);
for (const signal of ['SIGINT','SIGTERM']) process.once(signal,async () => { await browser.close(); process.exit(1); });
const page = await context.newPage();
const result = {base,browser:await browser.version(),checks:[],errors:[],canceledImageLoads:[],accessibility:[],screenshots:[]};
page.on('pageerror',error => result.errors.push(error.message));
page.on('requestfailed',request => {
  // Responsive candidate loads can be canceled by this suite's immediate resize/navigation.
  const message = `${request.url()}: ${request.failure()?.errorText}`;
  if (request.resourceType() === 'image' && request.failure()?.errorText === 'net::ERR_ABORTED') result.canceledImageLoads.push(message);
  else result.errors.push(message);
});
async function check(name,run) { try { await run(); result.checks.push({name,passed:true}); console.log(`PASS ${name}`); } catch (error) { result.checks.push({name,passed:false,error:error.message}); console.error(`FAIL ${name}: ${error.message.slice(0,350)}`); } }
async function go(route = '') { const response = await page.goto(new URL(route,base).href); await page.evaluate(() => Promise.all([document.fonts.ready,...[...document.images].map(img => img.decode())])); return response; }
async function shot(name) { const filename = `${name}.png`; await page.screenshot({path:path.join(screenshots,filename),fullPage:true}); result.screenshots.push(filename); }
async function visiblePosts(count) { assert.equal(await page.locator('[data-post]:visible').count(),count); }
async function noOverflow() { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),`Horizontal overflow at ${page.viewportSize().width}px`); }
async function axe(name) {
  const report = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  const violations = report.violations.map(v => ({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n => ({target:n.target,summary:n.failureSummary}))}));
  result.accessibility.push({name,violations});
  assert.equal(violations.length,0,JSON.stringify(violations));
}
try {
  await check('Home renders a real entry and desktop screenshot',async () => { assert.equal((await go()).status(),200); await visiblePosts(1); assert.match(await page.title(),/풀다이브를 향한 공부 기록/); await shot('desktop-home'); await noOverflow(); });
  await check('Category empty state and browser back/forward',async () => {
    await page.getByRole('button',{name:'논문 노트',exact:true}).click(); await visiblePosts(0);
    assert.equal(await page.locator('.empty-state').isVisible(),true); assert.match(page.url(),/category=paper/); await shot('desktop-empty-state');
    await page.goBack(); await visiblePosts(1); await page.goForward(); await visiblePosts(0);
    await page.getByRole('button',{name:'모든 기록 보기',exact:true}).click(); await visiblePosts(1);
  });
  await check('Search matches body text; no matches and clearing work',async () => {
    await page.getByRole('searchbox').fill('기초 공부'); await visiblePosts(1);
    await page.getByRole('searchbox').fill('없는검색어123'); await visiblePosts(0);
    assert.equal(await page.getByText('찾는 기록이 아직 없어요.',{exact:true}).isVisible(),true);
    await page.getByRole('searchbox').fill(''); await visiblePosts(1);
  });
  await check('List/detail, Korean table of contents and repeated back navigation',async () => {
    for (let i=0;i<3;i++) { await page.getByRole('link',{name:'공부를 기록할 작은 공간을 만들었다',exact:true}).click(); await page.getByRole('heading',{level:1,name:'공부를 기록할 작은 공간을 만들었다'}).waitFor(); assert.equal(await page.locator('article.prose h2').count(),6); if(i===0) await shot('desktop-article'); await page.goBack(); await visiblePosts(1); }
    await page.getByRole('link',{name:'공부를 기록할 작은 공간을 만들었다',exact:true}).click();
    await page.getByRole('navigation',{name:'글 목차'}).getByRole('link',{name:'막힌 점'}).click();
    assert.ok(decodeURIComponent(page.url()).endsWith('#막힌-점'));
    await go('notes/');
  });
  await check('Tag links restore filter and reset',async () => {
    await page.getByRole('link',{name:'#공부 방법',exact:true}).click(); assert.match(page.url(),/tag=/); await visiblePosts(1);
    assert.equal(await page.locator('.active-filter').isVisible(),true);
    await page.getByRole('button',{name:'선택 해제 ×',exact:true}).click(); assert.ok(!page.url().includes('tag=')); await visiblePosts(1);
    await go('notes/?q=%EC%97%86%EC%9D%8C'); await visiblePosts(0);
    await page.reload(); await visiblePosts(0);
  });
  const routes = ['', 'notes/', 'notes/2026-11-03-beginning/', 'guide/', 'guide/daily/', 'guide/paper/', 'guide/themes/', 'guide/themes/forest/', 'guide/themes/ocean/', 'guide/themes/clay/', 'about/', '404.html'];
  const urls = new Set();
  for (const route of routes) {
    await check(`Page, links and WCAG audit: /${route}`,async () => {
      const response = await go(route); assert.equal(response.status(),200);
      assert.equal(await page.locator('main h1').count(),1);
      await noOverflow();
      const links = await page.locator('a[href],link[rel="stylesheet"],script[src],img[src]').evaluateAll(nodes => nodes.map(n => n.href || n.src).filter(Boolean));
      links.filter(url => url.startsWith(base)).forEach(url => urls.add(url.split('#')[0]));
      const brokenAnchors = await page.locator('a[href^="#"]').evaluateAll(nodes => nodes.map(n => n.getAttribute('href').slice(1)).filter(id => !document.getElementById(decodeURIComponent(id))));
      assert.deepEqual(brokenAnchors,[]); await axe(route || 'home');
    });
  }
  await check('All local links and assets respond successfully',async () => { for(const url of urls) { const response = await context.request.get(url); assert.equal(response.status(),200,url); } });
  await check('Unknown routes return designed 404',async () => { assert.equal((await go('not-a-page/')).status(),404); assert.equal(await page.getByRole('link',{name:'모든 기록으로',exact:true}).isVisible(),true); });
  await check('Markdown templates download',async () => { await go('guide/paper/'); const pending = page.waitForEvent('download'); await page.getByRole('link',{name:'Markdown 서식 내려받기 ↓'}).click(); const download = await pending; assert.equal(download.suggestedFilename(),'paper.md'); });
  await check('Mobile home, menu keyboard close and menu navigation',async () => {
    await page.setViewportSize({width:390,height:844}); await go(); await noOverflow(); await shot('mobile-home');
    await page.getByRole('button',{name:'메뉴 열기',exact:true}).click(); assert.equal(await page.locator('#mobile-nav').isVisible(),true); await shot('mobile-menu');
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#mobile-nav').isVisible(),false);
    await page.getByRole('button',{name:'메뉴 열기',exact:true}).click();
    await page.getByRole('navigation',{name:'모바일 메뉴'}).getByRole('link',{name:'모든 기록',exact:true}).click();
    assert.ok(new URL(page.url()).pathname.endsWith('/notes/')); await visiblePosts(1);
  });
  await check('Mobile detail, paper table and responsive widths',async () => {
    await go('notes/2026-11-03-beginning/'); await shot('mobile-article'); await axe('mobile-article');
    for (const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:900});
      for (const route of ['', 'notes/2026-11-03-beginning/','guide/paper/']) { await go(route); await noOverflow(); }
    }
  });
  await check('Readable without JavaScript',async () => {
    const plain = await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
    const tab = await plain.newPage(); await tab.goto(base); assert.equal(await tab.locator('[data-post]').count(),1);
    await tab.getByRole('link',{name:'공부를 기록할 작은 공간을 만들었다',exact:true}).click();
    assert.equal(await tab.locator('article.prose h2').count(),6);
    for (const theme of ['ocean','clay']) { await tab.goto(new URL(`guide/themes/${theme}/`,base).href); assert.equal(await tab.locator('body').getAttribute('data-theme'),theme); }
    await plain.close();
  });
  await check('Article palettes: default, distinct colors, small-screen readability and navigation reset',async () => {
    await go('notes/2026-11-03-beginning/');
    assert.equal(await page.locator('body').getAttribute('data-theme'),'forest');
    assert.deepEqual(await page.locator('.reading-layout').evaluate(node => [getComputedStyle(node).backgroundColor,getComputedStyle(node).color]),['rgb(246, 245, 240)','rgb(52, 70, 63)']);
    const backgrounds = new Set();
    for (const theme of ['forest','ocean','clay']) {
      for (const width of [1440,390,320]) {
        await page.setViewportSize({width,height:900}); await go(`guide/themes/${theme}/`); await noOverflow();
        assert.equal(await page.locator('body').getAttribute('data-theme'),theme);
        backgrounds.add(await page.locator('body').evaluate(node => getComputedStyle(node).backgroundColor));
        const type = await page.locator('.prose').evaluate(node => ({size:parseFloat(getComputedStyle(node).fontSize),line:parseFloat(getComputedStyle(node).lineHeight)}));
        assert.ok(type.size >= 15 && type.line/type.size >= 1.8);
        if (width !== 320) await shot(`${width === 1440 ? 'desktop' : 'mobile'}-theme-${theme}`);
        if (width === 390) await axe(`mobile-theme-${theme}`);
      }
    }
    assert.equal(backgrounds.size,3);
    await go('guide/themes/ocean/');
    await page.locator('.prose').getByRole('link',{name:'모든 공부 기록으로 돌아가기',exact:true}).click();
    assert.equal(await page.locator('body').getAttribute('data-theme'),'forest'); await visiblePosts(1);
    await page.goBack(); assert.equal(await page.locator('body').getAttribute('data-theme'),'ocean');
    await page.locator('.theme-card[href$="/clay/"]').click(); assert.equal(await page.locator('body').getAttribute('data-theme'),'clay');
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => document.activeElement.matches(':focus-visible') && parseFloat(getComputedStyle(document.activeElement).outlineWidth) >= 2));
  });
  await check('No page errors or failed asset requests',async () => assert.deepEqual(result.errors,[]));
} finally {
  result.passed = result.checks.every(c => c.passed) && !result.errors.length;
  await writeFile(process.env.QA_REPORT_PATH || path.join(directory,'browser-results.json'),JSON.stringify(result,null,2));
  await browser.close();
}
console.log(JSON.stringify({passed:result.passed,checks:result.checks.length,screenshots:result.screenshots.length},null,2));
if (!result.passed) process.exitCode = 1;
