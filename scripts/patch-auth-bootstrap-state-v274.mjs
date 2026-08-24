import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bundle = readFileSync(bundlePath, "utf8");
const marker = 'bdAuthBootstrapStateVersionV274="auth-bootstrap-state-v274"';

if (bundle.includes(marker)) process.exit(0);

function replaceOnce(source, search, replacement, label) {
  const first = source.indexOf(search);
  if (first < 0) throw new Error(`Missing ${label} anchor`);
  if (source.indexOf(search, first + search.length) >= 0) throw new Error(`Ambiguous ${label} anchor`);
  return source.slice(0, first) + replacement + source.slice(first + search.length);
}

let next = bundle;
next = replaceOnce(
  next,
  'function bdVenueConfiguredV251(){return bdVenueAccessV249()?.hasProfile===!0}function Cle(){return Ot()?(Fse()||bdVenueConfiguredV251()?bdVenueHomeV249():"/setup"):"/login"}function _le(){const[,e]=bt(),[t,n]=S.useState(!1),[r]=S.useState(Cle);S.useEffect(()=>{const a=setTimeout(()=>n(!0),2700);return()=>clearTimeout(a)},[]);function a(){e(r)}return i.jsx(W.div,{"data-bd-root-splash":"ai-pulse",style:{minHeight:"100dvh",width:"100%",background:"#070911"},initial:{opacity:1},animate:{opacity:t?0:1},transition:{duration:.4,ease:"easeInOut"},onAnimationComplete:()=>{t&&a()},children:i.jsx(ble,{})})}',
  'function bdVenueConfiguredV251(){return bdVenueAccessV249()?.hasProfile===!0}const bdAuthBootstrapStateVersionV274="auth-bootstrap-state-v274";function bdAuthBootstrapV274(){const e=window.__bdAuthBootstrapV274;return e&&typeof e.state==="string"?e:{state:Ot()?"error":"unauthenticated",reason:"bootstrap_contract_missing"}}function bdBootstrapRecoveryV274(){const e=bdAuthBootstrapV274(),t=e.reason==="confirmed_owner_venue_inactive";return i.jsx("main",{"data-bd-bootstrap-state":e.state,style:{minHeight:"100dvh",display:"grid",placeItems:"center",padding:24,background:"#f7f8fc"},children:i.jsxs("section",{style:{width:"min(100%,430px)",padding:24,border:"1px solid #e3e6ef",borderRadius:22,background:"#fff",textAlign:"center"},children:[i.jsx("h1",{style:{margin:0,fontSize:22,color:"#151a2d"},children:t?"Заведение временно недоступно":"Не удалось восстановить доступ"}),i.jsx("p",{style:{margin:"10px 0 18px",fontSize:14,lineHeight:1.5,color:"#667085"},children:t?"Аккаунт и владение найдены, но заведение архивировано. Новое заведение создавать не нужно.":"Не удалось завершить загрузку аккаунта. Проверьте соединение и повторите попытку."}),i.jsx("button",{type:"button",onClick:()=>window.location.reload(),style:{minHeight:48,width:"100%",border:0,borderRadius:14,background:"#5753e8",color:"#fff",fontSize:14,fontWeight:800},children:"Повторить загрузку"})]})})}function Cle(){const e=bdAuthBootstrapV274();return e.state==="unauthenticated"?"/login":e.state==="ready"?bdVenueHomeV249():e.state==="onboarding_required"?"/setup":null}function _le(){const[,e]=bt(),[t,n]=S.useState(!1),[r]=S.useState(Cle);S.useEffect(()=>{if(!r)return;const a=setTimeout(()=>n(!0),2700);return()=>clearTimeout(a)},[r]);if(!r)return i.jsx(bdBootstrapRecoveryV274,{});function a(){e(r)}return i.jsx(W.div,{"data-bd-root-splash":"ai-pulse",style:{minHeight:"100dvh",width:"100%",background:"#070911"},initial:{opacity:1},animate:{opacity:t?0:1},transition:{duration:.4,ease:"easeInOut"},onAnimationComplete:()=>{t&&a()},children:i.jsx(ble,{})})}',
  "root bootstrap gate",
);

next = replaceOnce(
  next,
  'function oEe({component:e}){return Ot()?bdVenueConfiguredV251()?i.jsx(cS,{to:bdVenueHomeV249()}):i.jsx(e,{}):i.jsx(cS,{to:"/login"})}function pt({component:e}){if(!Ot())return i.jsx(cS,{to:"/login"});const{profile:n,isReady:r}=Un();return r?n?i.jsx(e,{}):bdVenueConfiguredV251()?i.jsx(bdVenueProfileRecoveryV249,{}):i.jsx(cS,{to:"/setup"}):i.jsx(ble,{})}',
  'function oEe({component:e}){if(!Ot())return i.jsx(cS,{to:"/login"});const t=bdAuthBootstrapV274();return t.state==="ready"?i.jsx(cS,{to:bdVenueHomeV249()}):t.state==="onboarding_required"?i.jsx(e,{}):t.state==="loading"?i.jsx(ble,{}):i.jsx(bdBootstrapRecoveryV274,{})}function pt({component:e}){if(!Ot())return i.jsx(cS,{to:"/login"});const t=bdAuthBootstrapV274();if(t.state==="onboarding_required")return i.jsx(cS,{to:"/setup"});if(t.state!=="ready")return t.state==="loading"?i.jsx(ble,{}):i.jsx(bdBootstrapRecoveryV274,{});const{profile:n,isReady:r}=Un();return r?n?i.jsx(e,{}):i.jsx(bdBootstrapRecoveryV274,{}):i.jsx(ble,{})}',
  "route guards",
);

next = replaceOnce(
  next,
  'async function zse(){const e=Ot();if(!e)return null;try{const n=await(await fetch(`${vz}/me`,{headers:ca(e)})).json();return n.ok?(jz(n.restaurant),n.restaurant):null}catch{return bz()}}',
  'async function zse(){const e=Ot();if(!e)return null;const t=await fetch(`${vz}/me`,{headers:ca(e),cache:"no-store"}),n=await t.json();if(!t.ok||!n.ok)throw new Error(n.error||"Не удалось загрузить профиль заведения");return jz(n.restaurant),n.restaurant}',
  "restaurant profile request",
);

const providerStart = next.indexOf("function Vse({children:e})");
const providerEnd = next.indexOf("function Un()", providerStart);
if (providerStart < 0 || providerEnd < 0) throw new Error("Missing restaurant provider anchor");
next = next.slice(0, providerStart)
  + 'function Vse({children:e}){const[t,n]=S.useState(null),[r,a]=S.useState(!1),s=S.useRef(null);s.current=t,S.useEffect(()=>{if(!Ot()){a(!0);return}if(!gz()){sz(),yz(),window.location.replace("/".replace(/\\\/$/,"")+"/login");return}let f=!1;return zse().then(m=>{f||(n(m),a(!0))}).catch(()=>{f||a(!0)}),()=>{f=!0}},[]);const l=S.useCallback(async u=>{const d=s.current;n(u);try{await uM(u)}catch(f){throw n(d),f}},[]);return i.jsx(wz.Provider,{value:{profile:t,isReady:r,save:l},children:e})}'
  + next.slice(providerEnd);

writeFileSync(bundlePath, next);
