// Original code-drawn visual language; the generated landscape is aspirational.
export function orbitArt(variant = 'sphere') {
  return `<div class="orbit-art orbit-${variant}" aria-hidden="true"><div class="orbit-halo"></div><svg viewBox="0 0 400 400" focusable="false"><g class="orbit-rotor"><circle cx="200" cy="200" r="160"/><ellipse cx="200" cy="200" rx="160" ry="61" transform="rotate(-35 200 200)"/><ellipse cx="200" cy="200" rx="160" ry="61" transform="rotate(35 200 200)"/><ellipse cx="200" cy="200" rx="61" ry="160"/><path d="M40 200h320M200 40v320"/><circle class="orbit-point" cx="344" cy="130" r="6"/><circle class="orbit-point" cx="74" cy="297" r="4"/></g><circle class="orbit-core" cx="200" cy="200" r="71"/><circle cx="200" cy="200" r="96" stroke-dasharray="1 11"/></svg><span class="orbit-cross cross-a">+</span><span class="orbit-cross cross-b">+</span></div>`;
}
export function portalHero(href, arrow) {
  const image = width => href(`/images/threshold-${width}.jpg`);
  return `<figure class="portal-figure"><section class="portal-hero" aria-labelledby="portal-title"><div class="portal-scene"><picture><img class="portal-image" src="${image(1672)}" srcset="${image(480)} 480w, ${image(960)} 960w, ${image(1672)} 1672w" sizes="(max-width:760px) 180vw, 100vw" width="1672" height="941" fetchpriority="high" decoding="async" alt="돌문 너머의 호수와 폭포, 공중 정원과 거대한 달을 담은 상상 풍경"></picture></div><div class="portal-shade" aria-hidden="true"></div><div class="portal-copy"><span class="portal-kicker"><i></i> A PERSONAL STUDY JOURNAL</span><h1 id="portal-title">작은 이해가,<br><em>새로운 세계</em>로.</h1><div class="portal-description"><span class="portal-index" aria-hidden="true">01 — ∞</span><div><p>논문을 읽고, 기초를 공부하고.<br>오늘의 이해를 내일의 질문으로 이어 갑니다.</p><a class="portal-link" href="${href('/notes/')}">공부 기록 펼쳐 보기 ${arrow}</a></div></div></div><a class="scroll-cue" href="#learning-path"><span>SCROLL TO EXPLORE</span><span aria-hidden="true">↓</span></a><div class="portal-seal">${orbitArt('seal')}</div></section><figcaption class="portal-caption"><span>풀다이브를 향한 공부 기록</span><span>AI 생성 이미지 · 상상한 가상 세계</span></figcaption></figure>`;
}
export function learningPath() {
  return `<section id="learning-path" class="learning-path" aria-labelledby="path-title"><div class="path-art">${orbitArt('path')}<span class="art-caption">THOUGHTS IN ORBIT / 01</span></div><div class="path-copy"><span class="eyebrow">THE WAY I LEARN</span><h2 id="path-title">한 번에 닿지 않아도,<br>조금씩 더 깊이.</h2><div class="path-lines"><p data-scroll-line><span>01</span>읽고.<small>새로운 생각을 만나는 시간.</small></p><p data-scroll-line><span>02</span>연결하고.<small>배운 것을 내 말로 엮는 시간.</small></p><p data-scroll-line><span>03</span>질문하고.<small>모르는 곳에서 다시 시작하는 시간.</small></p></div></div></section>`;
}
export function decoratePage(content) {
  // Decorate generated layout elements only; Markdown prose is never modified.
  content = content.replace(/(<header class="article-header">)([\s\S]*?)(<\/header>)/g,(_,open,inside,close) => `${open}<div class="chapter-copy">${inside}</div><div class="chapter-art">${orbitArt('chapter')}</div>${close}`);
  content = content.replace(/(<div class="page-intro">)([\s\S]*?)(<\/div>)/g,(_,open,inside,close) => `${open}<div class="chapter-copy">${inside}</div><div class="chapter-art">${orbitArt('index')}</div>${close}`);
  content = content.replace(/(<a class="guide-card[^>]*>)/g,`$1<div class="card-art">${orbitArt('card')}</div>`);
  return content;
}
export const postVisual = `<div class="post-visual" aria-hidden="true">${orbitArt('note')}<span>FIELD NOTES<br><b>THE LEARNING ARCHIVE</b></span></div>`;
export const motionControl = '<button class="motion-toggle" type="button" aria-pressed="false" hidden><span class="motion-symbol" aria-hidden="true">◌</span><span class="motion-label">페이지 움직임</span><span data-motion-state aria-hidden="true">끔</span></button>';
export function footerCoda(href, arrow) {
  return `<div class="footer-coda"><span class="eyebrow">TO BE CONTINUED</span><a href="${href('/notes/')}">다음 페이지는,<br><em>새로운 질문.</em><span class="coda-arrow">${arrow}</span></a></div>`;
}
