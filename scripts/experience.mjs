import {signalMark} from './story.mjs';
const orbitArt = () => signalMark();

export function decoratePage(content) {
  // The notebook design keeps generated layout plain: no injected art (user decision 2026-11-21).
  return content;
}
export const postVisual = '';
export const motionControl = '<button class="motion-toggle" type="button" aria-pressed="false" hidden><span class="motion-symbol" aria-hidden="true">◌</span><span class="motion-label">페이지 움직임</span><span data-motion-state aria-hidden="true">끔</span></button>';
export function footerCoda(href, arrow) {
  return `<div class="footer-coda"><span class="eyebrow">TO BE CONTINUED</span><a href="${href('/notes/')}">다음 페이지는,<br><em>새로운 질문.</em><span class="coda-arrow">${arrow}</span></a></div>`;
}
