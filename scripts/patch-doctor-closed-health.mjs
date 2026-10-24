import fs from 'node:fs';
const path='public/assets/index-BQGspy0I.js';
let source=fs.readFileSync(path,'utf8');
const start='/* doctor-closed-health:start */',end='/* doctor-closed-health:end */';
const old="p.businessHealth&&i.jsxs(\"details\",{className:\"bd-ai-health-details bd-ai-management-secondary\",children:[i.jsxs(\"summary\",{children:[i.jsxs(\"span\",{children:[i.jsx(\"small\",{children:\"Business Health\"}),i.jsx(\"strong\",{children:b.score==null?\"Недостаточно данных\":b.score+\" / 100 · \"+b.label})]}),i.jsx(\"b\",{children:\"Методика и факты\"})]}),i.jsxs(\"div\",{className:\"bd-ai-health-detail-body\",children:[Array.isArray(b.drivers)&&b.drivers.length>0&&i.jsx(\"ul\",{children:b.drivers.map(c=>i.jsx(\"li\",{children:c},c))}),i.jsx(\"p\",{children:p.businessHealth.explanation}),Array.isArray(p.businessHealth.components)&&i.jsx(\"div\",{className:\"bd-ai-health-components\",children:p.businessHealth.components.map(c=>i.jsxs(\"article\",{children:[i.jsx(\"span\",{children:c.label}),i.jsx(\"strong\",{children:c.score==null?\"—\":c.score}),i.jsx(\"small\",{children:c.evidence?.[0]??c.gaps?.[0]??\"Нет фактической оценки\"})]},c.id))}),i.jsx(\"small\",{className:\"bd-ai-health-method\",children:p.businessHealth.methodology})]})]}),";
const replacement='i.jsx(bdDoctorClosedHealth,{}),';
const component=String.raw`/* doctor-closed-health:start */
function bdDoctorClosedHealth(){const context=bdBusinessHealthAccountContextV284(),[retry,setRetry]=S.useState(0),status=bdUseLiveBusinessHealthV335(context,retry),{snapshot:s}=bdUseBusinessHealthSnapshotV284(),snapshot=s?.closedWorkdayCapture===true?s:null,loading=!snapshot&&(status==="idle"||status==="loading"),failed=!snapshot&&status==="error",label=loading?"Загрузка…":failed?"Не удалось загрузить оценку":!snapshot?"Оценка пока недоступна":snapshot.score==null?"Недостаточно данных":snapshot.score+" / 100 · "+bdHealthUiStatusV332(snapshot.score,snapshot.status,snapshot).label;return i.jsxs("details",{className:"bd-ai-health-details bd-ai-management-secondary","data-bd-doctor-closed-health":snapshot?.snapshotId??status,children:[i.jsxs("summary",{children:[i.jsxs("span",{children:[i.jsx("small",{children:"Business Health"}),i.jsx("strong",{children:label})]}),i.jsx("b",{children:"Методика и факты"})]}),i.jsxs("div",{className:"bd-ai-health-detail-body",children:[failed&&i.jsx("button",{type:"button",onClick:()=>setRetry(n=>n+1),children:"Повторить"}),snapshot&&i.jsxs(i.Fragment,{children:[i.jsx("p",{children:bdHealthLivePeriodV334(snapshot).periodLabel}),i.jsxs("p",{children:["Полнота данных: ",snapshot.dataQualityPercent,"%"]}),i.jsx("div",{className:"bd-ai-health-components",children:(snapshot.zones??[]).map(c=>i.jsxs("article",{children:[i.jsx("span",{children:c.label}),i.jsx("strong",{children:c.score==null?"—":c.score}),i.jsx("small",{children:c.evidence?.[0]??c.gaps?.[0]??"Нет фактической оценки"})]},c.id))}),i.jsx("small",{children:bdHealthUpdatedV332(snapshot.generatedAt)})]})]})]})}
/* doctor-closed-health:end */`;
const labels=[
 ['i.jsx("small",{children:N.label??"Полнота данных"})','i.jsx("small",{style:{marginRight:8},children:"Данные анализа"})'],
 ['i.jsxs("strong",{children:[N.percent??r.dataQuality?.reliabilityPercent??"—","%"]})','i.jsxs("strong",{style:{marginRight:8},children:[N.percent??r.dataQuality?.reliabilityPercent??"—","%"]})']
];
for(const [from,to] of labels){if(process.argv.includes('--restore'))source=source.replace(to,from);else if(!source.includes(to)){if(!source.includes(from))throw Error('Doctor data label anchor missing');source=source.replace(from,to);}}
const at=source.indexOf(start);
if(at>=0){const to=source.indexOf(end,at);if(to<0)throw Error('Incomplete closed Doctor patch');source=source.slice(0,at)+source.slice(to+end.length).replace(/^\n/,'');}
if(process.argv.includes('--restore')){source=source.replace(replacement,old);}else{
 if(!source.includes(replacement)){if(source.split(old).length!==2)throw Error('Doctor Health card anchor missing or ambiguous');source=source.replace(old,replacement);}
 source=source.replace('function Fce(',component+'\nfunction Fce(');
}
fs.writeFileSync(path,source);
