import {parse} from 'acorn';

/** Keep startup failures available to the UI without an unowned rejected promise. */
export function patchHealthRequestLifecycle(source){
 const replacements={
  bdWarmCriticalHomeV349: s=>s.replace('window.__bdStartupBusinessHealthWarmV349=bdFetchBusinessHealthV377(e),','window.__bdStartupBusinessHealthWarmV349=bdFetchBusinessHealthV377(e).then(value=>({ok:!0,value}),error=>({ok:!1,error})),'),
  bdRefreshLiveBusinessHealthV335: s=>s.replace('const{response:r,data:a}=n?await n:await bdFetchBusinessHealthV377(e);','const warm=n?await n:null;if(warm&&!warm.ok)throw warm.error;const{response:r,data:a}=warm?warm.value:await bdFetchBusinessHealthV377(e);'),
  bdUseLiveBusinessHealthV335: s=>s.replace('let r=!1;const a=()=>{n("loading")','let r=!1,ownedTimer=0;const a=()=>{if(r)return;n("loading")').replace('bdLiveBusinessHealthTimerV335=window.setTimeout(a,120)','bdLiveBusinessHealthTimerV335=ownedTimer=window.setTimeout(a,120)').replace('return()=>{r=!0,window.removeEventListener','return()=>{r=!0,window.clearTimeout(ownedTimer),window.removeEventListener'),
 };
 const nodes=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='FunctionDeclaration'&&Object.hasOwn(replacements,n.id.name));
 if(nodes.length!==3)throw Error('Exactly three Health lifecycle functions required');
 for(const n of nodes.sort((a,b)=>b.start-a.start))source=source.slice(0,n.start)+replacements[n.id.name](source.slice(n.start,n.end))+source.slice(n.end);
 for(const required of ['.then(value=>({ok:!0,value}),error=>({ok:!1,error}))','if(warm&&!warm.ok)throw warm.error','if(r)return;n("loading")','window.clearTimeout(ownedTimer)'])if(!source.includes(required))throw Error('Health lifecycle anchor missing: '+required);
 return source;
}
