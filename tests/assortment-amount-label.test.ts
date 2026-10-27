import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import {bdAssortmentAmountV170 as label} from '../lib/bardoctor/assortment-amount-label';
import {enrichmentFixture} from './helpers/cost-enrichment-fixture';
import {buildAssortmentAnalytics} from '../lib/bardoctor/assortment-analytics';
for(const [amount,unit,expected] of [[1,'kg','1 кг'],[.8,'kg','0,8 кг'],[1.2,'kg','1,2 кг'],[.001,'kg','0,001 кг'],[100,'g','100 г'],[1200,'g','1,2 кг'],[.8,'l','0,8 л'],[1.2,'l','1,2 л'],[100,'ml','100 мл'],[1200,'ml','1,2 л'],[2,'pcs','2 шт.'],[.5,'pcs','0,5 шт.'],[0,'kg','0 кг'],[1,' КГ ','1 кг'],[1,'шт.','1 шт.']] as const)test('amount label '+amount+' '+unit,()=>assert.equal(label(amount,unit),expected));
test('unknown unit is never invented as pieces and unknown amount is not zero',()=>{for(const unit of [undefined,null,'','box'])assert.equal(label(.8,unit),'0,8 · единица не указана');for(const value of [null,undefined,NaN,Infinity,'bad','',false])assert.equal(label(value,'kg'),'Не определено');});
for(const [recipeUnit,recipeAmount] of [['kg',.1],['g',100]] as const)test('actual purchase → sold 2 portions → needs with '+recipeUnit,async()=>{
 const f=await enrichmentFixture(recipeUnit,recipeAmount);const assortment:any=structuredClone(f.sale.assortment);assortment.menuItems[0].plannedSales=20;
 const before=JSON.stringify({assortment,documents:f.documents,movements:f.sale.movements});
 const input={...f.input,assortment};const r=buildAssortmentAnalytics(input),row=r.needs.rows.find(x=>x.productKey==='lemon-key')!;
 assert.deepEqual([row.unit,row.currentStock,row.projectedNeed,row.shortage],['kg',.8,2,1.2]);assert.equal(label(row.shortage,row.unit),'1,2 кг');
 assert.equal(row.packages,2);assert.equal(row.packageAmount,1);assert.equal(row.recommendedAmount,2);assert.equal(label(row.recommendedAmount,row.unit),'2 кг','purchase mass is not package count label');
 assert.equal(f.sale.movements.filter((x:any)=>x.type==='sale_consumption').length,2);
 assert.equal(JSON.stringify({assortment,documents:f.documents,movements:f.sale.movements}),before);
 const initial=structuredClone(assortment);initial.stockBalances.find((x:any)=>x.key==='lemon-key').current=1;
 const first=buildAssortmentAnalytics({...input,assortment:initial}).needs.rows.find(x=>x.productKey==='lemon-key')!;assert.deepEqual([first.currentStock,first.projectedNeed,first.shortage],[1,2,1]);assert.equal(label(first.currentStock,first.unit),'1 кг');
 assert.equal(buildAssortmentAnalytics({...input,venueId:999}).needs.rows.length,0);
 assert.deepEqual(buildAssortmentAnalytics(input).needs,r.needs);
});
test('prepared client uses the same formatter for all four need metrics',()=>{const source=readFileSync('public/assets/index-BQGspy0I.js','utf8'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});const n:any=ast.body.find((n:any)=>n.type==='FunctionDeclaration'&&n.id.name==='bdAssortmentAmountV170');const compiled=vm.runInNewContext('('+source.slice(n.start,n.end)+')',{Intl});for(const unit of ['kg','g','l','ml','pcs',''])assert.equal(compiled(.8,unit),label(.8,unit));const card:any=ast.body.find((n:any)=>n.type==='FunctionDeclaration'&&n.id.name==='bdAssortmentNeedsV170');assert.equal((source.slice(card.start,card.end).match(/bdAssortmentAmountV170\(/g)||[]).length,4);});
for(const [recipeUnit,recipeAmount] of [['kg',.1],['g',100]] as const)test('volume path '+(recipeUnit==='kg'?'l':'ml')+' keeps stock and package dimensions separate',async()=>{
 const f=await enrichmentFixture(recipeUnit,recipeAmount);const input=JSON.parse(JSON.stringify(f.input).replaceAll('"kg"','"l"').replaceAll('"g"','"ml"'));input.now=new Date('2026-10-26T12:00:00Z');input.assortment.menuItems[0].plannedSales=20;
 const r=buildAssortmentAnalytics(input).needs.rows.find(x=>x.productKey==='lemon-key')!;
 assert.deepEqual([r.unit,r.currentStock,r.projectedNeed,r.shortage,r.packages,r.recommendedAmount],['l',.8,2,1.2,2,2]);assert.equal(label(r.shortage,r.unit),'1,2 л');
});
