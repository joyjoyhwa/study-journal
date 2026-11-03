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
  };
  const schedule = () => { if (enabled && !document.hidden && !frame && ((scene && visible && desktop.matches) || progress)) frame = requestAnimationFrame(paint); };
  const stop = () => {
    cancelAnimationFrame(frame); frame = 0;
    animations.forEach(animation => animation.cancel()); animations.clear();
    observer?.disconnect();
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
        else if (entry.isIntersecting) { reveal(entry.target); observer.unobserve(entry.target); }
      }
    },{threshold:.12});
    if (hero) observer.observe(hero);
    document.querySelectorAll('.section-heading,.post-row,.guide-card,.direction-intro,.page-intro,.article-header,.theme-card,.theme-banner').forEach(node => {
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
      play(document.querySelector('.portal-image'),[{transform:'scale(1.10)'},{transform:'scale(1.045)'}],{duration:2200});
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
    if (document.hidden) { animations.forEach(animation => animation.cancel()); cancelAnimationFrame(frame); frame = 0; }
    else schedule();
  });
  window.addEventListener('pageshow',schedule);
  update();
})();
