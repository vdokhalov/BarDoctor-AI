import fs from 'node:fs';import {parse} from 'acorn';import {transformSync} from 'esbuild';
const path='public/assets/index-BQGspy0I.js';let s=fs.readFileSync(path,'utf8');
function replace(name,fn){const n=parse(s,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);if(!n)throw Error('Missing '+name);s=s.slice(0,n.start)+fn(s.slice(n.start,n.end))+s.slice(n.end)}
const helper=transformSync(fs.readFileSync('lib/bardoctor/assortment-readiness-view.ts','utf8').replace('export function','function'),{loader:'ts'}).code;
if(s.includes('function assortmentReadinessView('))replace('assortmentReadinessView',()=>helper.trim());else s=helper+'\n'+s;
replace('bdAssortmentSummaryV170',t=>t.replace('{analytics:e}', '{analytics:e,analyticsStatus:bdReadinessStatus}').replace('const t=[','const view=assortmentReadinessView(e,bdReadinessStatus),t=[').replace('label:"Готовность данных",value:e.summary.readinessPercent+"%"','label:"Проверки меню",value:view.score').replace('label:"Техкарты готовы"','label:"Подтверждённые техкарты"'));
replace('bdAssortmentOverviewV170',t=>{
 if(t.includes('bdReadinessStatus'))return t;
 t=t.replace('canManage:l,','canManage:l,analyticsStatus:bdReadinessStatus,').replace('const u=e.summary.menuItems>0','const view=assortmentReadinessView(e,bdReadinessStatus),u=e.summary.menuItems>0');
 t=t.replace('bdAssortmentSummaryV170,{analytics:e}', 'bdAssortmentSummaryV170,{analytics:e,analyticsStatus:bdReadinessStatus}');
 t=t.replace('children:"Готовность данных"','children:"Проверки меню"').replace('children:e.readiness.formula','children:"Настройка меню и текущие закупочные цены"').replace('children:e.readiness.score+"%"','children:view.score');
 t=t.replace('width:Math.max(0,Math.min(100,e.readiness.score))+"%"','width:(view.verified?Math.max(0,Math.min(100,e.readiness.score)):0)+"%"');
 t=t.replace('m.length?i.jsx(', 'i.jsx("p",{className:"bd-assortment-muted-v170",children:view.costLabel}),m.length?i.jsx(');
 t=t.replace('children:"Критичных пробелов нет"','children:view.noIssuesLabel').replace('children:"Обязательные данные готовы для текущего расчёта."','children:view.verified?"Продажи за период показаны отдельно ниже.":"Дождитесь загрузки серверных данных."');
 t=t.replace('"Расчёты готовы"','"Техкарты подтверждены"').replace('children:"Желательные данные — не влияют на score"','children:"Дополнительные данные — вне процента"');
 return t;
});
replace('bdAssortmentOverviewV170',t=>t.includes('bd-readiness-layout')?t:t.replace('className:"bd-assortment-overview-v170",children:[','className:"bd-assortment-overview-v170",children:[i.jsx("style",{"data-bd-readiness-layout":true,children:".bd-assortment-overview-v170{container-type:inline-size}.bd-assortment-panel-v170.readiness>header>strong{white-space:nowrap;flex-shrink:0}@container(max-width:600px){.bd-assortment-overview-grid-v170{grid-template-columns:minmax(0,1fr)!important}}"}),'));
replace('bdAssortmentCommandPageV170',t=>t.includes('analyticsStatus:bdAnalyticsStatusPhase2')?t:t.replace('bdAssortmentOverviewV170,{analytics:he,','bdAssortmentOverviewV170,{analytics:he,analyticsStatus:bdAnalyticsStatusPhase2,'));
parse(s,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path,s);console.log('Assortment readiness copy and current costing applied');
