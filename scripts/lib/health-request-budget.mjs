import {parse} from 'acorn';

// One deadline covers headers and body; navigation subscribers retain shared ownership.
export function patchHealthRequestBudget(source) {
 const patches={
  bdFetchBusinessHealthV377:()=>`async function bdFetchBusinessHealthV377(session){const controller=new AbortController;let timeout;try{const deadline=new Promise((resolve,reject)=>{timeout=window.setTimeout(()=>{reject(new Error("Business Health request timed out"));controller.abort()},15000)}),request=fetch("/api/business-health",{headers:ca(session),cache:"no-store",signal:controller.signal}).then(async response=>{let data;try{data=await response.json()}catch{throw new Error("Business Health returned invalid JSON")}return{response,data}});return await Promise.race([request,deadline])}finally{window.clearTimeout(timeout)}}`,
  bdRefreshLiveBusinessHealthV335:s=>s.replace('if(!e)return null;','if(!e)throw new Error("Business Health session unavailable");').replace('if(r.status===403', 'if(t!==bdBusinessHealthAccountContextV284())throw new Error("Business Health context changed");if(r.ok&&a?.success&&!bdBusinessHealthSafeSnapshotV342(a))throw new Error("Business Health returned an invalid envelope");if(r.status===403'),
  bdUseLiveBusinessHealthV335:s=>s.includes("bdHealthRetry=0")?s:s.replace('bdUseLiveBusinessHealthV335(e){','bdUseLiveBusinessHealthV335(e,bdHealthRetry=0){').replace('window.clearTimeout(bdLiveBusinessHealthTimerV335)','window.clearTimeout(ownedTimer)').replace('bdLiveBusinessHealthContextV335===l&&','!bdHealthRetry&&bdLiveBusinessHealthContextV335===l&&').replace('},[e]),t','},[e,bdHealthRetry]),t'),
  c_e:s=>s.replace('bdLiveHealthStatus=bdUseLiveBusinessHealthV335(bdHealthCanLoad)','[bdHealthRetry,setBdHealthRetry]=S.useState(0),bdLiveHealthStatus=bdUseLiveBusinessHealthV335(bdHealthCanLoad,bdHealthRetry)').replace('onClick:()=>window.dispatchEvent(new Event("bd:store-updated"))','onClick:()=>setBdHealthRetry(value=>value+1)').replace('onClick:()=>bdRefreshLiveBusinessHealthV335().catch(()=>{})','onClick:()=>setBdHealthRetry(value=>value+1)').replace('const l=n,u=', 'const l=bdLiveHealthStatus==="ready"?n:null,u=').replace('bdHealthLoading=!n&&bdLiveHealthStatus!=="error"&&!bdHealthWaitExpired','bdHealthLoading=!l&&bdLiveHealthStatus!=="error"'),
 };
 const nodes=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='FunctionDeclaration'&&Object.hasOwn(patches,n.id.name));
 if(nodes.length!==4)throw Error('Health budget functions missing');
 for(const n of nodes.reverse()){
  let part=source.slice(n.start,n.end);
  if(n.id.name==='bdRefreshLiveBusinessHealthV335'&&part.includes('Business Health returned an invalid envelope'))continue;
  source=source.slice(0,n.start)+patches[n.id.name](part)+source.slice(n.end);
 }
 return source;
}
