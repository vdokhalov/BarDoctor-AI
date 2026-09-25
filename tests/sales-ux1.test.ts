import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {salesEventFixture,saleCommand} from './helpers/sales-event-fixture';
import {planSalesEvent,salesEventDocuments} from '../lib/bardoctor/sales-events';
const sandbox={window:{},Intl,Date,Map,Set};vm.runInNewContext(readFileSync('public/sales-journal.js','utf8'),sandbox);
const journal=(sandbox.window as {bdSalesJournal?:{matches:(doc:unknown,filters:unknown)=>boolean;totals:(docs:unknown,currency:string)=>{revenue:number;count:number;average:number;imports:number};amount:(doc:unknown)=>number|null;metadata:(doc:unknown,shifts:unknown,money:unknown)=>string;movements:(doc:unknown)=>string}}).bdSalesJournal!;
const fixture=salesEventFixture(), result=await planSalesEvent(fixture,saleCommand('whisky',2));
const documents=salesEventDocuments([result.event],1);
test('journal filters exact IDs, product and comment without changing authoritative documents',()=>{
  const before=JSON.stringify(documents), doc={...documents[0],comment:'Без льда',payments:[{method:'CASH'}]};
  for(const query of [doc.id,'wHiSkY','без льда'])assert.equal(journal.matches(doc,{query}),true);
  assert.equal(journal.matches(doc,{query:'beer'}),false);
  assert.equal(journal.matches(doc,{from:'2027-01-01'}),false);
  assert.equal(journal.matches(doc,{to:'2025-01-01'}),false);
  assert.equal(journal.matches(doc,{payment:'CARD_EXTERNAL'}),false);
  assert.equal(journal.matches(doc,{actor:String(fixture.actor.accountId),source:'MANUAL',status:'POSTED',payment:'CASH'}),true);
  assert.equal(JSON.stringify(documents),before);
});
test('receipt KPIs exclude imports, reversals and other currencies, preserving unknown cost',()=>{
  const doc=documents[0], imports={...doc,readOnly:false,source:'TEXT_IMPORT',revenue:900};
  const result=journal.totals([doc,imports,{...doc,status:'REVERSED'},{...doc,currency:'USD'}],'MDL');
  assert.equal(result.revenue,80);assert.equal(result.count,1);assert.equal(result.average,80);assert.equal(result.imports,1);
  assert.equal(doc.costStatus,'UNVALUED');assert.equal(doc.totalTheoreticalCost,null);
  assert.equal(journal.amount({...imports,revenue:undefined}),null);
});
test('documents use readable shift names and escaped metadata; no-consumption has an explicit explanation',async()=>{
  const doc={...documents[0],shiftId:'technical-uuid',actor:{name:'<script>name</script>'}};
  const html=journal.metadata(doc,[{id:'technical-uuid',label:'Вечерняя смена'}],String);
  assert.match(html,/Вечерняя смена/);assert.doesNotMatch(html,/technical-uuid|<script>/);assert.match(html,/&lt;script&gt;/);
  const none=salesEventDocuments([(await planSalesEvent(salesEventFixture(),saleCommand('ticket',1))).event],1)[0];
  assert.match(journal.movements(none),/списание не требуется/);
  assert.match(journal.movements(doc),/sourceDocumentId=/);
});
