import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const file='public/assets/index-BQGspy0I.js';
test('warehouse readiness effect reads on every mount and never invokes mutating repair',()=>{
 const source=fs.readFileSync(file,'utf8'),match=source.match(/S\.useEffect\(\(\)=>\{t&&L\(\)\},\[t\]\)/g);
 assert.equal(match?.length,1);assert.equal(source.includes('t&&(L(),bdWarehouseRepairProducts())'),false);
 assert.ok(source.includes('async function bdWarehouseRepairProducts()'),'Existing explicit client command is retained');
 let reads=0,repairs=0;const context={t:true,L:()=>reads++,bdWarehouseRepairProducts:()=>repairs++,S:{useEffect:callback=>callback()}};
 vm.runInNewContext(match[0],context);vm.runInNewContext(match[0],context);assert.equal(reads,2);assert.equal(repairs,0);
 context.t=false;vm.runInNewContext(match[0],context);assert.equal(reads,2);
});
test('warehouse summary reports 3/4 coverage, unknown is null and genuine known-zero is zero',()=>{
 const source=fs.readFileSync(file,'utf8'),start='/* stock-basis-phase3a7:start */',end='/* stock-basis-phase3a7:end */';
 const balances=[{productKey:'beer',current:2,unit:'pcs'},{productKey:'liquid',current:5,unit:'l'},{productKey:'zero',current:2,unit:'kg'},{productKey:'unknown',current:10,unit:'kg'}];
 const movements=balances.slice(0,3).map((b,i)=>({id:'r'+i,type:'receipt',venueId:1,productKey:b.productKey,amount:2,unit:b.unit,costAmount:i===2?0:80,costStatus:i===2?'KNOWN_ZERO':'KNOWN',currency:'MDL',date:'2026-10-01',createdAt:'2026-10-01T00:00:00Z',sourceDocumentId:'d'+i,sourceLineId:'l'+i}));
 const context={bdProcArray:()=>movements,bdMonthlyVenueIdPhase7:()=>1,bdWarehouseMoney:value=>String(value)};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf(start)+start.length,source.indexOf(end)),context);
 const before=JSON.stringify({balances,movements});
 const canonical=context.bdStockBasisPhase3a7.summarizeInventoryValuation({balances,venueId:1,stockMovements:movements,accountingCurrency:'MDL'});
 assert.equal(canonical.lines.length,4);assert.equal(canonical.valuedCount,3);assert.equal(canonical.unvaluedCount,1);assert.equal(canonical.total,null);assert.equal(canonical.knownSubtotal,280);
 assert.equal(canonical.lines[3].value,null);assert.equal(canonical.lines[2].value,0);assert.equal(canonical.lines[2].costBasis.status,'KNOWN_ZERO');
 const view=context.bdWarehouseInventoryValueSummary(balances,'MDL');assert.equal(view.complete,false);assert.equal(view.unresolved,1);assert.equal(view.knownSubtotal,280);
 assert.ok(source.includes('Не рассчитано: '));assert.equal(JSON.stringify({balances,movements}),before);
});
