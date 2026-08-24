import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const appHtmlPath = new URL("../public/app.html", import.meta.url);
const responsePath = new URL("../app/bar-doctor-response.ts", import.meta.url);

const marker = 'const bdExistingVenueGateVersionV249="existing-venue-gate-v249";';
const cacheSuffix = "-20260823-existing-venue-gate-v249";

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  const second = source.indexOf(before, first + 1);
  if (first < 0 || second >= 0) {
    throw new Error(`${label}: expected exactly one match`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

let bundle = fs.readFileSync(bundlePath, "utf8");
if (!bundle.includes(marker)) {
  bundle = replaceOnce(
    bundle,
    'function bdAuthCompleteLoginV248(){const e=bdAuthHomeTargetV248();try{window.history.replaceState(window.history.state,"",e),window.location.reload()}catch{window.location.assign(e)}}',
    'function bdAuthCompleteLoginV248(){const e=bdAuthHomeTargetV248();try{sessionStorage.removeItem("bd_venue_profile_recovery_v249"),window.location.assign(e)}catch{window.location.href=e}}',
    "hard login navigation",
  );

  const oldRootTarget = 'function Cle(){return Ot()?Fse()?"/home":"/setup":"/login"}';
  const venueGate = `${marker}const bdVenueProfileRecoveryKeyV249="bd_venue_profile_recovery_v249";function bdVenueAccessV249(){try{const e=Ot(),t=localStorage.getItem("bd_active_venue_id");if(!e||!t)return null;const n=JSON.parse(localStorage.getItem("bd_venue_context__"+e)||"null"),r=Array.isArray(n?.venues)?n.venues.find(a=>String(a?.id)===String(t)&&a?.status!=="inactive"):null;return r?{id:String(t),name:String(r.name||"")}:null}catch{return null}}function bdVenueHomeV249(){const e=bdVenueAccessV249();return e?"/home?venue="+encodeURIComponent(e.id):"/home"}function Cle(){return Ot()?(Fse()||bdVenueAccessV249()?bdVenueHomeV249():"/setup"):"/login"}`;
  bundle = replaceOnce(bundle, oldRootTarget, venueGate, "root venue target");

  bundle = replaceOnce(
    bundle,
    'if(m){n(m),a(!0);return}',
    'if(m){sessionStorage.removeItem(bdVenueProfileRecoveryKeyV249),n(m),a(!0);return}',
    "profile recovery reset",
  );

  const oldGuards = 'function oEe({component:e}){return Ot()?i.jsx(e,{}):i.jsx(cS,{to:"/login"})}function pt({component:e}){if(!Ot())return i.jsx(cS,{to:"/login"});const{profile:n,isReady:r}=Un();return r?n?i.jsx(e,{}):i.jsx(cS,{to:"/setup"}):i.jsx(ble,{})}';
  const resilientGuards = 'function bdVenueProfileRecoveryV249(){const e=bdVenueAccessV249(),[t]=S.useState(()=>{try{return sessionStorage.getItem(bdVenueProfileRecoveryKeyV249)===e?.id}catch{return!1}});S.useEffect(()=>{if(!e||t)return;try{sessionStorage.setItem(bdVenueProfileRecoveryKeyV249,e.id)}catch{}window.location.assign(bdVenueHomeV249())},[e?.id,t]);return e&&t?i.jsx("main",{style:{minHeight:"100dvh",display:"grid",placeItems:"center",padding:24,background:"#f7f8fc"},children:i.jsxs("section",{style:{width:"min(100%,430px)",padding:24,border:"1px solid #e3e6ef",borderRadius:22,background:"#fff",textAlign:"center"},children:[i.jsx("h1",{style:{margin:0,fontSize:22,color:"#151a2d"},children:"Не удалось загрузить заведение"}),i.jsx("p",{style:{margin:"10px 0 18px",fontSize:14,lineHeight:1.5,color:"#667085"},children:"Аккаунт и заведение найдены. Повторите загрузку — создавать новое заведение не нужно."}),i.jsx("button",{type:"button",onClick:()=>{try{sessionStorage.removeItem(bdVenueProfileRecoveryKeyV249)}catch{}window.location.assign(bdVenueHomeV249())},style:{minHeight:48,width:"100%",border:0,borderRadius:14,background:"#5753e8",color:"#fff",fontSize:14,fontWeight:800},children:"Повторить загрузку"})]})}):i.jsx(ble,{})}function oEe({component:e}){return Ot()?bdVenueAccessV249()?i.jsx(cS,{to:bdVenueHomeV249()}):i.jsx(e,{}):i.jsx(cS,{to:"/login"})}function pt({component:e}){if(!Ot())return i.jsx(cS,{to:"/login"});const{profile:n,isReady:r}=Un();return r?n?i.jsx(e,{}):bdVenueAccessV249()?i.jsx(bdVenueProfileRecoveryV249,{}):i.jsx(cS,{to:"/setup"}):i.jsx(ble,{})}';
  bundle = replaceOnce(bundle, oldGuards, resilientGuards, "authenticated venue guards");
  fs.writeFileSync(bundlePath, bundle);
}

let bootstrap = fs.readFileSync(bootstrapPath, "utf8");
if (!bootstrap.includes(cacheSuffix)) {
  bootstrap = replaceOnce(
    bootstrap,
    "-20260823-auth-login-v248\";",
    `-20260823-auth-login-v248${cacheSuffix}\";`,
    "application bundle cache token",
  );
  fs.writeFileSync(bootstrapPath, bootstrap);
}

for (const path of [appHtmlPath, responsePath]) {
  let source = fs.readFileSync(path, "utf8");
  if (source.includes(cacheSuffix)) continue;
  source = replaceOnce(
    source,
    "-20260823-auth-login-v248\"></script>",
    `-20260823-auth-login-v248${cacheSuffix}\"></script>`,
    `${path.pathname} bootstrap cache token`,
  );
  fs.writeFileSync(path, source);
}

