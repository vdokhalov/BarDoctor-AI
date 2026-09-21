import fs from 'node:fs';
const root = new URL('../', import.meta.url), file = new URL('public/assets/index-BQGspy0I.js', root);
let bundle = fs.readFileSync(file, 'utf8');
function replace(source, before, after) { if (!source.includes(before))
    throw new Error('Setup patch anchor missing: ' + before.slice(0, 90)); return source.replace(before, after); }
if (!bundle.includes('bd-first-venue-setup-v444')) {
    const start = bundle.indexOf('function Yle()'), end = bundle.indexOf('function Wg(', start);
    let setup = bundle.slice(start, end);
    setup = replace(setup, 'const[,e]=bt()', `/* bd-first-venue-setup-v444 */ const bdDraftKey='bd_setup_draft__'+Ot()+'__'+(localStorage.getItem('bd_session_userid')||'')+'__'+(localStorage.getItem('bd_active_venue_id')||''),bdDraft=S.useMemo(()=>{try{return JSON.parse(sessionStorage.getItem(bdDraftKey)||'null')}catch{return null}},[bdDraftKey]);const[,e]=bt()`);
    setup = replace(setup, '[r,a]=S.useState(0)', '[r,a]=S.useState(()=>Math.max(0,Math.min(5,Number(bdDraft?.step)||0)))');
    setup = replace(setup, '[u,d]=S.useState(Lle)', '[u,d]=S.useState(()=>({...Lle,...bdDraft?.data}))');
    setup = replace(setup, '[f,m]=S.useState(!1);', `[f,m]=S.useState(!1),[bdSaving,bdSetSaving]=S.useState(false),[bdError,bdSetError]=S.useState(''),bdSubmitting=S.useRef(false);S.useLayoutEffect(()=>{if(!document.querySelector('[data-bd-setup-ready]'))return;document.documentElement.removeAttribute('data-bd-startup-pending');document.documentElement.removeAttribute('data-bd-startup-completing');document.querySelector('[data-bd-static-startup="v201"]')?.remove();window.__bdSplashReleasedV396=true;window.dispatchEvent(new CustomEvent('bd:startup-complete',{detail:{version:'setup-ready-v444'}}));},[]);S.useEffect(()=>{if(!f)try{sessionStorage.setItem(bdDraftKey,JSON.stringify({step:r,data:u}))}catch{}},[bdDraftKey,r,u,f]);const bdMissing=r===1?[!u.name.trim()&&'название заведения',!u.businessType&&'тип бизнеса',!u.countryCode&&'страну',!u.city.trim()&&'город',!bdAccountingCurrencyV243(u.currency)&&'валюту учёта'].filter(Boolean):r===4&&!u.equipmentBusinessType?['тип заведения для оборудования']:[];`);
    setup = replace(setup, 'async function y(){', "async function y(){if(bdSubmitting.current||f)return;if(r>0&&(!Ble(r,u)||bdMissing.length))return;bdSetError('');");
    setup = replace(setup, 'await t(A),_.length>0&&n(_),m(!0),setTimeout(()=>e("/home"),2e3)', `bdSubmitting.current=true;bdSetSaving(true);try{await t(A),_.length>0&&n(_),m(!0);sessionStorage.removeItem(bdDraftKey);e('/home')}catch(error){bdSetError(!error?.message||/failed to fetch|load failed|network/i.test(error.message)?'Не удалось связаться с сервером. Проверьте соединение и повторите попытку.':error.message)}finally{bdSubmitting.current=false;bdSetSaving(false)}`);
    setup = replace(setup, 'if(r===0)return i.jsx(Wle,{onStart:()=>{l(1),a(1)}});', 'if(r===0)return i.jsx("div",{"data-bd-setup-ready":true,children:i.jsx(Wle,{onStart:()=>{l(1),a(1)}})});');
    setup = replace(setup, 'b=Ble(r,u)', 'b=Ble(r,u)&&!bdMissing.length&&!bdSaving');
    setup = replace(setup, 'className:"min-h-[100dvh] w-full bg-[#F8F9FC] flex flex-col overflow-hidden",children:', `"data-bd-setup-ready":true,style:{height:'100dvh',minHeight:0,background:'#F8F9FC',paddingTop:'env(safe-area-inset-top,0px)'},className:"w-full flex flex-col overflow-hidden",children:`);
    setup = replace(setup, 'onClick:j,"aria-label":"Назад"', 'onClick:j,disabled:bdSaving,"aria-label":"Назад"');
    setup = replace(setup, 'className:"flex-1 overflow-y-auto overflow-x-hidden px-6 pt-6 pb-6"', '"data-bd-setup-scroll":true,style:{minHeight:0,overscrollBehavior:"contain"},className:"flex-1 overflow-y-auto overflow-x-hidden px-6 pt-6 pb-6"');
    setup = replace(setup, 'className:"flex-shrink-0 px-6 pb-10 pt-3 bg-[#F8F9FC]",children:[', '"data-bd-setup-actions":true,style:{paddingBottom:"max(12px,env(safe-area-inset-bottom,0px))",background:"#F8F9FC"},className:"flex-shrink-0 px-6 pt-3",children:[bdMissing.length>0&&i.jsx("p",{role:"status",style:{fontSize:13,marginBottom:8},children:"Чтобы продолжить, заполните: "+bdMissing.join(", ")+"."}),bdError&&i.jsx("p",{role:"alert",style:{color:"#b42318",marginBottom:8},children:bdError}),');
    setup = replace(setup, 'children:N?"Создать заведение":"Продолжить"', 'children:bdSaving?"Сохранение…":N?"Создать заведение":"Далее"');
    setup = replace(setup, 'onClick:y,className:"w-full mt-3', 'onClick:y,disabled:bdSaving,className:"w-full mt-3');
    bundle = bundle.slice(0, start) + setup + bundle.slice(end);
    fs.writeFileSync(file, bundle);
}
// The static launch node must follow its owner's pending state. The generic
// unified-splash rule otherwise overrides display:none even on /setup.
for (const name of ['public/app.html', 'app/bar-doctor-response.ts', 'scripts/patch-stable-splash-v394.mjs']) {
    const p = new URL(name, root);
    let source = fs.readFileSync(p, 'utf8');
    if (!source.includes('/* bd-static-splash-ownership-v444 */'))
        source = replace(source, '.bd-static-startup-v201 { display: none; }', '.bd-static-startup-v201 { display: none; }\n      /* bd-static-splash-ownership-v444 */\n      .bd-static-startup-v201.bd-unified-splash-v394 { display: none; }');
    fs.writeFileSync(p, source);
}
console.log('First venue setup ownership, scrolling, draft and submit guard patched');
