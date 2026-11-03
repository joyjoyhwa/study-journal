import { readFile, readdir, mkdir, writeFile, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { escapeHtml as esc, parseDocument, markdown } from './markdown.mjs';
import { getTheme, paletteCSS, themeBanner, themePages } from './themes.mjs';
import { portalHero, learningPath, decoratePage, postVisual, motionControl, footerCoda } from './experience.mjs';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const categories = { journal: '공부 일지', paper: '논문 노트', basics: '기초 공부' };
export function normalizeBase(value = '') {
  if (!value || value === '/') return '';
  if (!/^\/?[a-zA-Z0-9._/-]+\/?$/.test(value) || value.split('/').some(p => p === '..' || p === '.')) throw new Error('basePath는 /repository-name 형식이어야 합니다.');
  return '/' + value.replace(/^\/+|\/+$/g, '');
}
export function validatePost(data, filename) {
  try { getTheme(data.theme); } catch (error) { throw new Error(`${filename}: ${error.message}`); }
  for (const key of ['title', 'date', 'category', 'summary']) if (typeof data[key] !== 'string' || !data[key].trim()) throw new Error(`${filename}: ${key}가 필요합니다.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || Number.isNaN(Date.parse(data.date)) || new Date(data.date).toISOString().slice(0, 10) !== data.date) throw new Error(`${filename}: 날짜를 확인해 주세요.`);
  if (!categories[data.category]) throw new Error(`${filename}: category는 journal, paper, basics 중 하나입니다.`);
  if (!Array.isArray(data.tags) || data.tags.some(tag => typeof tag !== 'string' || !tag.trim())) throw new Error(`${filename}: tags는 문자열 배열이어야 합니다.`);
  if (data.draft !== undefined && typeof data.draft !== 'boolean') throw new Error(`${filename}: draft는 true 또는 false여야 합니다.`);
}
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
const book = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h14v18H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Zm1 0v18m4-12h5m-5 5h5"/></svg>';
const searchIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
const labelDate = date => date.replaceAll('-', '.');
const longDate = date => { const [y,m,d] = date.split('-'); return `${y}년 ${Number(m)}월 ${Number(d)}일`; };

export async function build(options = {}) {
  const root = options.root || projectRoot;
  const config = JSON.parse(await readFile(path.join(root, 'site.config.json'), 'utf8'));
  const base = normalizeBase(options.basePath ?? process.env.BASE_PATH ?? config.basePath);
  const origin = (options.url ?? process.env.SITE_URL ?? config.url).replace(/\/$/, '');
  if (origin && (!/^https?:\/\//.test(origin) || new URL(origin).pathname !== '/')) throw new Error('url에는 경로 없는 https://사용자.github.io 형식을 사용하세요.');
  const href = route => `${base}${route}`;
  const assetHash = createHash('sha256').update(paletteCSS());
  for (const name of ['style.css','themes.css','motion.css','editorial.css','site.js','motion.js']) assetHash.update(await readFile(path.join(root,'public/assets',name)));
  const assetVersion = assetHash.digest('hex').slice(0,12);
  const asset = route => `${href(route)}?v=${assetVersion}`;
  const resolveUrl = value => value.startsWith('/') ? href(value) : value;
  const files = (await readdir(path.join(root, 'content/posts'))).filter(f => f.endsWith('.md')).sort();
  const posts = [];
  for (const file of files) {
    if (!/^[a-z0-9][a-z0-9-]*\.md$/.test(file)) throw new Error(`${file}: 파일명은 영문 소문자, 숫자, 하이픈을 사용하세요.`);
    const { data, body } = parseDocument(await readFile(path.join(root, 'content/posts', file), 'utf8'));
    if (data.draft === true) continue;
    validatePost(data, file);
    const slug = file.slice(0, -3);
    const rendered = markdown(body, resolveUrl);
    posts.push({ ...data, slug, body, ...rendered, route: `/notes/${slug}/` });
  }
  posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  const pages = new Map();
  const shell = (title, route, content, options = {}) => {
    const description = options.description || config.description;
    const view = route === '/' ? 'home' : route === '/notes/' ? 'archive' : content.includes('reading-layout') ? 'reading' : 'index';
    content = decoratePage(content);
    const theme = getTheme(options.theme);
    const current = route.startsWith('/notes') ? 'notes' : route.startsWith('/guide') ? 'guide' : route === '/about/' ? 'about' : 'home';
    const nav = (key, url, name) => `<a href="${href(url)}"${current === key ? ' aria-current="page"' : ''}>${name}</a>`;
    return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title === config.title ? title : `${title} · ${config.shortTitle}`)}</title><meta name="description" content="${esc(description)}"><meta name="theme-color" content="${theme.colors.paper}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="${options.article ? 'article' : 'website'}"><meta property="og:locale" content="ko_KR">${origin ? `<link rel="canonical" href="${esc(origin + href(route))}"><meta property="og:url" content="${esc(origin + href(route))}"><link rel="alternate" type="application/atom+xml" title="${esc(config.title)}" href="${href('/feed.xml')}">` : ''}<link rel="icon" href="${href('/favicon.svg')}" type="image/svg+xml"><link rel="stylesheet" href="${asset('/assets/style.css')}"><link rel="stylesheet" href="${asset('/assets/themes.css')}"><link rel="stylesheet" href="${asset('/assets/motion.css')}"><link rel="stylesheet" href="${asset('/assets/editorial.css')}"><script src="${asset('/assets/site.js')}" defer></script><script src="${asset('/assets/motion.js')}" defer></script></head>
<body data-theme="${theme.key}" data-view="${view}"><a class="skip-link" href="#main">본문으로 건너뛰기</a><header class="site-header"><div class="header-inner"><a class="brand" href="${href('/')}"><span class="brand-icon">${book}</span><span>공부의 기록<span class="brand-sub">toward full dive</span></span></a><nav class="desktop-nav" aria-label="주 메뉴">${nav('home','/','홈')}${nav('notes','/notes/','모든 기록')}${nav('guide','/guide/','기록 안내')}${nav('about','/about/','이 공간에 대해')}</nav>${motionControl}<a class="header-search" href="${href('/notes/')}#search" aria-label="기록 검색">${searchIcon}</a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav" aria-label="메뉴 열기"><span></span><span></span></button></div><nav id="mobile-nav" class="mobile-nav" aria-label="모바일 메뉴" hidden>${nav('home','/','홈')}${nav('notes','/notes/','모든 기록')}${nav('guide','/guide/','기록 안내')}${nav('about','/about/','이 공간에 대해')}</nav></header>
<main id="main">${content}</main><footer class="site-footer">${footerCoda(href,arrow)}<div><a class="footer-brand" href="${href('/')}">공부의 기록<span class="small-dot"></span></a><p>풀다이브를 향한 공부 기록<br>이해한 만큼 적고, 모르는 것은 질문으로 남깁니다.</p></div><div class="footer-links"><a href="${href('/notes/')}">모든 기록</a><a href="${href('/guide/')}">기록 안내</a>${origin ? `<a href="${href('/feed.xml')}">RSS / Atom</a>` : ''}<a href="#main">맨 위로 ↑</a><span>작은 이해를 차곡차곡.</span></div></footer></body></html>`;
  };
  const tagLink = tag => `${href('/notes/')}?tag=${encodeURIComponent(tag)}`;
  const postCard = (post, index) => `<article class="post-row" data-post data-category="${esc(post.category)}" data-tags="${esc(JSON.stringify(post.tags))}" data-search="${esc([post.title,post.summary,...post.tags,post.body].join(' ').toLocaleLowerCase('ko'))}"><div class="post-date"><span class="row-number">${String(index + 1).padStart(2,'0')}</span><time datetime="${post.date}">${labelDate(post.date)}</time></div>${postVisual}<div class="post-content"><span class="category-label">${categories[post.category]}</span><h3><a href="${href(post.route)}">${esc(post.title)}</a></h3><p>${esc(post.summary)}</p><div class="tag-list">${post.tags.map(tag => `<a href="${tagLink(tag)}">#${esc(tag)}</a>`).join('')}</div></div><a class="row-open" href="${href(post.route)}" aria-label="${esc(post.title)} 읽기">${arrow}</a></article>`;
  const feed = (home = false) => `<section class="feed-section" aria-labelledby="feed-title"><div class="section-heading"><div><span class="eyebrow">${home ? 'LATEST ENTRIES' : 'THE ARCHIVE'}</span><h2 id="feed-title">${home ? '차곡차곡, 공부 기록' : '모든 공부 기록'}<span class="count-pill">${posts.length}</span></h2></div>${home ? `<a class="text-link" href="${href('/notes/')}">전체 보기 ${arrow}</a>` : '<p class="section-note">읽은 것, 이해한 것, 남겨 둔 질문.</p>'}</div><div class="filter-bar"><div class="filter-tabs" role="group" aria-label="기록 분류"><button type="button" data-category-filter="all" aria-pressed="true">전체</button>${Object.entries(categories).map(([key,name]) => `<button type="button" data-category-filter="${key}" aria-pressed="false">${name}</button>`).join('')}</div><form class="search-form" role="search"><label class="sr-only" for="search">공부 기록 검색</label>${searchIcon}<input type="search" id="search" name="q" placeholder="기록 속 단어 찾기" autocomplete="off"><button type="submit" class="sr-only">검색</button></form></div><div class="active-filter" hidden><span></span><button type="button" data-reset>선택 해제 ×</button></div><p class="sr-only" aria-live="polite" data-results-count></p><div class="post-list">${posts.map(postCard).join('')}</div><div class="empty-state" ${posts.length ? 'hidden' : ''}><span class="empty-symbol">${book}</span><h3 data-empty-title>아직 첫 기록을 기다리고 있어요.</h3><p data-empty-description>작은 이해 하나부터 차근차근 남겨 보려고 합니다.</p><button type="button" class="text-link" data-reset>모든 기록 보기 ${arrow}</button></div><noscript><p class="noscript-note">전체 기록을 표시하고 있습니다. 분류와 검색에는 JavaScript가 필요합니다.</p></noscript></section>`;
  const hero = portalHero(href,arrow);
  const directions = `<section class="directions" aria-labelledby="directions-title"><div class="direction-intro"><span class="eyebrow">HOW I KEEP NOTES</span><h2 id="directions-title">배운 만큼 적고,<br>다시 꺼내 봅니다.</h2><p>공부한 사실과 내 생각을 구분하고,<br>아직 모르는 부분도 함께 남깁니다.</p><a class="text-link" href="${href('/about/')}">이 공간의 이야기 ${arrow}</a></div><a class="guide-card" href="${href('/guide/daily/')}"><span class="card-kicker">01 / DAILY LOG</span><h3>하루의 공부를<br>돌아보는 여섯 가지.</h3><p>오늘 한 일부터 다음에 할 일까지.<br>공부의 흐름을 잃지 않도록.</p><span class="card-bottom">공부 일지 작성 틀 ${arrow}</span></a><a class="guide-card paper-card" href="${href('/guide/paper/')}"><span class="card-kicker">02 / PAPER NOTE</span><h3>논문 한 편을<br>내 말로 이해하기.</h3><p>질문, 방법, 결과, 그리고 한계.<br>저자의 주장과 내 해석을 나눠서.</p><span class="card-bottom">논문 노트 작성 틀 ${arrow}</span></a></section>`;
  pages.set('/','' + shell(config.title,'/', `<div class="page-container">${hero}${learningPath()}${feed(true)}${directions}</div>`));
  pages.set('/notes/', shell('모든 공부 기록','/notes/',`<div class="page-container archive-page"><div class="page-intro"><span class="eyebrow">ONE PAGE AT A TIME</span><h1>공부가 쌓이는 곳.</h1><p>잘 알게 된 것과 아직 모르는 것을 함께 기록합니다.</p></div>${feed()}</div>`));
  const contents = headings => `<aside class="toc"><span class="eyebrow">이 글의 순서</span><nav aria-label="글 목차">${headings.map((h,i) => `<a href="#${esc(h.id)}"><span>${String(i+1).padStart(2,'0')}</span>${esc(h.title)}</a>`).join('')}</nav></aside>`;
  for (const post of posts) {
    const content = `<div class="page-container article-page"><a class="back-link" href="${href('/notes/')}">← 모든 기록</a><header class="article-header"><div class="article-meta"><a class="category-label" href="${href('/notes/')}?category=${post.category}">${categories[post.category]}</a><span class="meta-divider"></span><time datetime="${post.date}">${longDate(post.date)}</time></div><h1>${esc(post.title)}</h1><p class="article-summary">${esc(post.summary)}</p><div class="tag-list">${post.tags.map(tag => `<a href="${tagLink(tag)}">#${esc(tag)}</a>`).join('')}</div></header><div class="reading-layout">${contents(post.headings)}<article class="prose">${post.html}<div class="article-end"><span class="small-dot"></span><p>오늘의 기록은 여기까지.<br>다음 공부에서 다시 이어갑니다.</p></div></article></div><div class="article-bottom"><a class="text-link" href="${href('/notes/')}">← 모든 공부 기록</a><a class="text-link" href="${href('/guide/')}">기록은 이렇게 남깁니다 ${arrow}</a></div></div>`;
    pages.set(post.route, shell(post.title,post.route,content,{description:post.summary,article:true,theme:post.theme}));
  }
  const guideHeader = `<div class="page-intro"><span class="eyebrow">A FRAME FOR LEARNING</span><h1>기록에도 작은 순서를.</h1><p>내용을 채우는 데 집중할 수 있도록, 두 가지 작성 틀을 준비했습니다.</p></div>`;
  pages.set('/guide/', shell('기록 안내','/guide/',`<div class="page-container guide-page">${guideHeader}<div class="guide-grid"><a class="guide-card" href="${href('/guide/daily/')}"><span class="card-kicker">01 / DAILY LOG</span><h2>공부 일지</h2><p>오늘 무엇을 어떻게 공부했는지.<br>여섯 가지 질문으로 하루를 돌아봅니다.</p><span class="card-bottom">작성 틀 펼치기 ${arrow}</span></a><a class="guide-card paper-card" href="${href('/guide/paper/')}"><span class="card-kicker">02 / PAPER NOTE</span><h2>논문 노트</h2><p>논문의 질문과 방법, 결과와 한계.<br>내 이해와 남은 질문을 따로 적습니다.</p><span class="card-bottom">작성 틀 펼치기 ${arrow}</span></a></div>${themeBanner(href,arrow)}<div class="principles"><span class="eyebrow">THREE SMALL PROMISES</span><h2>이렇게 기록하려고 합니다.</h2><ol><li><strong>한 일만 적기.</strong><span>계획은 다음에 할 일로, 실제로 한 일은 오늘의 기록으로.</span></li><li><strong>내 말로 설명하기.</strong><span>원문의 주장과 내 해석을 구분하고, 자료의 출처를 함께 적기.</span></li><li><strong>질문을 남기기.</strong><span>모르는 부분을 숨기지 않고, 다음 공부의 출발점으로 삼기.</span></li></ol></div></div>`));
  for (const [kind,title] of [['daily','공부 일지'],['paper','논문 노트']]) {
    const source = await readFile(path.join(root, 'templates', `${kind}.md`), 'utf8');
    const rendered = markdown(parseDocument(source).body, resolveUrl);
    const route = `/guide/${kind}/`;
    pages.set(route,shell(`${title} 작성 틀`,route,`<div class="page-container article-page template-page"><a class="back-link" href="${href('/guide/')}">← 기록 안내</a><header class="article-header"><span class="eyebrow">${kind === 'daily' ? 'DAILY LOG' : 'PAPER NOTE'} TEMPLATE</span><h1>${title} 작성 틀</h1><p class="article-summary">빈칸을 채우듯, 오늘 이해한 만큼만 적어 보세요.</p><a class="solid-link" href="${href(`/templates/${kind}.md`)}" download>Markdown 서식 내려받기 ↓</a></header><div class="template-notice">작성 안내용 서식입니다. 실제 공부 기록은 아닙니다.</div><div class="reading-layout">${contents(rendered.headings)}<article class="prose">${rendered.html}</article></div></div>`));
  }
  for (const [route,html] of themePages({shell,href,contents})) pages.set(route,html);
  const aboutBody = `## 이 공간에 남기고 싶은 것\n\n논문을 읽고 기초를 공부하면서, 오늘 무엇을 했고 어떻게 이해했는지 기록하는 개인 학습 노트입니다. 뇌공학과 풀다이브에 대한 관심을 출발점으로 삼았습니다.\n\n당장은 하나의 개념을 내 말로 설명하고, 논문의 한 문단을 제대로 읽는 것부터 시작하려고 합니다.\n\n## 세 가지 갈래\n\n- **공부 일지** — 하루에 무엇을 어떻게 공부했는지, 막힌 지점과 다음 할 일.\n- **논문 노트** — 논문의 질문, 방법, 결과, 한계와 내 이해.\n- **기초 공부** — 논문을 읽는 데 필요한 개념을 하나씩 정리한 기록.\n\n## 읽는 분께\n\n이곳의 글은 공부하는 과정에서 작성한 개인적인 이해와 질문입니다. 자료의 주장과 내 해석을 구분하고, 확인한 출처를 함께 남기겠습니다. 잘못 이해한 부분은 다시 공부하면서 고쳐 나가겠습니다.\n\n## 천천히, 오래\n\n얼마나 많이 했는지보다 무엇을 이해했는지 남기고 싶습니다. 작은 공부가 쌓여 다음 질문으로 이어지기를 바랍니다.`;
  const about = markdown(aboutBody,resolveUrl);
  pages.set('/about/',shell('이 공간에 대해','/about/',`<div class="page-container article-page about-page"><header class="article-header"><span class="eyebrow">ABOUT THIS NOTEBOOK</span><h1>작은 이해가 쌓여,<br>조금 더 먼 곳으로.</h1><p class="article-summary">풀다이브를 향한 공부 기록</p></header><div class="reading-layout">${contents(about.headings)}<article class="prose">${about.html}<a class="solid-link" href="${href('/notes/')}">첫 기록부터 읽기 ${arrow}</a></article></div></div>`));
  pages.set('/404.html',shell('페이지를 찾을 수 없어요','/404.html',`<div class="page-container not-found"><span class="eyebrow">404 / A MISSING PAGE</span><h1>이 페이지는 아직<br>펼칠 수 없어요.</h1><p>주소가 바뀌었거나 존재하지 않는 기록입니다.</p><a class="solid-link" href="${href('/notes/')}">모든 기록으로 ${arrow}</a></div>`));

  const outDir = path.resolve(options.outDir || path.join(root,'dist'));
  const relative = path.relative(path.resolve(root),outDir);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('출력 폴더는 프로젝트 내부의 전용 하위 폴더여야 합니다.');
  await rm(outDir,{recursive:true,force:true});
  await mkdir(outDir,{recursive:true});
  for (const [route,html] of pages) {
    const dest = path.join(outDir, route.endsWith('.html') ? route : route + 'index.html');
    await mkdir(path.dirname(dest),{recursive:true}); await writeFile(dest,html);
  }
  await cp(path.join(root,'public'),outDir,{recursive:true});
  await writeFile(path.join(outDir,'assets/themes.css'),paletteCSS() + await readFile(path.join(root,'public/assets/themes.css'),'utf8'));
  await cp(path.join(root,'templates'),path.join(outDir,'templates'),{recursive:true});
  await writeFile(path.join(outDir,'.nojekyll'),'');
  if (origin) {
    const absolute = route => esc(origin + href(route));
    await writeFile(path.join(outDir,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...pages.keys()].filter(r => r !== '/404.html').map(r => `<url><loc>${absolute(r)}</loc></url>`).join('')}</urlset>`);
    await writeFile(path.join(outDir,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${origin}${href('/sitemap.xml')}\n`);
    const updated = `${posts[0]?.date || '1970-01-01'}T00:00:00+09:00`;
    await writeFile(path.join(outDir,'feed.xml'),`<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>${esc(config.title)}</title><id>${absolute('/')}</id><link href="${absolute('/')}"/><link href="${absolute('/feed.xml')}" rel="self"/><updated>${updated}</updated><author><name>${esc(config.shortTitle)}</name></author>${posts.map(p => `<entry><title>${esc(p.title)}</title><id>${absolute(p.route)}</id><link href="${absolute(p.route)}"/><updated>${p.date}T00:00:00+09:00</updated><summary>${esc(p.summary)}</summary></entry>`).join('')}</feed>`);
  }
  return { outDir, basePath:base, pageCount:pages.size, postCount:posts.length, origin };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await build(),null,2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
