import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { build, validatePost, projectRoot } from '../scripts/build.mjs';
import { getTheme, themes } from '../scripts/themes.mjs';

test('Theme metadata is optional and rejects unsupported or unsafe values', () => {
  assert.equal(getTheme().key,'forest');
  const post = {title:'Theme test',date:'2026-11-03',category:'journal',summary:'Test',tags:[]};
  assert.doesNotThrow(() => validatePost(post,'test.md'));
  for (const theme of Object.keys(themes)) assert.doesNotThrow(() => validatePost({...post,theme},'test.md'));
  for (const theme of ['','blue','__proto__','ocean" onload="alert(1)',null,{},true]) {
    assert.throws(() => validatePost({...post,theme},'test.md'),/theme/);
  }
});

function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(value => parseInt(value,16)/255).map(value => value <= .04045 ? value/12.92 : ((value+.055)/1.055)**2.4);
  return .2126*rgb[0] + .7152*rgb[1] + .0722*rgb[2];
}
function contrast(a,b) { const values = [luminance(a),luminance(b)].sort((x,y) => y-x); return (values[0]+.05)/(values[1]+.05); }
test('New reading palettes meet 4.5:1 contrast for text, links, code and small descriptions', () => {
  for (const key of ['ocean','clay']) {
    const c = themes[key].colors;
    for (const [fg,bg] of [['text','paper'],['ink','paper'],['muted','paper'],['green','paper'],['text','soft'],['muted','soft'],['green','soft'],['paper','ink']]) {
      assert.ok(contrast(c[fg],c[bg]) >= 4.5,`${key} ${fg}/${bg}: ${contrast(c[fg],c[bg]).toFixed(2)}`);
    }
  }
});

test('Real Markdown theme fields render separate article palettes under a Pages subpath',async () => {
  const root = await mkdtemp(path.join(os.tmpdir(),'study-journal-themes-'));
  try {
    for (const directory of ['templates','public']) await cp(path.join(projectRoot,directory),path.join(root,directory),{recursive:true});
    await cp(path.join(projectRoot,'site.config.json'),path.join(root,'site.config.json'));
    await mkdir(path.join(root,'content/posts'),{recursive:true});
    await writeFile(path.join(root,'content/posts/default-fixture.md'),'---\ntitle: "Default fixture"\ndate: "2026-11-03"\ncategory: "journal"\ntags: []\nsummary: "Default palette verification"\n---\n\n## Heading\n\nA temporary test fixture.\n');
    for (const key of ['ocean','clay']) await writeFile(path.join(root,'content/posts',`fixture-${key}.md`),`---\ntitle: "Theme fixture ${key}"\ndate: "2026-11-02"\ncategory: "paper"\ntheme: "${key}"\nsummary: "Local test fixture only"\ntags: ["fixture"]\ndraft: false\n---\n\n## A readable heading\n\nThis is a local test fixture, not a study record.\n\n> A quotation.\n\n[All notes](/notes/)\n`);
    const result = await build({root,basePath:'/study-journal',url:'https://example.github.io'});
    assert.equal(result.postCount,3);
    for (const key of ['ocean','clay']) {
      const html = await readFile(path.join(result.outDir,`notes/fixture-${key}/index.html`),'utf8');
      assert.match(html,new RegExp(`<body data-theme="${key}">`));
      assert.ok(html.includes(`name="theme-color" content="${themes[key].colors.paper}"`));
      assert.ok(html.includes('href="/study-journal/notes/"'));
      assert.ok(html.includes('href="/study-journal/assets/themes.css"'));
      assert.match(html,/<h2 id="a-readable-heading">/);
    }
    const original = await readFile(path.join(result.outDir,'notes/default-fixture/index.html'),'utf8');
    assert.match(original,/<body data-theme="forest">/);
    assert.match(original,/name="theme-color" content="#f6f5f0"/);
    const home = await readFile(path.join(result.outDir,'index.html'),'utf8');
    assert.match(home,/<body data-theme="forest">/);
    const feed = await readFile(path.join(result.outDir,'feed.xml'),'utf8');
    assert.ok(!feed.includes('/guide/themes/'));
    const css = await readFile(path.join(result.outDir,'assets/themes.css'),'utf8');
    assert.ok(css.includes(`--paper: ${themes.ocean.colors.paper}`));
    assert.ok(css.includes(`--paper: ${themes.clay.colors.paper}`));
    for (const key of Object.keys(themes)) {
      const preview = await readFile(path.join(result.outDir,`guide/themes/${key}/index.html`),'utf8');
      assert.ok(preview.includes(`<body data-theme="${key}">`));
      assert.ok(preview.includes('실제 공부 기록은 아닙니다.'));
      assert.ok(preview.includes('href="/study-journal/guide/daily/"'));
    }
  } finally {
    const relative = path.relative(path.resolve(os.tmpdir()),path.resolve(root));
    assert.ok(relative.startsWith('study-journal-themes-') && !relative.includes(path.sep));
    await rm(root,{recursive:true,force:true});
  }
});
