import {readFileSync,writeFileSync} from 'node:fs';
import {parse} from 'acorn';

const file='public/assets/index-BQGspy0I.js';
let source=readFileSync(file,'utf8');
const replacements={
zse:String.raw`async function zse({signal,isCurrent=()=>!0}={}){const e=Ot(),token=gz(),venue=localStorage.getItem("bd_active_venue_id");if(!e)return null;const t=await fetch(vz+"/me",{headers:ca(e),cache:"no-store",signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)}),n=await t.json();if(!isCurrent()||e!==Ot()||token!==gz()||venue!==localStorage.getItem("bd_active_venue_id"))throw new DOMException("Stale profile read","AbortError");if(!t.ok||!n.ok){const error=new Error(n.error||"Не удалось загрузить профиль заведения");error.status=t.status;throw error}return jz(n.restaurant),n.restaurant}`,
Vse:String.raw`function Vse({children:e}){const[t,n]=S.useState(()=>bz()),[r,a]=S.useState(!1),[profileError,setProfileError]=S.useState(null),s=S.useRef(null);s.current=t;S.useEffect(()=>{let disposed=!1,epoch=0,controller=null;const invalidate=()=>{epoch++;controller?.abort();controller=null;a(!1);setProfileError(null)},refresh=()=>{invalidate();if(window.__bdBootstrapPending)return;if(!["ready","onboarding_required"].includes(window.__bdAuthBootstrapV274?.state)){n(null);a(!0);return;}if(!Ot()||!gz()){n(null);a(!0);return}const attempt=epoch;controller=new AbortController();zse({signal:controller.signal,isCurrent:()=>!disposed&&attempt===epoch}).then(profile=>{if(!disposed&&attempt===epoch){n(profile);a(!0)}}).catch(error=>{if(!disposed&&attempt===epoch){n(null);setProfileError({status:Number.isInteger(error?.status)&&error.status>=100&&error.status<=599?error.status:null,reason:error?.name==="TimeoutError"?"profile_timeout":error?.name==="AbortError"?"profile_context_changed":"profile_read_failed"});a(!0)}})};refresh();window.addEventListener("bd:bootstrap-start",invalidate);window.addEventListener("bd:bootstrap-complete",refresh);window.addEventListener("bd:active-venue-changed",refresh);return()=>{disposed=!0;epoch++;controller?.abort();window.removeEventListener("bd:bootstrap-start",invalidate);window.removeEventListener("bd:bootstrap-complete",refresh);window.removeEventListener("bd:active-venue-changed",refresh)}},[]);const l=S.useCallback(async u=>{const d=s.current;n(u);try{await uM(u)}catch(f){throw n(d),f}},[]);return i.jsx(wz.Provider,{value:{profile:t,isReady:r,profileError,save:l},children:e})}`
};
for(const node of parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='FunctionDeclaration').sort((a,b)=>b.start-a.start)){
 if(replacements[node.id.name])source=source.slice(0,node.start)+replacements[node.id.name]+source.slice(node.end);
 else if(node.id.name==='bdBootstrapRecoveryV274'){
 const original=source.slice(node.start,node.end);
 let updated=original.replace('onClick:()=>window.location.reload()','onClick:()=>window.__bdRetryBootstrapV496?.()');
 if(!updated.includes('bdRecoveryBusyV496')) updated=updated.replace('const e=bdAuthBootstrapV274(),t=e.reason===','const{isReady:bdProfileReadyV496}=Un(),bdRecoveryBusyV496=window.__bdBootstrapPending||!bdProfileReadyV496&&bdAuthBootstrapV274().state==="ready",e=bdAuthBootstrapV274(),t=e.reason===')
 .replace('children:t?"Заведение','children:bdRecoveryBusyV496?"Проверяем доступ…":t?"Заведение')
 .replace('type:"button",onClick:()=>window.__bdRetryBootstrapV496?.()','type:"button",disabled:bdRecoveryBusyV496,onClick:()=>window.__bdRetryBootstrapV496?.()')
 .replace('children:"Повторить загрузку"','children:bdRecoveryBusyV496?"Проверяем доступ…":"Повторить загрузку"');
  source=source.slice(0,node.start)+updated+source.slice(node.end);
 }
 else if(node.id.name==='pt'){
  const original=source.slice(node.start,node.end),updated=original
   .replaceAll('i.jsx(bdAuthenticatedHomeBootV345,{}):null','i.jsx(bdAuthenticatedHomeBootV345,{}):i.jsx(bdBootstrapRecoveryV274,{})');
  source=source.slice(0,node.start)+updated+source.slice(node.end);
 }
}
parse(source,{ecmaVersion:'latest',sourceType:'module'});writeFileSync(file,source);

