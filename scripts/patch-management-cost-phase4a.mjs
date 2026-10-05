import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
const root=path.resolve(import.meta.dirname,'..'),file=path.join(root,'public/assets/index-BQGspy0I.js');
const start='/* management-cost-phase4a:start */',end='/* management-cost-phase4a:end */';
let source=fs.readFileSync(file,'utf8');
const patches=[
 ['function bdHomeAttention(', 'function bdHomeAttentionBeforePhase4a('],
 ['const l=n,u=l?bdHealthDetailZonesV332(l):[]','const bdCostHealthVenue=bdUseProcVenueContextV168();const l=n,u=l?bdHealthDetailZonesV332(l):[]'],
 ['bdHealthLoading?i.jsxs("div",{className:"bd-health-detail-loading-v332"','i.jsx(bdCostHealthPhase4a,{venue:Number(bdCostHealthVenue.activeVenueId),onNavigate:e}),bdHealthLoading?i.jsxs("div",{className:"bd-health-detail-loading-v332"'],
 ['ke=async(w,R)=>{const P=bdCatState(E)', 'ke=async(w,R)=>{const bdCostSaveVenue=Number(s.activeVenueId);const P=bdCatState(E)'],
 ['return z(null),!0},Oe=async w=>', 'await bdCostClientPhase4a.afterSave(bdCostSaveVenue,String(w.menuItemId),w.status);return z(null),!0},Oe=async w=>'],
 ['me=bdProcHasPermissionV168("inventory.manage");S.useEffect', 'me=bdProcHasPermissionV168("inventory.manage"),bdCostReturnPhase4a=bdCostClientPhase4a.useCatalogContext({venue:Number(s.activeVenueId),item:E.menuItems.find(w=>String(w.id)===new URLSearchParams(t).get("menuItemId")),onTarget:w=>{M(null);U(null);q(null);me?z(w):se(String(w.id))},canOpen:n});S.useEffect'],
 ['className:"bd-assortment-command-v170",children:[i.jsx(bdAssortmentHeaderV170', 'className:"bd-assortment-command-v170",children:[bdCostReturnPhase4a,i.jsx(bdAssortmentHeaderV170'],
 ['onClick:()=>f("/notifications"),className:"bd-home-text-action",children:"Все сигналы"', 'onClick:()=>f("/health?section=management"),className:"bd-home-text-action",children:"Все сигналы"'],
 ['r=t.filter(v=>v.mode==="RECIPE"&&!v.recipe),a=t.filter(v=>v.mode==="RECIPE"&&v.recipe?.status!=="confirmed")','r=t.filter(v=>v.mode==="RECIPE"&&!v.recipe&&!bdCostClientPhase4a.covered(Number(localStorage.getItem("bd_active_venue_id"))).has(String(v.item.id))),a=t.filter(v=>v.mode==="RECIPE"&&v.recipe?.status!=="confirmed"&&!bdCostClientPhase4a.covered(Number(localStorage.getItem("bd_active_venue_id"))).has(String(v.item.id)))'],
];
const homeAttention='i.jsx(bdHomeAttention,{profile:e,report:E,revenue:t,gapReasons:r,equipmentAlerts:l,settings:u,snapshots:d,health:m,employees:a,reviewsState:bdHomeReviewState,onNavigate:g}),';
const healthHero='i.jsx(bdHomeHealthIndexV200,{snapshot:bdHealthSnapshot,diagnosis:f,loading:bdHealthLoading,onNavigate:g}),';
const reviews='i.jsx(bdHomeReviewsCardV409,{state:bdHomeReviewState,onNavigate:g}),';
const homeCost='i.jsx(bdCostHomePhase4a,{onNavigate:g}),';
const homeManagement='i.jsxs("section",{className:"bd-home-management-phase4a","data-bd-home-management":"business-health","aria-labelledby":"bd-home-management-title-phase4a",children:[i.jsx("h2",{id:"bd-home-management-title-phase4a",children:"Business Health"}),'+homeCost+'i.jsx("div",{className:"bd-home-management-summary-phase4a",children:'+healthHero.slice(0,-1)+'})]}),';
source=source.replace(homeManagement,healthHero);
source=source.replace(homeCost+healthHero,healthHero);
source=source.replace(healthHero+homeAttention,healthHero).replace(reviews+'i.jsx(bdHomeTodayCard',reviews+homeAttention+'i.jsx(bdHomeTodayCard');
const at=source.indexOf(start);if(at>=0){const to=source.indexOf(end,at);if(to<0)throw new Error('Incomplete cost client boundary');source=source.slice(0,at)+source.slice(to+end.length).replace(/^\n/,'');}
for(const [before,after]of patches)source=source.replace(after,before);
if(process.argv.includes('--restore')){fs.writeFileSync(file,source);process.exit(0);}
for(const [before,after]of patches){if(source.split(before).length!==2)throw new Error('Unique cost adapter anchor required: '+before.slice(0,100));source=source.replace(before,after);}
const bundle=await build({entryPoints:[path.join(root,'lib/bardoctor/client/management-cost.tsx')],bundle:true,format:'iife',platform:'browser',globalName:'bdCostModulePhase4a',jsx:'transform',jsxFactory:'React.createElement',tsconfigRaw:{compilerOptions:{jsx:'react'}},minify:true,write:false});
const client=`
const bdCostClientPhase4a=bdCostModulePhase4a.createCostManagementClient(S,{headers:()=>ca(Ot()),venue:()=>Number(localStorage.getItem("bd_active_venue_id")),navigate:path=>window.bdNavigate(path),enabled:()=>window.__bdDisableCostManagementPhase4a!==true});
function bdHomeAttention(props){const[revision,refresh]=S.useState(0);S.useEffect(()=>{const listener=()=>refresh(value=>value+1);window.addEventListener("bd-cost-projection-updated",listener);return()=>window.removeEventListener("bd-cost-projection-updated",listener)},[]);return i.jsx(bdHomeAttentionBeforePhase4a,{...props,managementCostRevision:revision})}
function bdCostHomePhase4a(props){const context=bdUseProcVenueContextV168();return i.jsx(bdCostClientPhase4a.Center,{surface:"home",venue:Number(context.activeVenueId),onNavigate:props.onNavigate})}
function bdCostHealthPhase4a(props){const query=ste(),params=new URLSearchParams(query);return i.jsx(bdCostClientPhase4a.Center,{...props,surface:"health",signalId:Number(params.get("venueId"))===props.venue?params.get("signalId"):null})}
`;
source=source.replace(reviews+homeAttention,reviews).replace(healthHero,homeManagement+homeAttention);
const anchor='function bdShiftDateLabelV156(';if(source.split(anchor).length!==2)throw new Error('Unique cost module insertion anchor required');
source=source.replace(anchor,`${start}\n${bundle.outputFiles[0].text}\n${client}\n${end}\n${anchor}`);
fs.writeFileSync(file,source);console.info('Phase 4A cost signal lifecycle client applied.');
