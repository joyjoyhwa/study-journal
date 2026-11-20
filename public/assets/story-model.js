export const clamp = (value,min=0,max=1) => Math.max(min,Math.min(max,value));
export const sceneStops = [0,.22,.4,.57,.8,1];
const keys = [
  [0,.6,.74,1], [.09,.64,.59,1.05], [.17,.74,.4,1],
  [.22,.51,.25,1.05], [.29,.43,.62,1], [.4,.65,.56,.9],
  [.57,.65,.55,.82], [.67,.65,.52,.75], [.8,.66,.48,.58],
  [.91,.7,.57,.43], [1,.66,.76,.7]
];
const smooth = t => t*t*(3-2*t);
function pointAt(progress) {
  const p=clamp(progress);let i=0;
  while(i<keys.length-2 && p>keys[i+1][0]) i++;
  const a=keys[i],b=keys[i+1],t=clamp((p-a[0])/(b[0]-a[0]));
  // Cubic Hermite tangents make one continuous route, including at scene cuts.
  const before=keys[Math.max(0,i-1)],after=keys[Math.min(keys.length-1,i+2)];
  const sample=axis=>{
    const m0=(b[axis]-before[axis])/(b[0]-before[0])*(b[0]-a[0]);
    const m1=(after[axis]-a[axis])/(after[0]-a[0])*(b[0]-a[0]);
    return (2*t**3-3*t*t+1)*a[axis]+(t**3-2*t*t+t)*m0+(-2*t**3+3*t*t)*b[axis]+(t**3-t*t)*m1;
  };
  return {x:sample(1),y:sample(2),scale:a[3]+(b[3]-a[3])*smooth(t)};
}
export function storyState(progress) {
  const p=clamp(Number.isFinite(progress)?progress:0);
  const point=pointAt(p);
  const weights=[1,0,0,0,0,0];
  for(let index=0;index<5;index++) {
    const cut=[.13,.31,.46,.69,.91][index], blend=smooth(clamp((p-cut+.035)/.07));
    weights[index]*=1-blend;weights[index+1]=blend;
  }
  const active=weights.indexOf(Math.max(...weights));
  const trail=Array.from({length:24},(_,index)=>pointAt(Math.max(0,p-.055+index*.055/23)));
  const fade=(a,b)=>smooth(clamp((p-a)/(b-a)));
  const curve=keys=>{let i=0;while(i<keys.length-2&&p>keys[i+1][0])i++;const a=keys[i],b=keys[i+1];return a[1]+(b[1]-a[1])*smooth(clamp((p-a[0])/(b[0]-a[0])));};
  return {progress:p,point,trail,weights,active,
    bookLift:fade(0,.14),network:fade(.13,.31),
    gateOpen:fade(.46,.66),gateZoom:1,worldZoom:1.45+fade(.68,.97)*.08,
    bookOpacity:1-fade(.10,.18),mapOpacity:fade(.11,.17)*(1-fade(.28,.35)),
    depthScales:[curve([[0,.7],[.26,.7],[.46,4.4]]),curve([[0,.55],[.30,.6],[.45,1.05],[.67,1.05],[.88,4.5]]),curve([[0,.38],[.45,.56],[.67,.65],[.8,1],[.96,4.6]])],
    depthOpacities:[1-fade(.43,.47),1-fade(.85,.9),1-fade(.935,.965)],
    cameraRise:fade(.67,.87),floorOpacity:fade(.46,.66)*(1-fade(.78,.93))*.17,arrival:fade(.94,1),travelling:p>.7&&p<.9,
    ...cinematic(p,active,fade)};
}
// Camera language added on top of the existing journey. Every term below is exactly 0 at the six scene stops,
// except the persistent book/map visibility, so settled frames keep the original composition.
const deadZones=[[.10,.16],[.29,.34],[.44,.48],[.665,.93]];
const smoother=t=>t*t*t*(t*(t*6-15)+10);
function cinematic(p,active,fade){
  const bump=(a,b,c,d)=>fade(a,b)*(1-fade(c,d));
  const flareAt=c=>smoother(clamp(1-Math.abs(p-c)/.03));
  const bookOut=fade(.085,.135),mapIn=fade(.14,.20),mapOut=fade(.27,.33);
  const inDead=deadZones.some(([a,b])=>p>=a&&p<=b);
  // The passage (chapter 5) is intentionally caption-free (user decision 2026-11-21).
  const caption=inDead||active===4?-1:active;
  const captionRest=active===4?-1:active;
  return {
    caption,captionRest,captionDrift:clamp((p-sceneStops[active])/.1,-1,1),
    bookOut,bookAlpha:1-bookOut,mapIn,mapOut,mapAlpha:mapIn*(1-mapOut),mapReveal:fade(.13,.21),
    dof:[fade(.40,.455)*(1-fade(.46,.48)),Math.max(bump(.69,.735,.765,.80),bump(.80,.835,.865,.90)),fade(.90,.955)*(1-fade(.97,.99))],
    seamGlow:fade(.455,.49)*(1-fade(.50,.56))*.55,
    rays:.3*bump(.60,.66,.72,.78)+.18*bump(.90,.93,.95,.985),
    exitBloom:fade(.90,.935)*(1-fade(.945,.985)),
    worldCrane:bump(.88,.93,.93,1),
    flare:Math.max(flareAt(.135),flareAt(.47),flareAt(.935))
  };
}
