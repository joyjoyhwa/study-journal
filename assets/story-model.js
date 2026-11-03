export const clamp = (value,min=0,max=1) => Math.max(min,Math.min(max,value));
export const sceneStops = [0,.34,.64,1];
const keys = [
  [0,.5,.68,1], [.08,.57,.53,1.12], [.23,.74,.4,1],
  [.34,.51,.25,1.1], [.46,.3,.48,1], [.54,.43,.62,1.06],
  [.64,.66,.54,1], [.75,.5,.45,.85], [.86,.58,.59,.7], [1,.69,.43,.42]
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
  const weights=[1,0,0,0];
  for(let index=0;index<3;index++) {
    const cut=[.235,.52,.785][index], blend=smooth(clamp((p-cut+.055)/.11));
    weights[index]*=1-blend;weights[index+1]=blend;
  }
  const active=weights.indexOf(Math.max(...weights));
  const trail=Array.from({length:24},(_,index)=>pointAt(Math.max(0,p-.055+index*.055/23)));
  return {progress:p,point,trail,weights,active,
    bookLift:smooth(clamp(p/.18)),network:smooth(clamp((p-.2)/.32)),
    gateOpen:smooth(clamp((p-.56)/.2)),gateZoom:1+smooth(clamp((p-.71)/.17))*2.1,
    worldZoom:1.18-smooth(clamp((p-.79)/.21))*.18};
}
