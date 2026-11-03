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
    cameraRise:fade(.67,.87),floorOpacity:fade(.46,.66)*(1-fade(.78,.93))*.17,arrival:fade(.94,1),travelling:p>.7&&p<.9};
}
