import test from 'node:test';
import assert from 'node:assert/strict';
import {storyState,sceneStops} from '../public/assets/story-model.js';

test('A single signal crosses six distinct chapters and opens the threshold',()=>{
  assert.deepEqual(sceneStops.map(p=>storyState(p).active),[0,1,2,3,4,5]);
  const samples=sceneStops.map(storyState);
  assert.equal(new Set(samples.map(s=>`${s.point.x.toFixed(2)}:${s.point.y.toFixed(2)}`)).size,6);
  assert.equal(storyState(0).gateOpen,0);assert.equal(storyState(1).gateOpen,1);
  assert.ok(storyState(1).point.scale<storyState(0).point.scale);
});
test('Scroll sampling stays finite, continuous and reversible at scene boundaries',()=>{
  let previous=storyState(0);
  for(let i=0;i<=2000;i++){
    const state=storyState(i/2000);
    assert.ok(Math.abs(state.weights.reduce((a,b)=>a+b,0)-1)<1e-8);
    assert.ok(state.point.x>0&&state.point.x<1&&state.point.y>0&&state.point.y<1);
    assert.ok(Math.hypot(state.point.x-previous.point.x,state.point.y-previous.point.y)<.01);
    assert.ok(state.trail.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
    assert.deepEqual(storyState(i/2000),state);previous=state;
  }
  assert.deepEqual(storyState(-1),storyState(0));assert.deepEqual(storyState(2),storyState(1));
  assert.deepEqual(storyState(NaN),storyState(0));
});

test('Doors open completely before camera passage, with three persistent spatial boundaries',()=>{
 assert.equal(storyState(.46).gateOpen,0);assert.equal(storyState(.66).gateOpen,1);
 assert.equal(storyState(.46).depthScales[1],storyState(.66).depthScales[1]);
 assert.ok(storyState(.8).depthScales[1]>storyState(.67).depthScales[1]);
 assert.equal(storyState(.8).travelling,true);assert.equal(storyState(1).travelling,false);
 assert.deepEqual(storyState(1).depthOpacities,[0,0,0]);
 assert.equal(storyState(1).arrival,1);
});
