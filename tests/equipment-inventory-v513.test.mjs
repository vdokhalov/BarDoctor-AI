import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { patchEquipmentInventoryV513 } from '../scripts/patch-equipment-inventory-v513.mjs';
const before=fs.readFileSync(new URL('../public/assets/index-BQGspy0I.js',import.meta.url),'utf8');
const after=patchEquipmentInventoryV513(before);
function extract(source,name,next){return source.slice(source.indexOf('function '+name+'('),source.indexOf('function '+next+'(',source.indexOf('function '+name+'(')));}
const context=vm.createContext({});
vm.runInContext(extract(after,'bdEquipmentCostsV167','bdEquipmentIssuesV167'),context);
const costs=context.bdEquipmentCostsV167;
const fridge={id:'expense-fridge',equipmentId:'fridge',category:'repairs',amount:300,date:'2026-09-12'};
const coffee={id:'expense-coffee',equipmentId:'coffee',equipmentWorkOrderId:'work-coffee',category:'repairs',amount:450,date:'2026-09-30'};
const work={id:'work-coffee',equipmentId:'coffee',cost:450,financeExpenseId:'expense-coffee',costDate:'2026-09-30',kind:'repair'};
const history={id:'work-coffee:fixed',equipmentId:'coffee',workOrderId:'work-coffee',cost:450,date:'2026-10-11',type:'repair'};
test('new equipment detail excludes unrelated venue expenses',()=>{
 assert.match(after,/O=bdEquipmentCostsV167\(m\.filter\(I=>I\.equipmentId===b\.id\),T,/);
 assert.equal(costs([fridge].filter(x=>x.equipmentId==='coffee'),[],[]).length,0);
});
test('dated repair keeps one450 entry before and after fixed/verified history',()=>{
 for(const events of [[],[history],[history,{...history,id:'work-coffee:verified',cost:undefined}]]){
 const result=costs([coffee],[work],events);assert.equal(result.length,1);assert.equal(result[0].amount,450);
 }
 assert.equal(costs([fridge,coffee],[work],[history]).reduce((sum,x)=>sum+x.amount,0),750);
});
test('work order/history dedupe remains identity based across dates without finance',()=>{
 assert.equal(costs([],[work],[history]).length,1);
 assert.equal(costs([{...coffee,equipmentWorkOrderId:undefined}],[work],[history]).length,1);
});
test('unrelated standalone historical repairs retained',()=>{
 assert.equal(costs([coffee],[work],[history,{id:'other',equipmentId:'coffee',cost:75,date:'2026-08-01',type:'repair'}]).length,2);
});
test('review uses base quantity for persisted kg/l snapshots and package inputs',()=>{
 const c=vm.createContext({bdWarehouseNumber:Number,bdWarehouseDecimal:(n)=>String(n),bdWarehouseUnit:u=>({kg:'кг',l:'л',g:'г',ml:'мл',pcs:'шт.'}[u]||u)});
 vm.runInContext(extract(after,'bdInventoryCountDisplayValue','bdInventoryCountDifferenceValue'),c);
 for(const [line,value,label] of [[{unit:'kg',entryUnit:'шт.',entryFactor:1},4.82,'4.82 кг'],[{unit:'l',entryUnit:'шт.',entryFactor:1},75.2,'75.2 л'],[{unit:'kg',entryUnit:'шт.',entryFactor:1},-.04,'-0.04 кг'],[{unit:'ml',entryUnit:'бут.',entryFactor:700},1400,'1400 мл']])assert.equal(c.bdInventoryCountDisplayValue(line,value),label);
});
test('persisted layout resets only owned surface after commit, never failed or dirty edits',()=>{
 const start=after.indexOf('const bdInventorySurfaceV513='),end=after.indexOf('function syncDocument',start);
 let effect, deps,cleaned=[];
 const sheet={};
 const c=vm.createContext({S:{useRef:()=>({current:sheet}),useLayoutEffect:(fn,d)=>{effect=fn;deps=d}},window:{bdMarkNavigationClean:s=>cleaned.push(s)},doc:{id:'saved'},phase:'review',dirty:false});
 vm.runInContext(after.slice(start,end),c);effect();assert.equal(cleaned[0],sheet);assert.equal(deps[0],c.doc);
 cleaned=[];c.dirty=true;effect();assert.equal(cleaned.length,0);
 assert.match(after,/ref:bdInventorySurfaceV513,className:"bd-inventory-sheet/);
});
test('equipment passport exposes name/state instead of technical key; replay stable',()=>{
 assert.doesNotMatch(after,/children:"ID: "\+\(b.internalId\|\|b.id\)/);
 assert.match(after,/children:b.name\}\),i.jsx\(bdEquipmentStatusBadgeV167/);
 assert.equal(patchEquipmentInventoryV513(after),after);
});
