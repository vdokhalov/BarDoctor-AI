import fs from 'node:fs';import {parse} from 'acorn';
const path='public/assets/index-BQGspy0I.js';let s=fs.readFileSync(path,'utf8');
const old='scanDraft&&i.jsx("div",{className:"bd-inventory-info-v245",children:"Распознано из ведомости: "+String(scanDraft.items?.length||0)+" поз."})';
const next='scanDraft&&i.jsxs("div",{className:"bd-inventory-info-v245",children:["Распознано из ведомости: "+String(scanDraft.items?.length||0)+" поз.",scanDraft.unresolved?.length>0&&i.jsxs("div",{role:"alert",children:[i.jsx("strong",{children:"Исправьте строки в файле и загрузите его снова"}),i.jsx("ul",{children:scanDraft.unresolved.map(row=>i.jsxs("li",{children:[row.name,": ",row.reason]},row.id))})]})]})';
if(s.includes(old))s=s.replace(old,next);else if(!s.includes(next))throw Error('Missing inventory import preview');
s=s.replace('disabled:busy||loadingScopes||!selectedScope||!(Number(selectedScope.itemCount)>0)','disabled:busy||loadingScopes||!selectedScope||Boolean(scanDraft?.unresolved?.length)||!(Number(selectedScope.itemCount)>0)');
parse(s,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path,s);console.log('Inventory import: explicit unresolved rows before count creation');
