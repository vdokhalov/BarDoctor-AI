import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
const root=path.resolve(import.meta.dirname,'..'),file=path.join(root,'public/assets/index-BQGspy0I.js');
const start='/* management-actions-phase4b:start */',end='/* management-actions-phase4b:end */';
let source=fs.readFileSync(file,'utf8');
const patches=[
 ['i.jsx(bdCostHealthPhase4a,{venue:Number(bdCostHealthVenue.activeVenueId),onNavigate:e}),','i.jsx(bdManagementQueuePhase4b,{venue:Number(bdCostHealthVenue.activeVenueId),onNavigate:e}),i.jsx(bdCostHealthPhase4a,{venue:Number(bdCostHealthVenue.activeVenueId),onNavigate:e}),'],
 ['const q=[...N].sort','const bdManagementStockContextPhase4b=bdManagementClientPhase4b.useContext({venue:Number(bdUseProcVenueContextV168().activeVenueId),query:o,ready:t,onOpen:context=>{const row=N.find(row=>bdWarehouseKey(row)===String(context.productKey)&&String(row.warehouseId||row.warehouseExternalId||"")===String(context.warehouseKey)&&String(row.unit||"")===String(context.unit));if(row)C(row)}});const q=[...N].sort'],
 ['const B=window.bdReadNavigationQuery("product","");return B?','const B=new URLSearchParams(o).has("healthAction")?"":window.bdReadNavigationQuery("product","");return B?'],
 ['if(H){const X=N.find(Z=>bdWarehouseKey(Z)===H);','if(H&&!B.has("healthAction")){const X=N.find(Z=>bdWarehouseKey(Z)===H);'],
 ['}else C(null)},[o,A,N])','}else if(!B.has("healthAction"))C(null)},[o,A,N])'],
 ['children:[i.jsx(bdAccountingHeader,{title:"Склад"','children:[bdManagementStockContextPhase4b.banner,i.jsx(bdAccountingHeader,{title:"Склад"'],
 ['S.useEffect(()=>{const params=new URLSearchParams(window.location.search),linkedShift=params.get("shift");','const bdManagementDayContextPhase4b=bdManagementClientPhase4b.useContext({venue:Number(bdUseProcVenueContextV168().activeVenueId),query:location,ready:!!profile&&canManage,onOpen:context=>{setViewing(null);setEditing(revenue.find(row=>String(row.date).slice(0,10)===context.businessDate)||{date:context.businessDate});setSheet("revenue")}});S.useEffect(()=>{const params=new URLSearchParams(window.location.search);if(params.has("healthAction"))return;const linkedShift=params.get("shift");'],
 ['className:"bd-shifts-page-v156",children:[','className:"bd-shifts-page-v156",children:[bdManagementDayContextPhase4b.banner,'],
];
const at=source.indexOf(start);if(at>=0){const to=source.indexOf(end,at);if(to<0)throw Error('Incomplete Phase 4B client');source=source.slice(0,at)+source.slice(to+end.length).replace(/^\n/,'');}
for(const[before,after]of patches)source=source.replace(after,before);
if(process.argv.includes('--restore')){fs.writeFileSync(file,source);process.exit(0);}
for(const[before,after]of patches){if(source.split(before).length!==2)throw Error('Unique Phase 4B anchor required: '+before);source=source.replace(before,after);}
const bundle=await build({entryPoints:[path.join(root,'lib/bardoctor/client/management-actions.tsx')],bundle:true,format:'iife',platform:'browser',globalName:'bdManagementModulePhase4b',jsx:'transform',jsxFactory:'React.createElement',tsconfigRaw:{compilerOptions:{jsx:'react'}},minify:true,write:false});
const client=`const bdManagementClientPhase4b=bdManagementModulePhase4b.createManagementActionsClient(S,{headers:()=>ca(Ot()),venue:()=>Number(localStorage.getItem("bd_active_venue_id")),navigate:path=>window.bdNavigate(path),commit:value=>bdBusinessHealthCommitEnvelopeV284(value,true)});function bdManagementQueuePhase4b(props){return i.jsx(bdManagementClientPhase4b.Queue,props)}`;
const anchor='function bdShiftDateLabelV156(';if(source.split(anchor).length!==2)throw Error('Unique Phase 4B insertion required');
source=source.replace(anchor,`${start}\n${bundle.outputFiles[0].text}\n${client}\n${end}\n${anchor}`);fs.writeFileSync(file,source);
console.info('Canonical Phase 4B queue and day/stock context applied.');
