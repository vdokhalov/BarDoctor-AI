import type { BrowserContext, Page, Request } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

export function expectedDepartingCashierIcon(input:{url:string;owner:string;method:string;type:string;error:string;pendingBeforeBack:boolean;duringBack:boolean;departed:boolean}) {
 const url=new URL(input.url),owner=new URL(input.owner);
 return input.pendingBeforeBack&&input.duringBack&&input.departed&&input.error==='Load request cancelled'&&input.method==='GET'&&input.type==='image'&&owner.pathname==='/cashier'&&url.origin===owner.origin&&/^\/integration-icons\/[a-z0-9-]+\.svg$/.test(url.pathname)&&!url.search;
}

/** Diagnostics for the host, iframe and native history; never changes application state. */
export async function salesIPhoneTrace(c:BrowserContext,rawPage:Page,file:string,errors:string[],serverTrace:unknown[]){
 const trace:unknown[]=[];const pending=new Set<string>();const networkErrors:string[]=[];
 const pendingRequests=new Set<Request>();let backRequests=new Set<Request>(),backOwner='',backOpen=false,departed=false;
 const failures:{message:string;candidate:Parameters<typeof expectedDepartingCashierIcon>[0]}[]=[];
 const record=(kind:string,detail:unknown)=>{if(kind==='pagehide'&&(detail as {url?:string})?.url===backOwner)departed=true;trace.push({at:Date.now(),kind,detail});writeFileSync(file,JSON.stringify(trace,null,2));};
 const beginCashierBack=()=>{assert.equal(new URL(rawPage.url()).pathname,'/cashier');backOwner=rawPage.url();backRequests=new Set(pendingRequests);backOpen=true;departed=false;record('back-resource-snapshot',{owner:backOwner,pending:[...backRequests].map(r=>({url:r.url(),type:r.resourceType(),method:r.method()}))});};
 const assertNavigationNetwork=()=>{
  const expected=failures.filter(f=>expectedDepartingCashierIcon({...f.candidate,departed}));
  const remaining=[...networkErrors];for(const f of expected){const index=remaining.indexOf(f.message);assert.ok(index>=0);remaining.splice(index,1);}
  record('navigation-network-classification',{departed,expectedOutgoingIconCancellations:expected.map(f=>({...f.candidate,departed})),unexpected:remaining});
  assert.deepEqual(remaining,[],'no unexpected network errors on Cashier Back/Back');
 };
 await c.exposeBinding('qaTrace',(_,kind:string,detail:unknown)=>record(kind,detail));
 await c.addInitScript({content:`(() => {
 const fetchState=window.__bdPerfFetchState={pending:0,lastStoreEnd:0,lastHealthEnd:0,healthStatus:null};
 const oldFetch=window.fetch;window.fetch=async function(input,init){const path=new URL(typeof input==='string'?input:input.url,location.href).pathname;fetchState.pending++;try{const response=await oldFetch.apply(this,arguments);if(path==='/api/store'||path.startsWith('/api/store/'))fetchState.lastStoreEnd=performance.now();if(path==='/api/business-health'){fetchState.lastHealthEnd=performance.now();fetchState.healthStatus=response.status;}return response;}finally{fetchState.pending--;}};
 const emit=(kind,detail)=>window.qaTrace(kind,detail);
 const workspace=()=>{try{return JSON.parse(localStorage.getItem('bd_venue_context__'+localStorage.getItem('bd_session'))||'{}').activeWorkspaceId??null;}catch{return null;}};
 const state=()=>({url:location.href,history:history.state,length:history.length,ready:document.readyState,venue:localStorage.getItem('bd_active_venue_id'),workspace:workspace(),auth:window.__bdAuthBootstrapV274,bootstrapPending:window.__bdBootstrapPending,journal:document.getElementById('journal-venue')?.textContent});
 for(const type of ['DOMContentLoaded','load','pageshow','popstate','pagehide'])addEventListener(type,()=>emit(type,state()));
 document.addEventListener('pointerdown',e=>emit('pointerdown',{...state(),target:e.target?.outerHTML?.slice(0,300)}),true);
 for(const method of ['pushState','replaceState']){const original=history[method].bind(history);history[method]=(...args)=>{original(...args);emit(method,state());};}
})();`});
 rawPage.on('framenavigated',frame=>{if(frame===rawPage.mainFrame()&&frame.url()!==backOwner)backOpen=false;record('framenavigated',{url:frame.url(),top:frame===rawPage.mainFrame()});});
 rawPage.on('request',req=>{pendingRequests.add(req);pending.add(req.url());record('request',{url:req.url(),method:req.method(),type:req.resourceType()});});
 rawPage.on('requestfinished',req=>{pendingRequests.delete(req);pending.delete(req.url());});rawPage.on('requestfailed',req=>{pendingRequests.delete(req);pending.delete(req.url());const message=req.url()+': '+req.failure()?.errorText;networkErrors.push(message);failures.push({message,candidate:{url:req.url(),owner:backOwner||rawPage.url(),method:req.method(),type:req.resourceType(),error:req.failure()?.errorText||'',pendingBeforeBack:backRequests.has(req)&&req.frame()===rawPage.mainFrame(),duringBack:backOpen,departed:false}});record('requestfailed',{url:req.url(),error:req.failure()});});
 rawPage.on('response',res=>{if(res.status()>=400)networkErrors.push(res.url()+': '+res.status());record('response',{url:res.url(),status:res.status()});});
 rawPage.on('pageerror',e=>record('pageerror',e.message));
 const checkpoint=async(label:string)=>{const frames=[];for(const frame of rawPage.frames()){try{frames.push(await frame.evaluate(()=>({url:location.href,history:history.state,length:history.length,load:document.readyState,venue:localStorage.getItem('bd_active_venue_id'),workspace:JSON.parse(localStorage.getItem('bd_venue_context__'+localStorage.getItem('bd_session'))||'{}').activeWorkspaceId??null,route:document.body?.getAttribute('data-bd-route'),auth:(window as unknown as {__bdAuthBootstrapV274?:unknown}).__bdAuthBootstrapV274,bootstrapPending:(window as unknown as {__bdBootstrapPending?:unknown}).__bdBootstrapPending,journal:document.getElementById('journal-venue')?.textContent,notice:document.getElementById('notice')?.textContent,iframes:[...document.querySelectorAll('iframe')].map(f=>({src:f.src,title:f.title}))})));}catch(e){frames.push({error:String(e)});}}record('checkpoint',{label,url:rawPage.url(),frames,pending:[...pending],errors,serverTrace:serverTrace.slice(-180)});};

 return {record,checkpoint,networkErrors,beginCashierBack,assertNavigationNetwork};
}
