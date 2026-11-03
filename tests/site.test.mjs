import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, readdir, mkdir, cp, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { parseDocument, markdown, safeUrl } from '../scripts/markdown.mjs';
import { build, normalizeBase, validatePost, projectRoot } from '../scripts/build.mjs';

test('Markdown escapes HTML and rejects active URLs without losing code text', () => {
  const { html } = markdown('<script>alert(1)</script>\n\n[bad](javascript:alert) [ok](https://example.com)\n\n```js\n<img src=x onerror=alert(1)>\n```');
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('href="javascript:'));
  assert.match(html,/&lt;script&gt;/);
  assert.match(html,/href="https:\/\/example.com"/);
  assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.equal(safeUrl('//example.com'),null);
  assert.equal(safeUrl('data:text/html,hello'),null);
});
test('Headings produce unique Korean anchors, lists and paper tables render', () => {
  const result = markdown('## 질문\n\n## 질문\n\n1. 첫째\n2. 둘째\n\n| 항목 | 내용 |\n| --- | --- |\n| 제목 | 논문 |');
  assert.deepEqual(result.headings.map(h => h.id),['질문','질문-2']);
  assert.match(result.html,/<ol><li>첫째<\/li><li>둘째<\/li><\/ol>/);
  assert.match(result.html,/<th scope="col">항목<\/th>/);
  assert.throws(() => markdown('```js\nunfinished'),/코드 블록/);
});
test('Metadata rejects invalid dates, categories and accidental string draft flags', () => {
  const good = {title:'제목',date:'2024-02-29',summary:'요약',tags:['공부'],category:'journal',draft:false};
  assert.doesNotThrow(() => validatePost(good,'example.md'));
  assert.throws(() => validatePost({...good,date:'2023-02-29'},'example.md'),/날짜/);
  assert.throws(() => validatePost({...good,category:'unknown'},'example.md'),/category/);
  assert.throws(() => validatePost({...good,draft:'false'},'example.md'),/draft/);
  assert.throws(() => parseDocument('---\ntitle: "a"\ntitle: "b"\n---\n'),/중복/);
  assert.throws(() => parseDocument('no metadata'),/메타데이터/);
});
test('Base path normalization rejects traversal and protocols', () => {
  assert.equal(normalizeBase('study-log/'),'/study-log');
  assert.equal(normalizeBase('/'),'');
  assert.throws(() => normalizeBase('/../elsewhere'));
  assert.throws(() => normalizeBase('https://example.com'));
});
test('Complete build: subpath links, drafts, feed, sitemap, images and empty content', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(),'study-journal-test-'));
  try {
    for (const directory of ['templates','public']) await cp(path.join(projectRoot,directory),path.join(root,directory),{recursive:true});
    await cp(path.join(projectRoot,'site.config.json'),path.join(root,'site.config.json'));
    await mkdir(path.join(root,'content/posts'),{recursive:true});
    await writeFile(path.join(root,'content/posts/default-fixture.md'),'---\ntitle: "Default fixture"\ndate: "2026-11-03"\ncategory: "journal"\ntags: ["fixture"]\nsummary: "Build verification fixture"\ndraft: false\n---\n\n## Heading\n\nA temporary test fixture.\n');
    await writeFile(path.join(root,'content/posts/hidden-draft.md'),'---\ntitle: "DO-NOT-PUBLISH"\ndraft: true\n---\nPRIVATE-DRAFT-TEXT');
    const built = await build({root,basePath:'/study-log',url:'https://example.github.io'});
    assert.equal(built.postCount,1);
    const htmlFiles = [];
    async function walk(folder) { for (const file of await readdir(folder,{withFileTypes:true})) { const full = path.join(folder,file.name); if (file.isDirectory()) await walk(full); else if (file.name.endsWith('.html')) htmlFiles.push(full); } }
    await walk(built.outDir);
    assert.equal(htmlFiles.length,12);
    for (const file of htmlFiles) {
      const html = await readFile(file,'utf8');
      assert.ok(!html.includes('DO-NOT-PUBLISH'));
      assert.ok(!html.includes('PRIVATE-DRAFT-TEXT'));
      for (const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
        const link = match[1].replaceAll('&amp;','&');
        if (/^https?:/.test(link)) continue;
        assert.ok(link.startsWith('/study-log/'),`${file}: wrong base ${link}`);
        const route = decodeURIComponent(link.split(/[?#]/)[0].slice('/study-log'.length));
        const target = path.join(built.outDir,route,route.endsWith('/') ? 'index.html' : '');
        assert.ok((await readFile(target)).length,`Missing target: ${target}`);
      }
    }
    assert.match(await readFile(path.join(built.outDir,'feed.xml'),'utf8'),/https:\/\/example.github.io\/study-log\/notes\//);
    assert.match(await readFile(path.join(built.outDir,'sitemap.xml'),'utf8'),/\/study-log\/guide\/paper\//);
    assert.throws(() => markdown('## heading\n\n```\nunclosed'));
    await assert.rejects(() => build({root,outDir:path.dirname(root)}),/출력 폴더/);
    for (const file of await readdir(path.join(root,'content/posts'))) await rm(path.join(root,'content/posts',file));
    const empty = await build({root,basePath:''});
    assert.equal(empty.postCount,0);
    const home = await readFile(path.join(empty.outDir,'index.html'),'utf8');
    assert.match(home,/아직 첫 기록을 기다리고 있어요/);
    assert.ok(!home.includes('data-post '));
  } finally {
    const relative = path.relative(path.resolve(os.tmpdir()),path.resolve(root));
    assert.ok(relative.startsWith('study-journal-test-') && !relative.includes(path.sep));
    await rm(root,{recursive:true,force:true});
  }
});
