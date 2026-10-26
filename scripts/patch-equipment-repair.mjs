import fs from 'node:fs/promises';import{parse}from'acorn';import{transform}from'esbuild';
const path=new URL('../public/assets/index-BQGspy0I.js',import.meta.url);let s=await fs.readFile(path,'utf8');
function replace(name,fn){const n=parse(s,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name===name);if(!n)throw Error(name);const old=s.slice(n.start,n.end),next=fn(old);if(next===old)return;s=s.slice(0,n.start)+next+s.slice(n.end)}
const risk=(await transform((await fs.readFile(new URL('../lib/bardoctor/equipment-breakdown-risk.ts',import.meta.url),'utf8')).replace('export function','function'),{loader:'ts',target:'es2022'})).code;
if(!s.includes('function bdRepairDetail(')){
 replace('bdEquipmentBusinessRisk',()=> 'function bdEquipmentBusinessRisk(equipment){return equipment?equipmentBreakdownRisk(equipment):null}');
 replace('aue',t=>{
 t=t.replace('I=m.trim().length>0&&Number.isFinite(new Date(b).getTime())&&(!U||!!k)','I=(U?!!k:m.trim().length>0)&&Number.isFinite(new Date(b).getTime())');
 t=t.replace('[m,h]=S.useState(bdSeed.current.m||"")','[bdDue,bdSetDue]=S.useState(bdSeed.current.bdDue||""),[m,h]=S.useState(bdSeed.current.m||"")');
 t=t.replaceAll('{m,g,j,b,E,T,k,M,z}', '{m,g,j,b,E,T,k,M,z,bdDue}').replace('m,g,j,b,E,T,k,M,z};','m,g,j,b,E,T,k,M,z,bdDue};').replace('M:[],z:null}', 'M:[],z:null,bdDue:""}');
 t=t.replace('title:m.trim(),description:', 'title:U?`${Y.name} не работает`:m.trim(),description:');
 t=t.replace('const rows=await bdIncidentSave(ve,bdScope.current)', 'const rows=U?await bdBreakdownRequest({breakdownAction:"create",incident:ve,plan:{responsibleEmployeeId:E,responsibleName:g,dueDate:bdDue}},bdScope.current):await bdIncidentSave(ve,bdScope.current)');
 t=t.replace('if(bdMounted.current)t(ve)', 'if(bdMounted.current)t(rows.find(row=>row.id===ve.id)||ve)');
 t=t.replace('children:f.intro', 'children:U?"Отметьте оборудование, которое нельзя нормально использовать.":f.intro');
 t=t.replace('i.jsxs("div",{children:[i.jsx(rs,{children:f.titleLabel})', '!U&&i.jsxs("div",{children:[i.jsx(rs,{children:f.titleLabel})');
 t=t.replace('f.extraLabel&&','!U&&f.extraLabel&&');
 t=t.replace('children:"Описание"', 'children:U?"Комментарий, необязательно":"Описание"').replace('placeholder:f.descriptionPlaceholder','placeholder:U?"Комментарий к записи":f.descriptionPlaceholder');
 t=t.replace('children:"Кто отвечает за решение"','children:U?"Ответственный сотрудник, необязательно":"Кто отвечает за решение"');
 t=t.replace('children:"Ответственный выбирается из сотрудников заведения, а не вводится вручную."','children:U?"Можно указать сервис или мастера ниже.":"Ответственный выбирается из сотрудников заведения, а не вводится вручную."');
 t=t.replace('i.jsxs("div",{children:[i.jsx(rs,{children:"Фото (до 3)"})','!U&&i.jsxs("div",{children:[i.jsx(rs,{children:"Фото (до 3)"})').replace('i.jsxs("div",{children:[i.jsx(rs,{children:"Голосовая заметка"})','!U&&i.jsxs("div",{children:[i.jsx(rs,{children:"Голосовая заметка"})');
 t=t.replace('U&&k&&i.jsx(bdEquipmentRiskCard', 'U&&!E&&i.jsxs("label",{className:"flex flex-col gap-2 text-[13px]",children:["Кто занимается ремонтом, необязательно",i.jsx(O0,{value:g,onChange:y,placeholder:"Имя или сервис"})]}),U&&i.jsxs("label",{className:"flex flex-col gap-2 text-[13px]",children:["Срок ремонта, необязательно",i.jsx("input",{type:"date",value:bdDue,onChange:event=>bdSetDue(event.target.value),className:"w-full min-w-0 h-[52px] bg-card border border-border rounded-2xl px-4 text-[15px]"})]}),U&&k&&i.jsx(bdEquipmentRiskCard');
 return t;
 });
 replace('HCe',t=>t.replace('const v=u,b=Oa[v.category];','if(u.equipmentWorkOrderId&&u.repair)return i.jsx(bdRepairDetail,{event:u},u.id);const v=u,b=Oa[v.category];').replace('i.jsxs("button",{type:"button",onClick:()=>{if(window.confirm("Запустить платную AI-оценку приоритета?"))y(!0)}','v.category!=="equipment"&&i.jsxs("button",{type:"button",onClick:()=>{if(window.confirm("Запустить платную AI-оценку приоритета?"))y(!0)}'));
 // New repair records use their simple event view; old work orders keep their existing workflow.
 replace('bdEquipmentWorkOrderEditorV167',t=>t.replace('return i.jsx(', 'if(e?.flow==="breakdown_v2")return i.jsxs("div",{className:"bd-card p-5",children:[i.jsx("p",{children:"Ремонт связан с событием поломки"}),i.jsx("a",{href:"/events/"+encodeURIComponent(e.incidentId)+"?venue="+encodeURIComponent(localStorage.getItem("bd_active_venue_id")||""),className:"text-primary",children:"Открыть ремонт"})]});return i.jsx('));
 if(s.includes('function equipmentBreakdownRisk('))replace('equipmentBreakdownRisk',()=>risk.trim());else s=risk+'\n'+s;
 const fragment=await fs.readFile(new URL('./fragments/equipment-repair-ui.js',import.meta.url),'utf8');
 // The old prototype card is replaced, never duplicated.
 const card=parse(fragment,{ecmaVersion:'latest'}).body.find(n=>n.id?.name==='bdEquipmentRiskCard');replace('bdEquipmentRiskCard',()=>fragment.slice(card.start,card.end));
 s=fragment.slice(0,card.start)+fragment.slice(card.end)+'\n'+s;
}else{
 replace('equipmentBreakdownRisk',()=>risk.trim());
 const fragment=await fs.readFile(new URL('./fragments/equipment-repair-ui.js',import.meta.url),'utf8');for(const n of parse(fragment,{ecmaVersion:'latest'}).body)if(n.type==='FunctionDeclaration'){if(!s.includes('function '+n.id.name+'('))s=fragment.slice(n.start,n.end)+'\n'+s;else replace(n.id.name,old=>fragment.slice(n.start,n.end));}
}
if(!s.includes('bdEquipmentEntry')){
 replace('sue',t=>t.replace('const[,e]=bt()', 'const bdEquipmentEntry=S.useRef(new URLSearchParams(location.search).get("equipment")||""),[,e]=bt()').replace('[n,r]=S.useState("pick"),[a,s]=S.useState(null)', '[n,r]=S.useState(bdEquipmentEntry.current?"form":"pick"),[a,s]=S.useState(bdEquipmentEntry.current?"equipment":null)'));
 replace('aue',t=>t.replace('bdInitial=S.useRef(null)', 'bdPreset=S.useRef(e==="equipment"?new URLSearchParams(location.search).get("equipment")||"":""),bdInitial=S.useRef(null)').replace('[k,O]=S.useState(bdSeed.current.k||"")', '[k,O]=S.useState(bdSeed.current.k||bdPreset.current)').replace('I=(U?!!k:m.trim().length>0)', 'I=(U?B.some(row=>row.id===k):m.trim().length>0)').replace('T:[],k:"",M:[]', 'T:[],k:bdPreset.current,M:[]'));
 replace('JAe',t=>t.replace('onClick:()=>v({equipmentId:b.id,kind:"problem",status:"detected"})', 'onClick:()=>t("/add?equipment="+encodeURIComponent(b.id)+"&venue="+encodeURIComponent(localStorage.getItem("bd_active_venue_id")||""))'));
}
if(!s.includes('bdRepairReminder(e)&&'))replace('due',t=>t.replace('e.description&&i.jsx', 'bdRepairReminder(e)&&i.jsx("p",{className:"text-[12px] font-semibold text-amber-700 mb-2",children:bdRepairReminder(e)}),e.description&&i.jsx'));
parse(s,{ecmaVersion:'latest',sourceType:'module'});await fs.writeFile(path,s.replace(/[ \t]+$/gm,''));console.log('Equipment simple repair applied');
