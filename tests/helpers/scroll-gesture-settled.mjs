import assert from 'node:assert/strict';

/** Installed before a gesture on the exact scroll owner; serialized by Playwright. */
export function armScrollCompletion(){
 const owner=window.__scrollQAOwner;
 if(!owner)throw Error('Scroll owner required');
 if(!('onscrollend' in document))throw Error('Native scrollend support required');
 const target=owner===document.scrollingElement?document:owner;
 const state=window.__bdGestureCompletion={ended:false,start:owner.scrollTop,end:null,events:0};
 const finish=()=>{state.events++;state.end=owner.scrollTop;state.ended=Math.abs(state.end-state.start)>1;};
 target.addEventListener('scrollend',finish);
 state.dispose=()=>target.removeEventListener('scrollend',finish);
}

export async function waitForScrollCompletion(frame){
 try{
  await frame.waitForFunction(()=>window.__bdGestureCompletion?.ended===true,null,{timeout:2000});
  return await frame.evaluate(()=>{const {start,end,events}=window.__bdGestureCompletion;return{start,end,events};});
 }finally{
  await frame.evaluate(()=>{window.__bdGestureCompletion?.dispose();delete window.__bdGestureCompletion;});
 }
}

export function assertIdleScroll(before,after,label){
 assert.ok(Math.abs(after.scrollTop-before.scrollTop)<=1,'unexpected scroll '+label);
 assert.ok(Math.abs(after.documentHeight-before.documentHeight)<=1,'idle layout oscillation '+label);
 assert.ok(after.probe.observerCallbacks-before.probe.observerCallbacks<=1,'idle observer loop '+label);
}
