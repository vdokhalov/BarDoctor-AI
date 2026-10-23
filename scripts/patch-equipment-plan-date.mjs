import fs from 'node:fs';import {transformSync} from 'esbuild';const path='public/assets/index-BQGspy0I.js';let s=fs.readFileSync(path,'utf8');const restore=process.argv.includes('--restore');
const changes=[];function change(a,b){changes.push([a,b])}
function applyChange(a,b){const x=restore?b:a,y=restore?a:b;if(s.includes(x))s=s.replace(x,y);else if(!restore&&!s.includes(y))throw Error('Equipment date anchor missing: '+x.slice(0,100));}
change('U=S.useRef(null),H=[...new Set([...(Array.isArray(t?.areas)', '[dateError,setDateError]=S.useState(false),U=S.useRef(null),H=[...new Set([...(Array.isArray(t?.areas)');
change('function F(){if(!I)return;const Z=k?', 'function F(){if(!I)return;if(k==="date"&&!bdEquipmentValidPlanDate(z)){setDateError(true);return}setDateError(false);const Z=k?');
change('...(z?{nextDate:z}:{})}:void 0;r({name:a.trim()', '...(["date","interval_days","interval_months"].includes(k)&&z?{nextDate:z}:{})}:void 0;r({name:a.trim()');
change('nextMaintenance:k==="not_required"||k==="as_needed"?void 0:z||void 0','nextMaintenance:!k||k==="not_required"||k==="as_needed"?void 0:z||void 0');
change('label:"Режим ТО",hint:"Можно настроить позже"','label:"План обслуживания",hint:"Можно настроить позже"');
change('value:k,onChange:Z=>O(Z.target.value)','value:k,onChange:Z=>{O(Z.target.value);setDateError(false)}');
change('value:"",children:"ТО не настроено"','value:"",children:"Без плана"');
change('value:"not_required",children:"Регулярное ТО не требуется"','value:"not_required",children:"Регулярное обслуживание не требуется"');
change('label:"Следующее ТО",children:i.jsx("input",{type:"date",value:z,onChange:Z=>L(Z.target.value)})','label:"Следующее обслуживание",children:i.jsxs(i.Fragment,{children:[i.jsx("input",{type:"date",value:z,required:k==="date","aria-invalid":dateError,"aria-describedby":dateError?"bd-maintenance-date-error":undefined,onChange:Z=>{L(Z.target.value);setDateError(false)}}),dateError&&i.jsx("p",{id:"bd-maintenance-date-error",role:"alert",style:{color:"#b42318",marginTop:6},children:"Укажите дату обслуживания"})]})');
change('if(!t)return"ТО не настроено";', 'if(bdEquipmentPlanMissing(e))return"Нужна дата обслуживания";if(!t)return"План не настроен";');
change('bdEquipmentMaintenancePolicyV167(T)||j.unconfigured++','(!bdEquipmentPlanMissing(T)&&bdEquipmentMaintenancePolicyV167(T))||j.unconfigured++');
change('f=d.filter(g=>!bdEquipmentMaintenancePolicyV167(g))','f=d.filter(g=>!bdEquipmentMaintenancePolicyV167(g)||bdEquipmentPlanMissing(g))');
change('value:b.nextMaintenance?bdEquipmentDueLabelV167(b.nextMaintenance):"ТО не настроено"','value:bdEquipmentPlanMissing(b)?"Нужна дата обслуживания":b.nextMaintenance?bdEquipmentDueLabelV167(b.nextMaintenance):"План не настроен"');
change('label:"ТО не настроено",tone:"neutral",onClick:()=>s("unconfigured")','label:"План не настроен",tone:"neutral",onClick:()=>s("unconfigured")');
change('y.state==="unconfigured"?"ТО не настроено":y.workOrder','y.state==="unconfigured"?(bdEquipmentPlanMissing(y.equipment)?"Нужна дата обслуживания":"План не настроен"):y.workOrder');
change('const A=bdEquipmentDaysUntilV167(T.nextMaintenance)','const A=bdEquipmentDaysUntilV167(bdEquipmentPlanDate(T))');
change('const A=bdEquipmentDueBucketV167(T.nextMaintenance)','const A=bdEquipmentDueBucketV167(bdEquipmentPlanDate(T))');
change('v=bdEquipmentDueBucketV167(y.nextMaintenance)','v=bdEquipmentDueBucketV167(bdEquipmentPlanDate(y))');
change('f==="unconfigured"&&!bdEquipmentMaintenancePolicyV167(y)','f==="unconfigured"&&(!bdEquipmentMaintenancePolicyV167(y)||bdEquipmentPlanMissing(y))');
change('return e.nextMaintenance?"Следующее ТО "+bdEquipmentDateV167(e.nextMaintenance):"Дата ТО не указана"','return bdEquipmentPlanDate(e)?"Следующее обслуживание "+bdEquipmentDateV167(bdEquipmentPlanDate(e)):"Дата обслуживания не указана"');
change('h=d.filter(g=>g.nextMaintenance&&!t.some','h=d.filter(g=>bdEquipmentPlanDate(g)&&!t.some');
change('state:bdEquipmentDueBucketV167(g.nextMaintenance),date:g.nextMaintenance','state:bdEquipmentDueBucketV167(bdEquipmentPlanDate(g)),date:bdEquipmentPlanDate(g)');
change('bdEquipmentDueLabelV167(y.equipment.nextMaintenance)','bdEquipmentDueLabelV167(bdEquipmentPlanDate(y.equipment))');
change('b.nextMaintenance?bdEquipmentDueLabelV167(b.nextMaintenance):"План не настроен"','bdEquipmentPlanDate(b)?bdEquipmentDueLabelV167(bdEquipmentPlanDate(b)):"План не настроен"');
change('[dateError,setDateError]=S.useState(false),U=S.useRef(null)','[dateError,setDateError]=S.useState(false),dateField=S.useRef(null),U=S.useRef(null)');
change('setDateError(true);return','setDateError(true);dateField.current?.focus();dateField.current?.scrollIntoView({block:"center"});return');
change('type:"date",value:z,required:k==="date"','ref:dateField,type:"date",value:z,required:k==="date"');
change('bdEquipmentPlanDate(b)?bdEquipmentDueLabelV167(bdEquipmentPlanDate(b)):"План не настроен"','bdEquipmentPlanDate(b)?bdEquipmentDueLabelV167(bdEquipmentPlanDate(b)):bdEquipmentMaintenancePolicyV167(b)?.mode==="as_needed"?"По необходимости":bdEquipmentMaintenancePolicyV167(b)?.mode==="not_required"?"Не требуется":bdEquipmentMaintenancePolicyV167(b)?"Дата не указана":"План не настроен"');
for(const [a,b] of [...changes].reverse())while(s.includes(b))s=s.replace(b,a);
if(!restore)for(const [a,b] of changes)applyChange(a,b);
const start='/* equipment-plan-date:start */',end='/* equipment-plan-date:end */';if(s.includes(start))s=s.slice(0,s.indexOf(start))+s.slice(s.indexOf(end)+end.length);
if(!restore)s=s.replace('function bdEquipmentMaintenancePolicyV167(e){',start+`function bdEquipmentValidPlanDate(value){if(typeof value!=="string"||!/^\\d{4}-\\d{2}-\\d{2}$/.test(value))return false;const date=new Date(value+"T12:00:00Z");return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value}
function bdEquipmentPlanDate(e){const value=e?.nextMaintenance||e?.maintenancePolicy?.nextDate;return bdEquipmentValidPlanDate(value)?value:null}
function bdEquipmentPlanMissing(e){const p=e?.maintenancePolicy;if(p?.mode!=="date")return false;return !bdEquipmentValidPlanDate(e.nextMaintenance||p.nextDate)||!!(p.nextDate&&!bdEquipmentValidPlanDate(p.nextDate))}
`+end+'function bdEquipmentMaintenancePolicyV167(e){');transformSync(s,{loader:"js",logLevel:"silent"});fs.writeFileSync(path,s);
