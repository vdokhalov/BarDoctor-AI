import fs from 'node:fs';
import {parse} from 'acorn';
const path='public/assets/index-BQGspy0I.js';let source=fs.readFileSync(path,'utf8');
const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='sle');
if(!node)throw Error('Equipment provider missing');
let provider=source.slice(node.start,node.end);
if(!provider.includes('bdEquipmentRefresh')){
 const original='S.useEffect(()=>{t&&r(Th(bM()))},[t]);';
 if(!provider.includes(original))throw Error('Equipment readiness anchor missing');
 provider=provider.replace(original,'S.useEffect(()=>{t&&r(Th(bM()))},[t]);S.useEffect(()=>{const bdEquipmentRefresh=event=>{if(event?.detail?.storeKey!=="bd_equipment")return;const rows=Th(bM());a.current=rows;r(rows)};window.addEventListener("bd:store-updated",bdEquipmentRefresh);return()=>window.removeEventListener("bd:store-updated",bdEquipmentRefresh)},[]);');
 const update='y=h.map(j=>j.id===f?{...j,...m,updatedAt:g}:j);return Eh(y),y';
 if(!provider.includes(update))throw Error('Equipment update anchor missing');
 // Work-order responses update the authoritative local store outside this provider.
 // Merge profile edits against that current store, never its pre-maintenance render.
 provider=provider.replace(update,'y=Th(bM()).map(j=>j.id===f?{...j,...m,updatedAt:g}:j);return a.current=y,Eh(y),y');
 source=source.slice(0,node.start)+provider+source.slice(node.end);
}
// Report a changed installation date conflicting with known maintenance, without erasing history.
const field='label:"Дата установки / покупки",children:i.jsx("input",{type:"date",value:T,onChange:Z=>A(Z.target.value)})';
const warned='label:"Дата установки / покупки",children:i.jsxs(i.Fragment,{children:[i.jsx("input",{type:"date",value:T,onChange:Z=>A(Z.target.value)}),T!==(e?.purchaseDate||e?.installationDate||"")&&bdEquipmentValidPlanDate(T)&&bdEquipmentValidPlanDate(e?.lastMaintenance)&&T>e.lastMaintenance&&i.jsx("p",{role:"status",className:"text-[12px] text-amber-700",children:"Дата установки позже последнего ТО. Проверьте дату."})]})';
if(source.includes(field))source=source.replace(field,warned);else if(!source.includes(warned))throw Error('Equipment installation field missing');
parse(source,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path,source);console.log('Equipment maintenance state preservation applied');
