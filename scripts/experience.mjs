import {signalMark} from './story.mjs';
const orbitArt = () => signalMark();

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
