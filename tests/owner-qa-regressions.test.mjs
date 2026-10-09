import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import {compileFinancialClient} from './helpers/financial-client-phase7.mjs';
const bundle=fs.readFileSync('public/assets/index-BQGspy0I.js','utf8');
const ast=parse(bundle,{ecmaVersion:'latest',sourceType:'module'});
function extract(names){return ast.body.filter(n=>n.type==='FunctionDeclaration'&&names.includes(n.id.name)).map(n=>bundle.slice(n.start,n.end)).join('\n');}
function nodes(tree){if(!tree||typeof tree!=='object')return[];return[tree,...Object.values(tree).flatMap(v=>Array.isArray(v)?v.flatMap(nodes):nodes(v))];}
const jsx=(type,props)=>({type,props});
test('writeoff preview uses stock units for prices and shortage, both metric scales and packages',()=>{
 const c=vm.createContext({i:{jsx,jsxs:jsx},bdWarehouseDecimal:v=>String(v),bdWarehouseMoney:v=>String(v)});
 vm.runInContext(extract(['bdWriteoffDefaultUnitV271','bdWriteoffUnitLabelV271','bdWriteoffDisplayQuantityV271','bdWriteoffBaseV271','bdWriteoffPackageAmountV271','bdWriteoffLineV271']),c);
 for(const [unit,small,label]of[['l','ml','л','мл'],['kg','g','кг','г']]){
  for(const [stockUnit,current,price]of[[unit,40,20],[small,40000,.02]]){
   for(const [inputUnit,quantity]of[[unit,2],[small,2000],['package:1 '+label,2]]){
    const item={name:'QA',unit:stockUnit,current,averageUnitCost:price};const line={quantity,unit:inputUnit};
    const base=c.bdWriteoffBaseV271(item,line);assert.equal(base.amount*price,40);assert.equal(base.unit,stockUnit);
    const tree=c.bdWriteoffLineV271({item,line});const text=JSON.stringify(tree);assert.match(text,/≈ 40/);assert.doesNotMatch(text,/Будет отрицательный остаток/);assert.match(text,new RegExp('Остаток: 40 '+label));
    assert.equal(c.bdWriteoffDefaultUnitV271(item),unit);
   }
  }
 }
 assert.equal(c.bdWriteoffBaseV271({unit:'l'},{unit:'kg',quantity:2}).amount,0,'incompatible dimensions cannot produce a monetary estimate');
});
test('recorded perEmployee populates all 14 attendances without recomputing history, bonuses and advance stay separate',()=>{
 const employees=[{id:'anna',name:'Анна',payrollRuleId:'rule'},{id:'boris',name:'Борис',payrollRuleId:'rule'},{id:'vera',name:'Вера',payrollRuleId:'rule'}];
 const pairs=[['anna','boris'],['anna','vera'],['anna','boris'],['anna','vera'],['anna','boris'],['boris','vera'],['boris','vera']];
 const rows=pairs.map((ids,n)=>({id:'shift'+n,venueId:1,date:'2026-10-'+String(n+2).padStart(2,'0'),revenue:1000,staffing:ids.map(employeeId=>({employeeId})),payrollBreakdown:{total:400,perEmployee:Object.fromEntries(ids.map(id=>[id,200]))}}));
 const entries=[{id:'bonus',venueId:'1',employeeId:'anna',date:'2026-10-06',createdAt:'2026-10-06',type:'bonus',amount:100},{id:'advance',venueId:'1',employeeId:'anna',date:'2026-10-06',createdAt:'2026-10-06',type:'payment',amount:50}];
 const before=JSON.stringify(rows);const client=compileFinancialClient(bundle,()=>[],{payroll:true});
 const model=client.payroll({id:'1',venueId:1,currency:'MDL'},'2026-10',employees,[{id:'rule',name:'Changed rule',blocks:[{id:'changed',type:'shift_rate',enabled:true,amount:999}]}],rows,[],entries);
 assert.equal(model.reduce((sum,r)=>sum+r.shifts.length,0),14);assert.equal(model.reduce((sum,r)=>sum+r.summary.base,0),2800);
 const anna=model.find(r=>r.employee.id==='anna');assert.equal(anna.shifts.length,5);assert.equal(anna.summary.base,1000);assert.equal(anna.summary.bonus,100);assert.equal(anna.summary.paid,50);assert.equal(anna.summary.balance,1050);assert.equal(JSON.stringify(rows),before);
});
test('equipment create submits numeric 300 and empty optional result instead of calling the state setter',async()=>{
 const state=[];let index=0;let submitted=null;let closed=false;
 const c=vm.createContext({crypto:{randomUUID:()=> 'qa-work'},S:{useState:init=>{const n=index++;if(!(n in state))state[n]=typeof init==='function'?init():init;return[state[n],v=>state[n]=v]},useRef:value=>({current:value})},i:{jsx,jsxs:jsx},bdEquipmentDateKeyV167:()=> '2026-10-06',bdEquipmentHasPermissionV167:()=>true,bdEquipmentPersistWorkOrderV167:async(row,sync)=>{submitted={row,sync};return{workOrder:row}},bdEquipmentSheetV167:'sheet',bdEquipmentFieldV167:'field',sa:'icon'});
 vm.runInContext(extract(['bdEquipmentWorkOrderEditorV167']),c);
 const render=()=>{index=0;return c.bdEquipmentWorkOrderEditorV167({equipment:[{id:'eq',name:'QA'}],employees:[{id:'boris',name:'Борис',status:'active'}],onClose:()=>{closed=true},onSaved:()=>{}})};
 render();state[2]='Ремонт';state[7]='2026-10-10';state[8]='boris';state[10]='300';
 const save=nodes(render()).find(n=>n.type==='button'&&n.props?.children==='Создать работу');assert.ok(save,'create action found');await save.props.onClick();assert.equal(submitted?.row.id,'qa-work');assert.equal(submitted?.row.cost,300);assert.equal(submitted.row.result,undefined);assert.equal(submitted.row.responsibleEmployeeId,'boris');assert.equal(submitted.sync,true);assert.equal(closed,true);
});

test('recorded zero, array snapshots and missing allocation never invent a historical employee amount',()=>{
 const client=compileFinancialClient(bundle,()=>[],{payroll:true});const employees=[{id:'anna',name:'Анна',payrollRuleId:'rule'}],rules=[{id:'rule',blocks:[{type:'shift_rate',enabled:true,amount:999}]}];
 for(const [saved,count,amount]of[[{total:0,perEmployee:{anna:0}},1,0],[{total:200,employees:[{employeeId:'anna',total:200}],perEmployee:{anna:200}},1,200],[{total:200},0,0]]){
  const rows=[{id:'shift',venueId:1,date:'2026-10-02',staffing:[{employeeId:'anna'}],payrollBreakdown:saved}];
  const result=client.payroll({id:'1',venueId:1,currency:'MDL'},'2026-10',employees,rules,rows,[],[])[0];assert.equal(result.shifts.length,count);assert.equal(result.summary.base,amount);
 }
});
