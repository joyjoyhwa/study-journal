/* Bounded, opt-in enhancement: the HTML and CSS are fully visible without this. */
(() => {
  const body = document.body;
  const control = document.querySelector('.motion-toggle');
  if (!control || !window.matchMedia || !Element.prototype.animate || !window.IntersectionObserver) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 761px) and (pointer: fine)');
  const connection = navigator.connection;
  const key = 'study-journal-motion';
  let preference;
  try { preference = localStorage.getItem(key); } catch { /* Private browsing still works. */ }
  const hero = document.querySelector('.portal-hero');
  const scene = document.querySelector('.portal-scene');
  const prose = document.querySelector('.reading-layout .prose');
  const orbits = [...document.querySelectorAll('.orbit-art')];
  const lines = [...document.querySelectorAll('[data-scroll-line]')];
  const headings = [...document.querySelectorAll('.prose h2[id]')];
  const tocLinks = [...document.querySelectorAll('.toc a')];
  const visibleLines = new Set();
  let pointerFrame = 0;
  let progress;
  if (prose) {
    progress = document.createElement('div');
    progress.className = 'reading-progress';
    progress.setAttribute('aria-hidden','true');
    body.append(progress);
  }
  let enabled = false;
  let visible = true;
  let frame = 0;
  let observer;
  let entered = false;
  const seen = new WeakSet();
  const animations = new Set();
  const constrained = () => connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '');
  const play = (node, frames, options) => {
    if (!enabled || document.hidden || !node) return;
    const animation = node.animate(frames, {duration:750,easing:'cubic-bezier(.2,.7,.2,1)',...options});
    animations.add(animation);
    animation.finished.then(() => animations.delete(animation),() => animations.delete(animation));
  };
  const paint = () => {
    frame = 0;
    if (!enabled || document.hidden) return;
    if (scene && visible && desktop.matches) {
      // 24px maximum: no continuous RAF loop, pointer tracking, or scroll interception.
      const rect = hero.getBoundingClientRect();
      const offset = Math.max(-24, Math.min(24, (innerHeight / 2 - rect.top - rect.height / 2) * .045));
      scene.style.setProperty('--scene-y',`${offset.toFixed(2)}px`);
    }
    if (progress) {
      const rect = prose.getBoundingClientRect();
      const value = Math.max(0,Math.min(1,(innerHeight - rect.top)/(rect.height + innerHeight)));
      progress.style.setProperty('--reading-progress',value.toFixed(4));
    }
    visibleLines.forEach(node => {
      const rect = node.getBoundingClientRect();
      const distance = (innerHeight * .55 - rect.top) / innerHeight;
      node.dataset.current = String(distance > -.1 && distance < .35);
      if (desktop.matches) node.style.setProperty('--line-shift',`${Math.max(-12,Math.min(12,distance * 30)).toFixed(2)}px`);
    });
    if (headings.length) {
      const current = [...headings].reverse().find(node => node.getBoundingClientRect().top < innerHeight * .4) || headings[0];
      tocLinks.forEach(link => {
        if (decodeURIComponent(link.hash.slice(1)) === current.id) link.setAttribute('aria-current','location');
        else link.removeAttribute('aria-current');
      });
    }
  };
  const schedule = () => { if (enabled && !document.hidden && !frame && ((scene && visible && desktop.matches) || progress || visibleLines.size)) frame = requestAnimationFrame(paint); };
  const stop = () => {
    cancelAnimationFrame(frame); frame = 0;
    animations.forEach(animation => animation.cancel()); animations.clear();
    observer?.disconnect();
    cancelAnimationFrame(pointerFrame); pointerFrame = 0;
    orbits.forEach(node => { node.dataset.active = 'false'; node.style.removeProperty('--tilt-x'); node.style.removeProperty('--tilt-y'); });
    lines.forEach(node => { node.style.removeProperty('--line-shift'); delete node.dataset.current; });
    visibleLines.clear();
    scene?.style.removeProperty('--scene-y');
    progress?.style.removeProperty('--reading-progress');
  };
  const reveal = node => {
    if (seen.has(node) || node.hidden) return;
    seen.add(node);
    // Keep every glyph at full opacity, including while the entrance is in flight.
    play(node,[{transform:'translateY(16px)'},{transform:'translateY(0)'}],{duration:680});
  };
  const start = () => {
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === hero) { visible = entry.isIntersecting; schedule(); }
        else if (entry.target.matches('.orbit-art')) entry.target.dataset.active = String(entry.isIntersecting);
        else if (entry.target.matches('[data-scroll-line]')) { if (entry.isIntersecting) visibleLines.add(entry.target); else visibleLines.delete(entry.target); schedule(); }
        else if (entry.isIntersecting) { reveal(entry.target); observer.unobserve(entry.target); }
      }
    },{threshold:.12});
    if (hero) observer.observe(hero);
    [...orbits,...lines].forEach(node => observer.observe(node));
    document.querySelectorAll('.section-heading,.post-row,.guide-card,.direction-intro,.chapter-copy,.theme-card,.theme-banner,.footer-coda').forEach(node => {
      const rect = node.getBoundingClientRect();
      if (performance.now() >= 1600 && rect.top < innerHeight && rect.bottom > 0) seen.add(node);
      observer.observe(node);
    });
    // A late script must not replay an entrance over a page someone is already reading.
    if (!entered && performance.now() < 1600 && scrollY < 80) {
      entered = true;
      document.querySelectorAll('.portal-copy > *').forEach((node,index) => {
        play(node,[{transform:'translateY(18px)'},{transform:'translateY(0)'}],{duration:850,delay:index * 70});
      });
      play(document.querySelector('.portal-image'),[{transform:'scale(1.12)'},{transform:'scale(1.055)'}],{duration:2400});
    }
    entered = true;
    schedule();
  };
  const update = () => {
    const forced = reduce.matches || constrained();
    const next = !forced && preference !== 'off';
    control.hidden = false;
    control.disabled = Boolean(forced);
    control.setAttribute('aria-pressed',String(next));
    control.querySelector('[data-motion-state]').textContent = forced ? '설정에 따라 끔' : next ? '켬' : '끔';
    control.title = reduce.matches ? '기기의 동작 줄이기 설정을 따릅니다.' : constrained() ? '데이터 절약 또는 느린 연결에서는 움직임을 줄입니다.' : '이 브라우저에서 페이지 움직임을 켜거나 끕니다.';
    body.dataset.motion = next ? 'on' : 'off';
    if (next === enabled) return;
    enabled = next;
    if (enabled) start(); else stop();
  };
  control.addEventListener('click',() => {
    preference = enabled ? 'off' : 'on';
    try { localStorage.setItem(key,preference); } catch { /* Preference is optional. */ }
    update();
  });
  reduce.addEventListener('change',update);
  connection?.addEventListener?.('change',update);
  desktop.addEventListener('change',() => { scene?.style.removeProperty('--scene-y'); schedule(); });
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  document.addEventListener('visibilitychange',() => {
    body.dataset.away = String(document.hidden);
    if (document.hidden) { animations.forEach(animation => animation.cancel()); cancelAnimationFrame(frame); frame = 0; }
    else schedule();
  });
  document.querySelectorAll('.post-row,.guide-card,.chapter-art,.path-art').forEach(stage => {
    const art = stage.querySelector('.orbit-art');
    if (!art) return;
    stage.addEventListener('pointermove',event => {
      if (!enabled || !desktop.matches || document.hidden) return;
      cancelAnimationFrame(pointerFrame);
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        if (!enabled) return;
        const rect = stage.getBoundingClientRect();
        const x = Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
        const y = Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height));
        art.style.setProperty('--tilt-x',`${((.5-y)*12).toFixed(2)}deg`);
        art.style.setProperty('--tilt-y',`${((x-.5)*14).toFixed(2)}deg`);
        stage.querySelector('.post-visual')?.style.setProperty('--pointer-x',`${Math.round(x*100)}%`);
        stage.querySelector('.post-visual')?.style.setProperty('--pointer-y',`${Math.round(y*100)}%`);
      });
    },{passive:true});
    stage.addEventListener('pointerleave',() => { cancelAnimationFrame(pointerFrame); pointerFrame = 0; art.style.removeProperty('--tilt-x'); art.style.removeProperty('--tilt-y'); });
  });
  window.addEventListener('pageshow',schedule);
  update();
})();
