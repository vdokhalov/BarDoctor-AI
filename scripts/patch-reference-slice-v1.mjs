import fs from 'node:fs';
import path from 'node:path';
import {parse} from 'acorn';
import {build} from 'esbuild';
import {repairPayrollMonthInitializers} from './lib/payroll-month-initializers.mjs';

const root=path.resolve(import.meta.dirname,'..'),file=path.join(root,'public/assets/index-BQGspy0I.js');
const start='/* reference-slice-v1:start */',end='/* reference-slice-v1:end */';

/** Follow the repository's reversible prepared-client migration pipeline. */
export async function patchReferenceSlice(restore=false) {
 let source=repairPayrollMonthInitializers(fs.readFileSync(file,'utf8'));
 source=source.replace(/\/\* bd-reference-render:([A-Za-z\d+/=]+) \*\/[\s\S]*?\/\* bd-reference-render:end \*\//g,(_,original)=>Buffer.from(original,'base64').toString('utf8'));
 const at=source.indexOf(start);if(at>=0){const to=source.indexOf(end,at);if(to<0)throw Error('Incomplete reference slice boundary');source=source.slice(0,at)+source.slice(to+end.length).replace(/^\n/,'');}
 if(restore){fs.writeFileSync(file,source);return;}
 const renders={
  bdHomeDaily:`i.jsx(bdReferenceUIV1.Home,{snapshot:bdHealthSnapshot,loading:bdHealthLoading,venue:Number(localStorage.getItem("bd_active_venue_id")),queue:i.jsx(bdManagementQueuePhase4b,{venue:Number(localStorage.getItem("bd_active_venue_id")),onNavigate:g,compact:true}),cost:i.jsx(bdCostHomePhase4a,{onNavigate:g}),today:N,report:j,ready:bdHomeCloudReady,finance:bdHomeCloudReady?i.jsx(bdHomeMoneyCard,{report:j,previousReport:v,onNavigate:g}):i.jsxs("section",{className:"bd-home-money bd-home-money-loading-v344","data-bd-home-money":"authoritative-loading-v344","aria-live":"polite",children:[i.jsx("span",{className:"bd-home-money-label",children:"Финансовый результат периода"}),i.jsx("strong",{children:"Сверяем данные с сервером"}),i.jsx("p",{children:"Показываем итог после проверки источников. Старые локальные значения не используются."})]}),money:GM,onNavigate:g,extras:i.jsxs(i.Fragment,{children:[i.jsx(bdHomeReviewsCardV409,{state:bdHomeReviewState,onNavigate:g}),i.jsx(bdHomeContextCardsV151,{profileKey:String(e?.id??e?.name??"venue"),onNavigate:g})]})})`,
  c_e:`i.jsx(nt,{showBottomNav:true,children:i.jsx($e,{className:"bd-health-detail-v332 bd-reference-health-shell pb-28",children:i.jsx(bdReferenceUIV1.Health,{onRefresh:()=>bdRefreshLiveBusinessHealthV335(),snapshot:n,loading:bdHealthLoading,venue:Number(bdCostHealthVenue.activeVenueId),doctorEntry:i.jsx(bdCuratedClientPhase4c.Suggestion,{venue:Number(bdCostHealthVenue.activeVenueId),snapshot:n,onNavigate:e,returnControl:false}),returnContext:i.jsx(bdCuratedClientPhase4c.Return,{venue:Number(bdCostHealthVenue.activeVenueId)}),queue:i.jsx(bdManagementQueuePhase4b,{venue:Number(bdCostHealthVenue.activeVenueId),onNavigate:e}),cost:i.jsx(bdCostHealthPhase4a,{venue:Number(bdCostHealthVenue.activeVenueId),onNavigate:e}),zones:i.jsx("div",{children:u.map(h=>i.jsx(bdHealthDetailZoneRowV334,{zone:h,snapshot:l,expanded:a===h.id,onToggle:()=>s(a===h.id?null:h.id),onNavigate:e},h.id))}),onNavigate:e})})})`,
  Uce:`i.jsx(nt,{showBottomNav:true,children:i.jsxs($e,{className:"bd-reference-doctor-shell pt-0 pb-28",children:[i.jsx(bdCuratedDoctorPhase4c,{ready:bdAiCloudReady}),i.jsxs("section",{className:"bd-doctor-legacy","data-bd-legacy-diagnosis":v,"aria-label":"Диагностика заведения",children:[i.jsx("h2",{children:"Диагностика заведения"}),v==="loading"?i.jsx("p",{role:"status",children:"Выполняется диагностика…"}):v==="error"?i.jsxs(i.Fragment,{children:[i.jsx("p",{role:"alert",children:bdAiErrorMessage||"Не удалось получить диагноз. Попробуйте снова."}),i.jsx("button",{type:"button",className:"bd-intelligence-secondary",onClick:A,"data-bd-legacy-diagnosis-retry":true,children:"Попробовать снова"})]}):i.jsx("button",{type:"button",className:"bd-intelligence-secondary",onClick:A,"data-bd-legacy-diagnosis-run":true,children:v==="ready"?"Обновить анализ":"Запустить диагностику"}),v==="ready"&&N&&i.jsx(Fce,{data:N.data,generatedAt:N.generatedAt,onRefresh:A})]})]})})`,
 };
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),changes=[];
 for(const [name,render]of Object.entries(renders)){
  const fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);
  const statement=fn?.body.body.findLast(n=>n.type==='ReturnStatement');
  if(!statement?.argument)throw Error('Missing reference surface: '+name);
  const original=source.slice(statement.argument.start,statement.argument.end);
  changes.push({from:statement.argument.start,to:statement.argument.end,text:`/* bd-reference-render:${Buffer.from(original).toString('base64')} */${render}/* bd-reference-render:end */`});
 }
 for(const c of changes.sort((a,b)=>b.from-a.from))source=source.slice(0,c.from)+c.text+source.slice(c.to);
 const bundle=await build({entryPoints:[path.join(root,'lib/bardoctor/client/intelligence-ui.tsx')],bundle:true,format:'iife',platform:'browser',globalName:'bdIntelligenceModuleV1',jsx:'transform',jsxFactory:'React.createElement',tsconfigRaw:{compilerOptions:{jsx:'react'}},minify:true,write:false});
 const anchor='function bdShiftDateLabelV156(';
 if(source.split(anchor).length!==2)throw Error('Unique reference foundation insertion required');
 source=source.replace(anchor,`${start}\n${bundle.outputFiles[0].text}\nconst bdReferenceUIV1=bdIntelligenceModuleV1.createIntelligenceUI(S);\n${end}\n${anchor}`);
 fs.writeFileSync(file,source);
}
if(process.argv[1]===fileURLToPath(import.meta.url))await patchReferenceSlice(process.argv.includes('--restore'));

function fileURLToPath(url){return new URL(url).pathname;}
