import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
const source=fs.readFileSync('public/assets/index-BQGspy0I.js','utf8');
test('purchase review uses shared formatter only in its three display positions',()=>{
 const fn=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name==='bdPurchaseReview');
 const body=source.slice(fn.start,fn.end);assert.equal((body.match(/window\.bdFormatAccountingMoney\(/g)||[]).length,3);assert.equal(body.includes('bdProcMoney('),false);
});
test('shared display preserves currency identity for PMR, RUB, EUR and USD',()=>{
 const context={window:{},Intl};const start=source.indexOf('/* bd-shared-accounting-money-start */'),end=source.indexOf('/* bd-shared-accounting-money-end */',start);assert.ok(end>start);vm.runInNewContext(source.slice(start,end),context);
 for(const currency of ['PMR_RUB','RUB','EUR','USD']){const result=context.window.bdFormatAccountingMoney(12,currency);if(currency==='PMR_RUB')assert.equal(result,'12 руб. ПМР');else{assert.equal(result,new Intl.NumberFormat('ru-RU',{style:'currency',currency,maximumFractionDigits:2}).format(12));if(currency!=='RUB')assert.doesNotMatch(result,/₽|руб/);}}
});

test('overview money presentation is scoped and keeps existing currency defaults',()=>{
 const nodes=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body;
 const fn=nodes.find(n=>n.type==='FunctionDeclaration'&&n.id?.name==='bdProcOverviewV168');const body=source.slice(fn.start,fn.end);assert.ok(body.includes('const bdOverviewMoney='));assert.equal(body.includes('bdProcMoneyV168('),false);
 const shared=nodes.find(n=>n.type==='FunctionDeclaration'&&n.id?.name==='bdProcMoneyV168');assert.ok(source.slice(shared.start,shared.end).includes('new Intl.NumberFormat'),'other screens retain existing helper');
});
