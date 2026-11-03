const root = document.querySelector('.scroll-story');
if (root && window.MutationObserver && CSS.supports('position','sticky')) {
  const modelURL = new URL('./story-model.js',import.meta.url);
  modelURL.search = new URL(import.meta.url).search;
  // If this dependency fails, the four illustrated HTML chapters stay visible.
  const {storyState,sceneStops,clamp} = await import(modelURL.href);
  const stage=root.querySelector('.story-stage');
  const scenes=[...root.querySelectorAll('[data-scene]')];
  const signal=root.querySelector('.story-signal');
  const trail=root.querySelector('.signal-trail polyline');
  const navigation=root.querySelector('.story-chapters');
  const buttons=[...navigation.querySelectorAll('button')];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const header=document.querySelector('.site-header');
  let enhanced=false,frame=0,lastProgress=0,lastLayout;
  // This history entry has its own layout-aware restoration, including static mode.
  if('scrollRestoration' in history)history.scrollRestoration='manual';
  const head=()=>header.getBoundingClientRect().height;
  const range=()=>Math.max(1,root.offsetHeight-stage.offsetHeight);
  const start=()=>root.getBoundingClientRect().top+scrollY-head();
  function render(progress) {
    const state=storyState(progress);lastProgress=state.progress;
    root.dataset.progress=state.progress.toFixed(4);root.dataset.scene=String(state.active);
    root.dataset.travelling=String(state.travelling);
    stage.style.setProperty('--story-progress',state.progress.toFixed(5));
    stage.style.setProperty('--book-lift',state.bookLift.toFixed(4));
    stage.style.setProperty('--network',state.network.toFixed(4));
    stage.style.setProperty('--gate-open',state.gateOpen.toFixed(4));
    stage.style.setProperty('--gate-zoom',state.gateZoom.toFixed(4));
    stage.style.setProperty('--world-zoom',state.worldZoom.toFixed(4));
    stage.style.setProperty('--book-opacity',state.bookOpacity.toFixed(4));
    stage.style.setProperty('--map-opacity',state.mapOpacity.toFixed(4));
    stage.style.setProperty('--arrival',state.arrival.toFixed(4));stage.style.setProperty('--floor-opacity',state.floorOpacity.toFixed(4));stage.style.setProperty('--camera-rise',state.cameraRise.toFixed(4));
    state.depthScales.forEach((value,index)=>{stage.style.setProperty(`--depth-${index}`,value.toFixed(4));stage.style.setProperty(`--depth-opacity-${index}`,state.depthOpacities[index].toFixed(4));});
    signal.style.setProperty('--signal-x',state.point.x.toFixed(5));
    signal.style.setProperty('--signal-y',state.point.y.toFixed(5));
    signal.style.setProperty('--signal-scale',state.point.scale.toFixed(4));
    trail.setAttribute('points',state.trail.map(p=>`${(p.x*1200).toFixed(1)},${(p.y*800).toFixed(1)}`).join(' '));
    scenes.forEach((scene,index)=>{
      const weight=state.weights[index];scene.dataset.shown=String(weight>.001);
      scene.style.setProperty('--scene-opacity',weight.toFixed(4));
      scene.style.setProperty('--scene-y','0px');
      scene.style.setProperty('--caption-y','0px');
      scene.setAttribute('aria-hidden',String(index!==state.active));
    });
    buttons.forEach((button,index)=>{if(index===state.active)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
  }
  function paint(){frame=0;if(enhanced&&!document.hidden){const rect=root.getBoundingClientRect();lastLayout={inside:rect.top<head()&&rect.bottom>head(),below:rect.bottom<head(),height:root.offsetHeight};const progress=clamp((scrollY-start())/range());if(Math.abs(progress-lastProgress)>.00001)render(progress);}}
  function schedule(){if(enhanced&&!document.hidden&&!frame)frame=requestAnimationFrame(paint);}
  function syncMode(){
    const next=document.body.dataset.motion==='on'&&!reduce.matches;
    if(next===enhanced)return;
    const rect=root.getBoundingClientRect();
    // The reduced-motion CSS safety net takes effect before its change event.
    const previous=enhanced&&reduce.matches?lastLayout:null;
    const beforeHeight=previous?.height??root.offsetHeight;
    const wasBelow=previous?.below??rect.bottom<head(),wasInside=previous?.inside??(rect.top<head()&&rect.bottom>head());
    let chapter=Number(root.dataset.scene||0);
    if(!enhanced&&wasInside)chapter=scenes.reduce((best,scene,index)=>Math.abs(scene.getBoundingClientRect().top-head())<Math.abs(scenes[best].getBoundingClientRect().top-head())?index:best,chapter);
    enhanced=next;root.classList.toggle('is-story-enhanced',next);navigation.hidden=!next;
    cancelAnimationFrame(frame);frame=0;
    if(next){render(wasInside?sceneStops[chapter]:0);if(wasInside)scrollTo({top:start()+range()*sceneStops[chapter],behavior:'instant'});}
    else{scenes.forEach(scene=>{scene.removeAttribute('aria-hidden');scene.removeAttribute('data-shown');scene.removeAttribute('style');});stage.removeAttribute('style');if(wasInside)scrollTo({top:scenes[chapter].getBoundingClientRect().top+scrollY-head()-12,behavior:'instant'});}
    if(wasBelow)scrollBy({top:root.offsetHeight-beforeHeight,behavior:'instant'});
    paint();
  }
  buttons.forEach((button,index)=>button.addEventListener('click',()=>{
    if(!enhanced)return;scrollTo({top:start()+range()*sceneStops[index],behavior:'instant'});paint();
  }));
  navigation.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const current=buttons.indexOf(document.activeElement);
    const index=event.key==='Home'?0:event.key==='End'?buttons.length-1:clamp(current+(event.key==='ArrowRight'?1:-1),0,buttons.length-1);
    buttons[index].focus({preventScroll:true});buttons[index].click();
  });
  document.querySelectorAll('.story-skip').forEach(link=>link.addEventListener('click',event=>{
    const target=document.getElementById('study-records');if(!target)return;
    event.preventDefault();target.focus({preventScroll:true});scrollTo({top:target.getBoundingClientRect().top+scrollY-head()-22,behavior:'instant'});
  }));
  new MutationObserver(syncMode).observe(document.body,{attributes:true,attributeFilter:['data-motion']});
  reduce.addEventListener('change',syncMode);
  addEventListener('scroll',schedule,{passive:true});
  let lastWidth=innerWidth;
  addEventListener('resize',()=>{
    const changedWidth=innerWidth!==lastWidth;lastWidth=innerWidth;
    if(enhanced){const rect=root.getBoundingClientRect();if(changedWidth&&rect.top<head()&&rect.bottom>head())scrollTo({top:start()+range()*lastProgress,behavior:'instant'});render(lastProgress);schedule();}
  },{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else schedule();});
  const storageKey=()=>`study-journal-story:${location.pathname}${location.search}`;
  addEventListener('pagehide',()=>{
    const rect=root.getBoundingClientRect();
    const chapter=enhanced?storyState(lastProgress).active:scenes.reduce((best,scene,index)=>Math.abs(scene.getBoundingClientRect().top-head())<Math.abs(scenes[best].getBoundingClientRect().top-head())?index:best,0);
    try{sessionStorage.setItem(storageKey(),JSON.stringify({progress:enhanced?lastProgress:sceneStops[chapter],chapter,staticOffset:enhanced?null:-scenes[chapter].getBoundingClientRect().top,inside:rect.top<=head()&&rect.bottom>head(),below:rect.bottom<=head(),gap:scrollY-(rect.bottom+scrollY),y:scrollY}));}catch{}
  });
  function restore(){
    if(location.hash){const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(target&&!root.contains(target))scrollTo({top:target.getBoundingClientRect().top+scrollY-head()-22,behavior:'instant'});return;}
    let saved;try{saved=JSON.parse(sessionStorage.getItem(storageKey()));}catch{}
    if(!saved)return;
    if(saved.inside){if(enhanced)scrollTo({top:start()+range()*saved.progress,behavior:'instant'});else{const scene=scenes[saved.chapter??storyState(saved.progress).active];scrollTo({top:scene.getBoundingClientRect().top+scrollY+(saved.staticOffset??-head()-12),behavior:'instant'});}}
    else if(saved.below)scrollTo({top:root.getBoundingClientRect().bottom+scrollY+saved.gap,behavior:'instant'});
    else scrollTo({top:saved.y,behavior:'instant'});
    paint();
  }
  syncMode();
  const type=performance.getEntriesByType('navigation')[0]?.type;
  if(type==='back_forward'||type==='reload'||location.hash)requestAnimationFrame(()=>requestAnimationFrame(restore));
  addEventListener('pageshow',event=>{if(event.persisted){syncMode();requestAnimationFrame(restore);}else schedule();});
  addEventListener('hashchange',()=>requestAnimationFrame(restore));
  root.dataset.ready='true';
}
