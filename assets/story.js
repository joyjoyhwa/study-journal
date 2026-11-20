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
  // --- Cinematic layers, created at runtime so the static markup stays untouched. ---
  const space=root.querySelector('.story-space'),geometry=root.querySelector('.space-geometry');
  const gates=[0,1,2].map(index=>root.querySelector(`.depth-gate-${index}`));
  const book=root.querySelector('.space-book'),map=root.querySelector('.space-map'),landscapeLayer=root.querySelector('.space-landscape');
  const layer=(parent,className,before)=>{const node=document.createElement('div');node.className=className;node.setAttribute('aria-hidden','true');parent.insertBefore(node,before||null);return node;};
  layer(gates[1],'space-seam');
  layer(geometry,'space-rays',geometry.querySelector('.space-arrival'));
  layer(geometry,'space-bloom',geometry.querySelector('.space-arrival'));
  const dustCanvas=document.createElement('canvas');dustCanvas.className='space-dust';dustCanvas.setAttribute('aria-hidden','true');space.append(dustCanvas);
  const small=matchMedia('(max-width: 760px)');
  const setFilter=(node,value)=>{if(node.style.filter!==value)node.style.filter=value;};
  // Captions behave like film titles: one plate at a time, faded in elapsed time, never cut.
  const captions=scenes.map(scene=>{const node=scene.querySelector('.story-caption');return {node,h2:node.querySelector('h2'),p:node.querySelector('p'),level:0,dir:1,rising:false,from:null,painted:{h2:0,p:0,blur:0}};});
  let lastCue=null,captionTarget=-1,held=-1,lastScrollAt=-1e9,direction=1,loopFrame=0,lastLoop=0,state=null,visible=true;
  const easeOut=t=>1-(1-t)**3;
  function clearText(caption){caption.h2.removeAttribute('style');caption.p.removeAttribute('style');caption.painted={h2:0,p:0,blur:0};}
  // A transition always starts from what is on screen, so reversing mid-fade never jumps.
  function beginTransition(caption,rising){
    const scale=small.matches?.7:1,fresh=caption.level<=0;
    caption.rising=rising;caption.dir=direction;
    caption.from={L:caption.level,
      h2:fresh?direction*14*scale:caption.painted.h2,p:fresh?direction*22*scale:caption.painted.p,
      blur:fresh?(small.matches?3:5):caption.painted.blur};
  }
  function paintCaption(caption){
    const L=caption.level;
    caption.node.style.opacity=L.toFixed(3);
    if(L<=0){delete caption.node.dataset.cap;clearText(caption);return;}
    caption.node.dataset.cap='on';
    const f=caption.from||{L,h2:0,p:0,blur:0},scale=small.matches?.7:1;let h2,p,blur;
    if(caption.rising){
      const e=easeOut(f.L<1?Math.min(1,Math.max(0,(L-f.L)/(1-f.L))):1);
      h2=f.h2*(1-e);p=f.p*(1-e);blur=f.blur*(1-e);
    }else{
      const k=f.L>0?Math.min(1,Math.max(0,(f.L-L)/f.L)):1,target=-caption.dir*10*scale;
      h2=f.h2+(target-f.h2)*k;p=f.p+(target-f.p)*k;blur=f.blur+(3-f.blur)*k;
    }
    caption.painted={h2,p,blur};
    caption.h2.style.transform=`translate3d(0,${h2.toFixed(2)}px,0)`;caption.p.style.transform=`translate3d(0,${p.toFixed(2)}px,0)`;
    const filter=blur>.05?`blur(${blur.toFixed(2)}px)`:'';setFilter(caption.h2,filter);setFilter(caption.p,filter);
  }
  function chooseCaption(now){
    if(!state)return -1;
    const cue=lastCue=s3d?caption3dFn(shown3d,storyState(shown3d).active):state;
    // A title restored by a pause stays held for as long as its chapter is current, in or out of the handoff zone.
    if(held!==cue.captionRest)held=-1;
    if(cue.caption>=0)return cue.caption;
    // Inside a handoff: no title. If the reader stops there, the chapter's title returns once.
    if(held<0&&cue.captionRest>=0&&now-lastScrollAt>220&&(!s3d||shown3d===lastProgress))held=cue.captionRest;
    return held;
  }
  function updateCaptions(now,dt){
    captionTarget=chooseCaption(now);
    let moving=false;
    captions.forEach((caption,index)=>{
      const goal=index===captionTarget?1:0;
      if(goal>caption.level){
        if(captions.some((other,j)=>j!==index&&other.level>.10)){moving=true;return;}
        if(!caption.rising||!caption.from)beginTransition(caption,true);
        caption.level=Math.min(1,caption.level+Math.min(.12,dt/450));moving=true;
      }else if(goal<caption.level){
        if(caption.rising||!caption.from)beginTransition(caption,false);
        caption.level=Math.max(0,caption.level-Math.min(.12,dt/280));moving=true;
      }else return;
      paintCaption(caption);
    });
    return moving||(visible&&lastCue&&lastCue.caption<0&&held<0&&lastCue.captionRest>=0);
  }
  function snapCaptions(){
    if(s3d){const cue=caption3dFn(shown3d,storyState(shown3d).active),target=cue.caption;held=-1;captions.forEach((caption,index)=>{caption.level=index===target?1:0;caption.rising=true;caption.from=null;paintCaption(caption);});wake();return;}
    const target=state?(state.caption>=0?state.caption:state.captionRest):-1;held=state&&state.caption<0?target:-1;
    captions.forEach((caption,index)=>{caption.level=index===target?1:0;caption.rising=true;caption.from=null;paintCaption(caption);});
  }
  function clearCaptions(){captions.forEach(caption=>{caption.node.removeAttribute('style');delete caption.node.dataset.cap;clearText(caption);caption.level=0;caption.from=null;});}
  // Dust: deterministic 3D motes that stream past the lens only while the camera moves; at rest it is gone.
  const dust=(()=>{
    const ctx=dustCanvas.getContext('2d');if(!ctx)return {draw(){return false;},resize(){}};
    let width=0,height=0,ratio=1,lastZ=null,drift=0,energy=0,painted=false;
    const motes=Array.from({length:64},(_,i)=>{const r=(n=>{const x=Math.sin(i*127.1+n*311.7)*43758.5453;return x-Math.floor(x);});return {x:r(1)*2-1,y:r(2)*1.6-.8,z:r(3)*3,size:.6+r(4)*1.4,tone:r(5)>.5?'201,160,90':'160,130,80',twinkle:r(6)*6.28};});
    function resize(){
      const rect=space.getBoundingClientRect();
      ratio=Math.min(devicePixelRatio||1,small.matches?1:1.5);width=rect.width;height=rect.height;
      dustCanvas.width=Math.max(1,Math.round(width*ratio));dustCanvas.height=Math.max(1,Math.round(height*ratio));lastZ=null;energy=0;painted=false;
    }
    function draw(now,dt){
      if(!state||!width)return false;
      const d=state.depthScales,cameraZ=1.4*Math.log(d[1]/.55)+.9*Math.log(d[2]/.38);
      const velocity=lastZ===null?0:Math.min(1,Math.abs(cameraZ-lastZ)*14);lastZ=cameraZ;
      energy=Math.max(velocity,energy*Math.exp(-dt/350));
      const envelope=.7*energy*(1+state.rays/.3*.6);
      if(envelope<.004){if(painted){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,dustCanvas.width,dustCanvas.height);painted=false;}energy=0;return false;}
      // Origin follows the doorway every frame (the mobile camera rises during the passage).
      const rect=space.getBoundingClientRect(),g=geometry.getBoundingClientRect();
      const cx=g.left-rect.left+g.width*.65,cy=g.top-rect.top+g.height*.55;
      drift=(drift+dt*.00004)%3;
      const count=small.matches?28:64,spread=Math.max(width,height)*.55,maxStreak=small.matches?24:48;
      ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);ctx.globalCompositeOperation='source-over';ctx.lineCap='round';
      for(let i=0;i<count;i++){
        const m=motes[i];
        const z=3-((m.z+cameraZ+drift)%3+3)%3+.12,zPrev=z+Math.min(.4,velocity*.25);
        const x=cx+m.x/z*spread,y=cy+m.y/z*spread,xp=cx+m.x/zPrev*spread,yp=cy+m.y/zPrev*spread;
        if(x<-60||x>width+60||y<-60||y>height+60)continue;
        const near=Math.min(1,1.2/z),alpha=envelope*near*(.55+.45*Math.sin(now*.0012+m.twinkle));
        if(alpha<.01)continue;
        let dx=x-xp,dy=y-yp;const len=Math.hypot(dx,dy);if(len>maxStreak){dx*=maxStreak/len;dy*=maxStreak/len;}
        ctx.strokeStyle=`rgba(${m.tone},${alpha.toFixed(3)})`;ctx.lineWidth=m.size*near*1.6;
        ctx.beginPath();ctx.moveTo(x-dx,y-dy);ctx.lineTo(x+.01,y);ctx.stroke();
      }
      painted=true;return true;
    }
    return {draw,resize};
  })();
  // --- Real 3D flight (Three.js). The 2D cinematic layer stays underneath as the poster and the fallback. ---
  let shownWaiters=[];
  const onScreen=()=>{const rect=root.getBoundingClientRect();return rect.bottom>header.getBoundingClientRect().bottom+1&&rect.top<innerHeight;};
  function flushShown(){if(visible&&!document.hidden&&shownWaiters.length&&onScreen()){const waiting=shownWaiters;shownWaiters=[];waiting.forEach(resolve=>resolve());}}
  const whenShown=()=>new Promise(resolve=>{shownWaiters.push(resolve);flushShown();});
  let s3d=null,s3dLoading=0,no3d=false,caption3dFn=null,s3dToken=0,shown3d=0;
  function landscapeURL(){const img=landscapeLayer.querySelector('img');const list=(img.getAttribute('srcset')||'').split(',').map(entry=>entry.trim().split(/\s+/)[0]).filter(Boolean);return new URL((small.matches?list[1]:list[list.length-1])||img.currentSrc||img.src,location.href).href;}
  async function start3d(){
    if(s3d||no3d||!enhanced||(s3dLoading&&s3dLoading===s3dToken))return;const token=++s3dToken,stale=()=>!enhanced||token!==s3dToken;s3dLoading=token;
    try{
      const url=new URL('./story3d.js',import.meta.url);url.search=new URL(import.meta.url).search;
      const mod=await import(url.href);
      let instance=null;
      instance=stale()?null:await mod.createStory3D({stage,imageURL:landscapeURL(),small:small.matches,progress:()=>lastProgress,cancelled:stale,whenShown,onFrame:p=>{shown3d=p;wake();},onLost:()=>{if(s3d===instance){no3d=true;stop3d();}}});
      if(instance&&!stale()&&!s3d){
        s3d=instance;caption3dFn=mod.caption3d;shown3d=lastProgress;s3d.setProgress(lastProgress,true);s3d.setVisible(visible);
        root.classList.add('is-story-3d');render(lastProgress);wake();
      }else instance?.dispose();
    }catch{/* No WebGL or the module failed: the 2D cinematic layer keeps running. */}
    if(s3dLoading===token)s3dLoading=0;
  }
  function stop3d(){
    s3dToken++;root.classList.remove('is-story-3d');
    if(!s3d)return;const old=s3d;s3d=null;caption3dFn=null;old.dispose();
    if(enhanced){render(lastProgress);dust.resize();wake();}
  }
  function loop(now){
    loopFrame=0;
    if(!enhanced||document.hidden||!visible)return;
    const dt=lastLoop?Math.min(100,now-lastLoop):16;lastLoop=now;
    const captionsMoving=updateCaptions(now,dt);
    const dustActive=visible&&!s3d&&dust.draw(now,dt);
    if(captionsMoving||dustActive)loopFrame=requestAnimationFrame(loop);
  }
  function wake(){if(enhanced&&!document.hidden&&visible&&!loopFrame){lastLoop=0;loopFrame=requestAnimationFrame(loop);}}
  {const headerH=Math.ceil(header.getBoundingClientRect().height),rect=root.getBoundingClientRect();visible=rect.bottom>headerH&&rect.top<innerHeight;
  if(window.IntersectionObserver)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;s3d?.setVisible(visible);if(visible)wake();flushShown();},{rootMargin:`-${headerH}px 0px 0px 0px`}).observe(root);}
  // This history entry has its own layout-aware restoration, including static mode.
  if('scrollRestoration' in history)history.scrollRestoration='manual';
  const head=()=>header.getBoundingClientRect().height;
  const range=()=>Math.max(1,root.offsetHeight-stage.offsetHeight);
  const start=()=>root.getBoundingClientRect().top+scrollY-head();
  function render(progress) {
    const previous=state;state=storyState(progress);
    if(previous&&state.progress!==previous.progress)direction=state.progress>previous.progress?1:-1;
    lastProgress=state.progress;
    s3d?.setProgress(state.progress);
    const vars={'--book-alpha':state.bookAlpha,'--book-out':state.bookOut,'--map-alpha':state.mapAlpha,'--map-in':state.mapIn,'--map-out':state.mapOut,'--map-reveal':state.mapReveal,
      '--seam-glow':state.seamGlow,'--rays':state.rays,'--exit-bloom':state.exitBloom,'--world-crane':state.worldCrane,'--flare':state.flare,
      '--sx':state.point.x,'--sy':state.point.y};
    for(const [name,value] of Object.entries(vars))stage.style.setProperty(name,value.toFixed(4));
    // Depth of field: layers passing the lens go soft; filters are dropped entirely when unused.
    const dofScale=small.matches?.5:1,px=value=>value>.02?`blur(${value.toFixed(2)}px)`:'';
    gates.forEach((gate,index)=>setFilter(gate,state.depthOpacities[index]>.01?px(state.dof[index]*[4,3,4][index]*dofScale):''));
    setFilter(book,state.bookAlpha>.01?px(state.bookOut*8*dofScale):'');
    setFilter(map,state.mapAlpha>.01?px(((1-state.mapIn)*6+state.mapOut*6)*dofScale):'');
    map.style.maskImage=map.style.webkitMaskImage=state.mapReveal<.999?`radial-gradient(circle at ${(state.point.x*100).toFixed(2)}% ${(state.point.y*100).toFixed(2)}%, #000 ${(state.mapReveal*100).toFixed(2)}%, transparent ${(state.mapReveal*100+14).toFixed(2)}%)`:'';
    setFilter(landscapeLayer,state.exitBloom>.01?`brightness(${(1+.12*state.exitBloom).toFixed(3)})`:'');
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
    signal.style.setProperty('--signal-scale',(state.point.scale*(1+.5*state.flare)).toFixed(4));
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
  function paint(){frame=0;if(enhanced&&!document.hidden){const rect=root.getBoundingClientRect();lastLayout={inside:rect.top<head()&&rect.bottom>head(),below:rect.bottom<head(),height:root.offsetHeight};const progress=clamp((scrollY-start())/range());if(Math.abs(progress-lastProgress)>.00001){render(progress);wake();}}}
  function schedule(){if(enhanced&&!document.hidden&&!frame)frame=requestAnimationFrame(paint);lastScrollAt=performance.now();wake();flushShown();}
  // 2: split caption and artwork whenever the stage itself is wide but the caption would otherwise span it.
  function splitLayout(){const w=stage.clientWidth,h=stage.clientHeight;root.classList.toggle('is-story-split',w>=h&&(innerWidth<=900||h<=600));}
  function syncMode(){
    const next=document.body.dataset.motion==='on'&&!reduce.matches;
    if(next===enhanced)return;
    const rect=root.getBoundingClientRect();
    // The reduced-motion CSS safety net takes effect before its change event.
    const previous=enhanced&&reduce.matches?lastLayout:null;
    const beforeHeight=previous?.height??root.offsetHeight;
    const wasBelow=previous?.below??rect.bottom<head(),wasInside=previous?.inside??(rect.top<head()+16&&rect.bottom>head());
    let chapter=Number(root.dataset.scene||0);
    if(!enhanced&&wasInside)chapter=scenes.reduce((best,scene,index)=>Math.abs(scene.getBoundingClientRect().top-head())<Math.abs(scenes[best].getBoundingClientRect().top-head())?index:best,chapter);
    enhanced=next;root.classList.toggle('is-story-enhanced',next);navigation.hidden=!next;
    cancelAnimationFrame(frame);frame=0;
    if(next){render(wasInside?sceneStops[chapter]:0);if(wasInside)scrollTo({top:start()+range()*sceneStops[chapter],behavior:'instant'});}
    else{stop3d();cancelAnimationFrame(loopFrame);loopFrame=0;clearCaptions();[...gates,book,map,landscapeLayer].forEach(node=>node.style.filter='');map.style.maskImage=map.style.webkitMaskImage='';
      scenes.forEach(scene=>{scene.removeAttribute('aria-hidden');scene.removeAttribute('data-shown');scene.removeAttribute('style');});stage.removeAttribute('style');if(wasInside)scrollTo({top:scenes[chapter].getBoundingClientRect().top+scrollY-head()-12,behavior:'instant'});}
    if(wasBelow)scrollBy({top:root.offsetHeight-beforeHeight,behavior:'instant'});
    paint();
    if(next){splitLayout();render(lastProgress);snapCaptions();dust.resize();wake();start3d();}
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
    if(enhanced){const rect=root.getBoundingClientRect();if(changedWidth&&rect.top<head()&&rect.bottom>head())scrollTo({top:start()+range()*lastProgress,behavior:'instant'});splitLayout();render(lastProgress);dust.resize();s3d?.resize();schedule();}
  },{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{schedule();s3d?.refresh();flushShown();}});
  const storageKey=()=>`study-journal-story:${location.pathname}${location.search}`;
  addEventListener('pagehide',()=>{
    const rect=root.getBoundingClientRect();
    const chapter=enhanced?storyState(lastProgress).active:scenes.reduce((best,scene,index)=>Math.abs(scene.getBoundingClientRect().top-head())<Math.abs(scenes[best].getBoundingClientRect().top-head())?index:best,0);
    try{sessionStorage.setItem(storageKey(),JSON.stringify({progress:enhanced?lastProgress:sceneStops[chapter],chapter,staticOffset:enhanced?null:-scenes[chapter].getBoundingClientRect().top,inside:rect.top<=head()&&rect.bottom>head(),below:rect.bottom<=head(),gap:scrollY-(rect.bottom+scrollY),y:scrollY}));}catch{}
  });
  function restore(snap=true){
    if(location.hash){const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(target&&!root.contains(target))scrollTo({top:target.getBoundingClientRect().top+scrollY-head()-22,behavior:'instant'});return;}
    let saved;try{saved=JSON.parse(sessionStorage.getItem(storageKey()));}catch{}
    if(!saved)return;
    if(saved.inside){if(enhanced)scrollTo({top:start()+range()*saved.progress,behavior:'instant'});else{const scene=scenes[saved.chapter??storyState(saved.progress).active];scrollTo({top:scene.getBoundingClientRect().top+scrollY+(saved.staticOffset??-head()-12),behavior:'instant'});}}
    else if(saved.below)scrollTo({top:root.getBoundingClientRect().bottom+scrollY+saved.gap,behavior:'instant'});
    else scrollTo({top:saved.y,behavior:'instant'});
    paint();
    if(enhanced&&snap)snapCaptions();else wake();
  }
  syncMode();
  const type=performance.getEntriesByType('navigation')[0]?.type;
  if(type==='back_forward'||type==='reload'||location.hash)requestAnimationFrame(()=>requestAnimationFrame(restore));
  addEventListener('pageshow',event=>{if(event.persisted){syncMode();requestAnimationFrame(()=>restore(false));}else schedule();});
  addEventListener('hashchange',()=>requestAnimationFrame(restore));
  root.dataset.ready='true';
}
