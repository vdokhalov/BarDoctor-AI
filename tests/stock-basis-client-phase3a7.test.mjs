import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
test('prepared warehouse helper uses shared receipt policy and honest unknown/zero/subtotal without mutating cached facts',()=>{
 const text=fs.readFileSync('public/assets/index-BQGspy0I.js','utf8'),start='/* stock-basis-phase3a7:start */',end='/* stock-basis-phase3a7:end */';assert.equal(text.split(start).length,2);const block=text.slice(text.indexOf(start)+start.length,text.indexOf(end));
 const movements=[{id:'x',type:'receipt',venueId:1,productKey:'p',amount:2,unit:'l',costAmount:40,costStatus:'KNOWN',currency:'MDL',date:'2026-10-01',createdAt:'2026-10-01T00:00:00Z',sourceDocumentId:'x',sourceLineId:'x-line'}];
 const ctx={bdProcArray:()=>movements,bdMonthlyVenueIdPhase7:()=>1,bdWarehouseMoney:value=>String(value)};vm.createContext(ctx);vm.runInContext(block,ctx);
 const balances=[{productKey:'p',current:3,unit:'l'},{productKey:'unknown',current:2,unit:'l'}],before=JSON.stringify({movements,balances}),partial=ctx.bdWarehouseInventoryValueSummary(balances,'MDL');assert.equal(partial.total,60);assert.equal(partial.complete,false);assert.equal(partial.knownSubtotal,60);
 const unknown=ctx.bdWarehouseInventoryValueSummary([balances[1]],'MDL');assert.equal(unknown.total,null);assert.equal(ctx.bdWarehouseMoney(unknown.total,'MDL'),'Неизвестно');assert.equal(ctx.bdWarehouseInventoryValueLine(balances[1],'MDL').value,null);
 movements[0].costAmount=0;movements[0].costStatus='KNOWN_ZERO';assert.equal(ctx.bdWarehouseInventoryValueSummary([balances[0]],'MDL').total,0);
 movements[0].costAmount=40;movements[0].costStatus='KNOWN';assert.equal(JSON.stringify({movements,balances}),before);
});
