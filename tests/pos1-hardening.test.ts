import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { menuTaxonomyPresentation } from "../lib/bardoctor/nomenclature-taxonomy";
import type { SalesEvent } from "../lib/bardoctor/sales-events";
import type { SalesBatch } from "../lib/bardoctor/sales-consumption";
import { lifecycleRuntime } from "./helpers/lifecycle-runtime";

const taxonomy={sections:[{id:"bar",name:"Бар"},{id:"kitchen",name:"Кухня"},{id:"hookah",name:"Кальяны"},{id:"nested",name:"Напитки",parentId:"bar"}],categories:[{id:"water",name:"Безалкогольные напитки",parentId:"bar"},{id:"food",name:"Продукты",parentId:"kitchen"}],subcategories:[]};
test("POS classification uses canonical and legacy menu links without rewriting stale text",()=>{
  const root={nomenclatureStructure:taxonomy};
  const menu={department:"bar",category:"Без подраздела",sectionId:"kitchen",taxonomyCategoryId:"food"};
  assert.deepEqual(menuTaxonomyPresentation(root,menu),{department:"Кухня",category:"Продукты",categoryId:"food",subcategory:""});
  assert.equal(menu.department,"bar");
  assert.equal(menuTaxonomyPresentation(root,{sectionId:"bar",taxonomyCategoryId:"water"}).category,"Безалкогольные напитки");
  assert.equal(menuTaxonomyPresentation(root,{sectionId:"nested"}).department,"Бар");
  assert.equal(menuTaxonomyPresentation(root,{sectionId:"hookah"}).category,"Без подраздела");
  assert.equal(menuTaxonomyPresentation(root,{sectionId:"deleted",department:"bar"}).department,"Раздел недоступен");
  const legacy={groups:[{id:"g",name:"Кухня"}],subgroups:[{id:"s",groupId:"g",name:"Продукты"}]};
  assert.equal(menuTaxonomyPresentation(legacy,{groupId:"g",subgroupId:"s",department:"bar"}).department,"Кухня");
  assert.equal(menuTaxonomyPresentation(legacy,{groupId:"g",subgroupId:"s"}).category,"Продукты");
});
test("Shared money presentation supports all accounting currencies and unknown cost",()=>{
  const scope={window:{} as {bdFormatAccountingMoney:(value:unknown,currency:string)=>string},Intl};vm.runInNewContext(readFileSync('public/accounting-currency.js','utf8'),scope);
  const format=scope.window.bdFormatAccountingMoney;
  assert.equal(format(30,"PMR_RUB"),"30 руб. ПМР");assert.equal(format(null,"PMR_RUB"),"—");
  for(const currency of ["MDL","RUB","EUR","USD","UAH","RON"])assert.equal(format(123.45,currency),new Intl.NumberFormat("ru-RU",{style:"currency",currency,maximumFractionDigits:2}).format(123.45));
});
test("Local draft identity isolates account, venue and shift and rejects corrupt quantities",()=>{
  const scope={window:{} as {bdPosDraft:{key:(...args:unknown[])=>string;read:(storage:unknown,key:string)=>unknown}}};vm.runInNewContext(readFileSync('public/pos-draft.js','utf8'),scope);
  const draft=scope.window.bdPosDraft;const keys=[[1,1,"night"],[2,1,"night"],[1,2,"night"],[1,1,"day"]].map(args=>draft.key(...args));assert.equal(new Set(keys).size,4);
  assert.throws(()=>draft.read({getItem:()=>JSON.stringify({version:1,id:"order",lines:[{menuItemId:"a",quantity:-1}]})},keys[0]),/повреждён/);
});
test("Real auth + SQLite: canonical event is visible in document journal and linked document without extra writes",async t=>{
  const r=await lifecycleRuntime({events:"./app/api/sales-events/route",documents:"./app/api/sales-batches/route"});t.after(r.close);
  const user=await r.register("pos-hardening@isolated.test"),other=await r.register("pos-other@isolated.test");
  r.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({name:"QA",currency:"PMR_RUB"}),user.userId);
  const venueId=user.activeVenueId;
  r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(user.userId,"bd_assortment_v1",JSON.stringify({nomenclatureStructure:taxonomy,menuItems:[{id:"service",venueId,name:"QA Сервис",type:"service",consumptionMode:"NONE",active:true,salePrice:30,currency:"PMR_RUB",department:"bar",category:"Без подраздела",sectionId:"kitchen",taxonomyCategoryId:"food"}]}),"test");
  const send=(body:unknown)=>r.api.events.POST(r.request(user,"/api/sales-events","POST",body));
  assert.equal((await send({action:"open_shift",venueId,shiftId:"night",name:"Night"})).status,201);
  const command={id:"sale-once",source:"POS_API",shiftId:"night",payments:[{id:"p",method:"CASH",amount:30}],lines:[{id:"l",menuItemId:"service",quantity:1}]};
  const decode=async(response:Promise<Response>|Response)=>await(await response).json() as {ok:boolean;previewHash:string;event:SalesEvent;events:SalesEvent[];menu:{department:string;category:string}[];batches:(SalesBatch & {readOnly:boolean;revenue:number})[];batch:SalesBatch;currency:string;duplicate:boolean};
  const quote=await decode(send({action:"preview",venueId,command}));assert.equal(quote.ok,true);
  const posted=await decode(send({action:"post",venueId,command,previewHash:quote.previewHash}));assert.equal(posted.ok,true);
  const before=JSON.stringify(r.sqlite.prepare("SELECT * FROM domain_data ORDER BY account_id,store_key").all());
  const catalog=await decode(r.api.events.GET(r.request(user,"/api/sales-events")));assert.equal(catalog.menu[0].department,"Кухня");assert.equal(catalog.menu[0].category,"Продукты");
  const journal=await decode(r.api.documents.GET(r.request(user,"/api/sales-batches")));assert.equal(journal.batches.length,1);assert.equal(journal.currency,"PMR_RUB");assert.equal(journal.batches[0].id,posted.event.id);assert.equal(journal.batches[0].readOnly,true);assert.equal(journal.batches[0].revenue,30);
  const linked=await r.api.documents.GET(r.request(user,"/api/sales-batches?id="+encodeURIComponent(posted.event.id)));assert.equal(linked.status,200);assert.equal((await decode(linked)).batch.id,posted.event.id);
  assert.equal((await r.api.documents.GET(r.request(other,"/api/sales-batches?id="+encodeURIComponent(posted.event.id)))).status,404);
  assert.equal(JSON.stringify(r.sqlite.prepare("SELECT * FROM domain_data ORDER BY account_id,store_key").all()),before);
  assert.equal(r.sqlite.prepare("SELECT COUNT(*) n FROM domain_data WHERE store_key='bd_sales_batches'").get()?.n,0,"no parallel sale document");
  assert.equal((await decode(send({action:"post",venueId,command,previewHash:quote.previewHash}))).duplicate,true);
  const movements=r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_stock_movements'").get(user.userId);assert.deepEqual(JSON.parse(String(movements?.data_json)),[],"NONE must not create a stock movement");
  const exact=await decode(r.api.events.GET(r.request(user,"/api/sales-events?externalId=sale-once")));assert.equal(exact.events.length,1);
  assert.equal((await decode(r.api.events.GET(r.request(user,"/api/sales-events?externalId=missing")))).events.length,0);
});

test("Finance and warehouse wrappers use the same formatter and active venue fallback",()=>{
  const source=readFileSync("public/assets/index-BQGspy0I.js","utf8");
  const scope={window:{},Intl,bdAccountingCurrencyV243:(value:unknown)=>String(value||""),bdCurrentAccountingCurrencyV243:()=>"PMR_RUB"};
  vm.runInNewContext(readFileSync("public/accounting-currency.js","utf8"),scope);
  const finance=source.slice(source.indexOf("function bdAccountingMoneyV243("),source.indexOf("\n",source.indexOf("function bdAccountingMoneyV243(")));
  const warehouse=source.slice(source.indexOf("function bdWarehouseMoney("),source.indexOf("\n",source.indexOf("function bdWarehouseMoney(")));
  const money=vm.runInNewContext(finance+"\n"+warehouse+";({finance:bdAccountingMoneyV243,stock:bdWarehouseMoney})",scope);
  assert.equal(money.finance(12),"12 руб. ПМР");assert.equal(money.stock(12),"12 руб. ПМР");assert.equal(money.stock(null),"—");
  for(const currency of ["MDL","RUB","EUR","USD","UAH","RON"])assert.equal(money.stock(30,currency),money.finance(30,currency));
});
