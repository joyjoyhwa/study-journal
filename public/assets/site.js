(() => {
  const toggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('#mobile-nav');
  const closeMenu = () => { toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', '메뉴 열기'); mobileNav.hidden = true; };
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    mobileNav.hidden = !open;
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') { closeMenu(); toggle.focus(); } });
  matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

  const section = document.querySelector('.feed-section');
  if (!section) return;
  const input = section.querySelector('#search');
  const cards = [...section.querySelectorAll('[data-post]')];
  const filters = [...section.querySelectorAll('[data-category-filter]')];
  const active = section.querySelector('.active-filter');
  const aliases = JSON.parse(section.dataset.categoryAliases || '{}');
  let category = 'all', tag = '';
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase('ko').trim();
  function syncFromUrl() {
    const params = new URLSearchParams(location.search);
    const requested = params.get('category') || 'all';
    category = Object.hasOwn(aliases, requested) ? aliases[requested] : requested;
    if (!filters.some(button => button.dataset.categoryFilter === category)) category = 'all';
    input.value = params.get('q') || '';
    tag = params.get('tag') || '';
    render();
  }
  function render() {
    const words = normalize(input.value).split(/\s+/).filter(Boolean);
    let count = 0;
    cards.forEach(card => {
      const matches = (category === 'all' || card.dataset.category === category)
        && (!tag || JSON.parse(card.dataset.tags).includes(tag))
        && words.every(word => normalize(card.dataset.search).includes(word));
      card.hidden = !matches;
      if (matches) count++;
    });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.categoryFilter === category)));
    section.querySelector('[data-results-count]').textContent = `${count}개의 기록이 있습니다.`;
    const empty = section.querySelector('.empty-state'); empty.hidden = count > 0;
    const isSearch = Boolean(words.length || tag);
    const experimentEmpty = category === 'experiment' && !isSearch;
    section.querySelector('[data-empty-title]').textContent = isSearch ? '찾는 기록이 아직 없어요.' : experimentEmpty ? '아직 공개된 실험 기록이 없어요.' : '아직 첫 기록을 기다리고 있어요.';
    section.querySelector('[data-empty-description]').textContent = isSearch ? '다른 단어로 찾아보거나 검색 조건을 지워 보세요.' : experimentEmpty ? '직접 수행한 실험의 조건과 관찰 결과를 정리하면 여기에 공개합니다.' : '새 기록이 올라오면 여기에서 읽을 수 있어요.';
    active.hidden = !tag;
    active.querySelector('span').textContent = tag ? `#${tag} 태그의 기록` : '';
  }
  function save(mode = 'replace') {
    const url = new URL(location.href);
    url.search = '';
    if (category !== 'all') url.searchParams.set('category', category);
    if (input.value.trim()) url.searchParams.set('q', input.value.trim());
    if (tag) url.searchParams.set('tag', tag);
    if (url.href !== location.href) history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', url);
    render();
  }
  filters.forEach(button => button.addEventListener('click', () => { category = button.dataset.categoryFilter; save('push'); }));
  input.addEventListener('input', () => save());
  section.querySelector('form').addEventListener('submit', event => { event.preventDefault(); save(); });
  section.querySelectorAll('[data-reset]').forEach(button => button.addEventListener('click', () => { category = 'all'; tag = ''; input.value = ''; save('push'); input.focus(); }));
  addEventListener('popstate', syncFromUrl);
  addEventListener('pageshow', syncFromUrl);
  syncFromUrl();
})();