for(const file of ['public/bardoctor-preview.js','public/bardoctor-preview-v397.js']){
 let boot=readFileSync(file,'utf8');
 // Bootstrap has one bounded consumer and commits only in its scoped caller.
 // Login/register retain their existing single-read navigation contract.
 boot=boot.replace('["/api/auth/login", "/api/auth/register", "/api/auth/bootstrap"].indexOf', '["/api/auth/login", "/api/auth/register"].indexOf');
 writeFileSync(file,boot);
 if(boot.includes('async function bdRetryBootstrapV496'))continue;
 const start=boot.lastIndexOf('  try {\n    var demoEmail'),endMarker='  window.dispatchEvent(new CustomEvent("bd:bootstrap-complete"));',end=boot.indexOf(endMarker,start);
 if(start<0||end<0)throw Error('Exact bootstrap recovery boundary required: '+file);
 let block=boot.slice(start,end+endMarker.length);
 block=block.replace('    var token = localStorage.getItem("bd_session_token");','    var token = localStorage.getItem("bd_session_token");\n    var selectedVenue = localStorage.getItem("bd_active_venue_id");');
 block=block.replace('    var response = await fetch("/api/auth/bootstrap", {\n      method: "POST",\n      headers: headers,\n      signal: AbortSignal.timeout(30000)\n    });\n    var result = await response.json();',`    var controller = new AbortController(), timer;
    var resultPair = await Promise.race([
      (async function () { var response = await fetch("/api/auth/bootstrap", { method: "POST", headers: headers, signal: controller.signal }); return { response: response, result: await response.json() }; })(),
      new Promise(function (_, reject) { timer = setTimeout(function () { controller.abort(); reject(new DOMException("Bootstrap timed out", "TimeoutError")); }, 30000); })
    ]).finally(function () { clearTimeout(timer); });
    var response = resultPair.response, result = resultPair.result;
    if (email !== localStorage.getItem("bd_session") || token !== localStorage.getItem("bd_session_token") || selectedVenue !== localStorage.getItem("bd_active_venue_id")) {
      if (window.__bdAuthBootstrapV274 === bootstrapStateAtStart) window.__bdAuthBootstrapV274 = { state: "error", reason: "bootstrap_context_changed" };
      return;
    }`);
 if(block.includes('signal: AbortSignal.timeout(30000)'))throw Error('Bootstrap bounded read replacement failed');
 block=block.replace('if (result.ok) {','if (response.ok && result.ok) {');
 block=block.replace('} else if (result.needsLogin) {','} else if (response.status === 401 && result.needsLogin) {');
 block=block.replace('await refreshServerInventoryCacheV235();','void refreshServerInventoryCacheV235();');
 block=block.replace('state: "error", reason: "bootstrap_response_failed"','state: "error", reason: "bootstrap_response_failed", status: response.status');
 block=block.replace('  } catch {\n    window.__bdAuthBootstrapV274 = { state: "error", reason: "bootstrap_request_failed" };\n  }\n\n  window.__bdBootstrapPending = false;\n  window.dispatchEvent(new CustomEvent("bd:bootstrap-complete"));',`  } catch (error) {
    if (window.__bdAuthBootstrapV274 === bootstrapStateAtStart) window.__bdAuthBootstrapV274 = { state: "error", reason: error?.name === "TimeoutError" ? "bootstrap_timeout" : "bootstrap_request_failed" };
  } finally {
    window.__bdBootstrapPending = false;
    window.dispatchEvent(new CustomEvent("bd:bootstrap-complete"));
  }`);
 const replacement=`  var bdBootstrapRetryPromiseV496 = null;
  async function bdRetryBootstrapV496(initial = false) {
    if (bdBootstrapRetryPromiseV496) return bdBootstrapRetryPromiseV496;
    window.__bdBootstrapPending = true;
    if (!initial) window.__bdAuthBootstrapV274 = { state: "loading", reason: "bootstrap_retry_pending" };
    window.dispatchEvent(new CustomEvent("bd:bootstrap-start"));
    var bootstrapStateAtStart = window.__bdAuthBootstrapV274;
    bdBootstrapRetryPromiseV496 = (async function () {
${block}
    })().finally(function () { bdBootstrapRetryPromiseV496 = null; });
    return bdBootstrapRetryPromiseV496;
  }
  window.__bdRetryBootstrapV496 = bdRetryBootstrapV496;
  await bdRetryBootstrapV496(true);`;
 boot=boot.slice(0,start)+replacement+boot.slice(end+endMarker.length);
 parse(boot,{ecmaVersion:'latest',sourceType:'script'});writeFileSync(file,boot);
}
console.log('production-recovery-v496: scoped profile retry and bounded bootstrap');
