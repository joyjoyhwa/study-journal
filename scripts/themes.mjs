import { markdown, escapeHtml as esc } from './markdown.mjs';

// Values also generate the CSS and preview swatches, so the palette has one source.
export const themes = {
  forest: {
    key: 'forest', label: '숲빛', description: '종이색 바탕과 깊은 초록. 지금의 기본 색감입니다.',
    colors: { paper: '#f6f5f0', ink: '#243f39', green: '#26584e', line: '#dadfd5' }
  },
  ocean: {
    key: 'ocean', label: '바다빛', description: '서늘한 푸른 종이와 짙은 남색 잉크.',
    colors: { paper: '#f0f5fa', white: '#fcfdff', ink: '#243e59', text: '#354b61', muted: '#52677b', green: '#315f87', line: '#ccd8e5', soft: '#e0eaf4', accent: '#a35f2d' }
  },
  clay: {
    key: 'clay', label: '흙빛', description: '따뜻한 살구색 종이와 부드러운 적갈색 잉크.',
    colors: { paper: '#faf2eb', white: '#fffcf8', ink: '#54392e', text: '#624b3f', muted: '#795f50', green: '#8c4a35', line: '#e2cfc1', soft: '#f0e0d4', accent: '#8c4a35' }
  }
};

export function getTheme(key = 'forest') {
  if (typeof key !== 'string' || !Object.hasOwn(themes,key)) {
    throw new Error('theme는 forest, ocean, clay 중 하나여야 합니다. 생략하면 forest를 사용합니다.');
  }
  return themes[key];
}

export function paletteCSS() {
  // Do not emit forest overrides: an omitted/default theme keeps the original palette.
  return Object.values(themes).filter(theme => theme.key !== 'forest').map(theme =>
    `body[data-theme="${theme.key}"] {\n${Object.entries(theme.colors).map(([key,value]) => `  --${key}: ${value};`).join('\n')}\n}\n`
  ).join('\n');
}

export function themeBanner(href,arrow) {
  return `<a class="theme-banner" href="${href('/guide/themes/')}"><span class="theme-banner-dots" aria-hidden="true">${Object.values(themes).map(theme => `<i style="background:${theme.colors.green}"></i>`).join('')}</span><span><strong>글마다, 조금 다른 색감</strong><span>세 가지 테마를 미리 보고 골라 보세요.</span></span><span class="theme-banner-arrow">${arrow}</span></a>`;
}

export function themePages({shell,href,contents}) {
  const pages = new Map();
  const cards = (current = '',level = 2) => `<div class="theme-grid">${Object.values(themes).map(theme => `<a class="theme-card" href="${href(`/guide/themes/${theme.key}/`)}" style="--swatch-paper:${theme.colors.paper};--swatch-ink:${theme.colors.ink};--swatch-accent:${theme.colors.green};--swatch-line:${theme.colors.line}"${current === theme.key ? ' aria-current="page"' : ''}><span class="theme-sample" aria-hidden="true">가 Aa<span></span></span><span class="theme-key">${theme.key.toUpperCase()}${theme.key === 'forest' ? ' / 기본' : ''}</span><h${level}>${theme.label}</h${level}><p>${theme.description}</p><span class="theme-card-link">${current === theme.key ? '지금 보고 있는 색감' : '이 색감으로 읽어 보기 →'}</span></a>`).join('')}</div>`;
  pages.set('/guide/themes/',shell('글의 색감 고르기','/guide/themes/',`<div class="page-container theme-guide"><a class="back-link" href="${href('/guide/')}">← 기록 안내</a><div class="page-intro"><span class="eyebrow">A PALETTE FOR EACH PAGE</span><h1>글마다, 조금 다른 온도.</h1><p>내용은 그대로 두고, 종이와 잉크의 색을 골라 보세요.<br>읽는 흐름과 글의 여백은 세 테마가 함께 사용합니다.</p></div>${cards()}<section class="theme-instructions prose" aria-labelledby="theme-how"><h2 id="theme-how">글 맨 위에 한 줄만.</h2><p>Markdown 메타데이터의 <code>theme</code> 값으로 원하는 색감을 고릅니다. 예를 들어 바다빛은 다음처럼 적습니다.</p><pre><code>theme: "ocean"</code></pre><p><code>forest</code>, <code>ocean</code>, <code>clay</code> 중 하나를 쓰세요. 지정하지 않으면 지금의 기본색인 숲빛을 유지합니다. 분류와 관계없이 글마다 선택할 수 있습니다.</p><p>이 설정은 해당 글의 페이지에만 적용됩니다. 목록과 다른 글의 색감은 바뀌지 않습니다.</p></section></div>`));
  for (const theme of Object.values(themes)) {
    const route = `/guide/themes/${theme.key}/`;
    const preview = markdown(`## 본문을 읽는 느낌\n\n이 페이지는 **${theme.label} 테마의 미리보기**입니다. 실제 공부 내용이나 학습 기록을 담고 있지 않습니다. 긴 문장과 짧은 문단이 어떻게 보이는지, 강조한 부분이 편하게 읽히는지 살펴볼 수 있습니다.\n\n배경과 제목뿐 아니라 링크, 목차, 인용문과 표에도 같은 색의 흐름을 적용했습니다. 글자 크기와 줄 간격은 기존 글과 같습니다.\n\n> 인용문은 본문과 구별되는 옅은 바탕 위에 놓입니다. 배경이 달라져도 문장을 읽는 데 필요한 대비는 유지합니다.\n\n## 이 색감으로 글 쓰기\n\n글 맨 위의 메타데이터에 아래 한 줄을 넣으세요. 기존 본문을 바꿀 필요는 없습니다.\n\n\`\`\`yaml\ntheme: "${theme.key}"\n\`\`\`\n\n- 테마를 지정하지 않은 글은 기본 숲빛으로 표시됩니다.\n- 테마 이름을 잘못 적으면 빌드가 오류를 알려 줍니다.\n- 색감 선택은 글의 분류와 독립적입니다.\n\n## 표와 링크 확인\n\n| 요소 | 표시 방식 |\n| --- | --- |\n| 제목과 강조 | 짙은 잉크색 |\n| 본문과 설명 | 읽기 쉬운 명도 대비 |\n| 인용문과 표 머리글 | 옅은 같은 계열의 바탕 |\n\n[공부 일지 작성 틀](${href('/guide/daily/')})과 [논문 노트 작성 틀](${href('/guide/paper/')})에도 테마 항목을 넣어 두었습니다.\n\n[모든 공부 기록으로 돌아가기](${href('/notes/')})`);
    pages.set(route,shell(`${theme.label} 테마 미리보기`,route,`<div class="page-container article-page theme-preview"><a class="back-link" href="${href('/guide/themes/')}">← 색감 고르기</a><header class="article-header"><span class="eyebrow">PAGE PALETTE / ${theme.key.toUpperCase()}</span><h1>${esc(theme.label)}으로 펼친 페이지.</h1><p class="article-summary">${esc(theme.description)} 글을 천천히 읽으며 색감을 확인해 보세요.</p></header><div class="template-notice">색감과 본문 서식을 확인하는 미리보기입니다. 실제 공부 기록은 아닙니다.</div><div class="reading-layout">${contents(preview.headings)}<article class="prose">${preview.html}</article></div><section class="theme-switcher" aria-labelledby="other-themes"><h2 id="other-themes">다른 색감도 펼쳐 보세요.</h2>${cards(theme.key,3)}</section></div>`,{theme:theme.key}));
  }
  return pages;
}
