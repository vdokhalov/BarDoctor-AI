import { buildAssortmentAnalytics } from "../lib/bardoctor/assortment-analytics";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { menuTaxonomyPresentation, menuTaxonomyHierarchy } from "../lib/bardoctor/nomenclature-taxonomy";
import { defaultNomenclatureStructure } from "../lib/bardoctor/nomenclature";
import { salesBatchKpis } from "../lib/bardoctor/sales-consumption";
import { openingRuntime } from "./helpers/opening-runtime";
import { salesEventFixture } from "./helpers/sales-event-fixture";
import type { SalesEvent } from "../lib/bardoctor/sales-events";

const structure={sections:[{id:"bar",name:"Бар"},{id:"kitchen",name:"Кухня"},{id:"hookah",name:"Кальянная"}],categories:[{id:"water",name:"Безалкогольные напитки",parentId:"bar"},{id:"food",name:"Продукты",parentId:"kitchen"},{id:"tobacco",name:"Табак и смеси",parentId:"hookah"}],subcategories:[{id:"soda",name:"Вода и газировка",parentId:"water"},{id:"bread",name:"Хлеб и выпечка",parentId:"food"}]};
const menu=[{id:"water",sectionId:"bar",taxonomyCategoryId:"water",subcategoryId:"soda"},{id:"bread",sectionId:"kitchen",taxonomyCategoryId:"food",subcategoryId:"bread"},{id:"hookah",sectionId:"hookah",taxonomyCategoryId:"tobacco"}].map(row=>({...row,name:row.id,department:"bar",category:"Без подраздела",groupId:"old-bar"}));
test("F01 canonical Menu hierarchy ignores stale analytics/legacy text, retains all three levels without writes",()=>{
 const root={nomenclatureStructure:structure,menuItems:menu};const before=JSON.stringify(root);
 const tree=menuTaxonomyHierarchy({menuItems:menu.map(m=>({id:m.id,groupId:"old-bar",groupName:"Бар",category:"Без подраздела"}))},root);
 assert.deepEqual(tree.map(g=>g.name),["Бар","Кухня","Кальянная"]);
 assert.equal(tree[0].roots[0].name,"Безалкогольные напитки");assert.equal(tree[0].roots[0].children[0].name,"Вода и газировка");
 assert.equal(tree[1].roots[0].children[0].items[0].id,"bread");assert.equal(tree[2].roots[0].items[0].id,"hookah");
 assert.equal(JSON.stringify(root),before);assert.equal(tree.flatMap(g=>g.allItems).length,3);
});
test("F02 canonical identity survives rename; legacy hookah identity resolves to the same section",()=>{
 const root={nomenclatureStructure:defaultNomenclatureStructure(),groups:[{id:"old-hookah",name:"Кальяны",legacyDepartment:"hookah"}],subgroups:[{id:"old-tobacco",groupId:"old-hookah",name:"Табак и смеси"}]};
 const canonical=menuTaxonomyPresentation(root,{sectionId:"hookah"});const legacy=menuTaxonomyPresentation(root,{groupId:"old-hookah",subgroupId:"old-tobacco"});
 assert.equal(legacy.sectionId,canonical.sectionId);assert.equal(legacy.department,"Кальянная");
 root.nomenclatureStructure.sections.find(s=>s.id==="hookah")!.name="Авторский раздел";
 assert.equal(menuTaxonomyPresentation(root,{sectionId:"hookah"}).sectionId,"hookah");assert.equal(menuTaxonomyPresentation(root,{groupId:"old-hookah",subgroupId:"old-tobacco"}).department,"Авторский раздел");
});
test("F01 missing canonical link is explicit; absent subgroup and partial legacy links do not invent subcategories",()=>{
 assert.equal(menuTaxonomyPresentation({nomenclatureStructure:structure},{sectionId:"deleted",taxonomyCategoryId:"gone"}).category,"Категория недоступна");
 assert.equal(menuTaxonomyPresentation({nomenclatureStructure:structure},{sectionId:"bar"}).subcategoryId,"");
 assert.equal(menuTaxonomyPresentation({nomenclatureStructure:structure},{subcategoryId:"bread"}).sectionId,"kitchen");
});
test("F03/F04 actual cashier filter: global case-insensitive query ignores filters and clearing restores context",()=>{
 const source=readFileSync("public/cashier.js","utf8"),start=source.indexOf("  function visibleMenu()"),end=source.indexOf("  function renderMenu()",start);
 const scope={data:{menu:[{name:"QA Вода",salePrice:1,sectionId:"bar",categoryId:"water",subcategoryId:"soda"},{name:"Хлеб".repeat(60),salePrice:1,sectionId:"kitchen",categoryId:"food",subcategoryId:"bread"},{name:"Булочка",salePrice:1,sectionId:"kitchen",categoryId:"food",subcategoryId:"other"}]},department:"kitchen",category:"food",subcategory:"bread",query:"вОдА",departmentKey:(item:{sectionId:string})=>item.sectionId};
 const context=vm.createContext({...scope,$:()=>({value:scope.query})});vm.runInContext(source.slice(start,end),context);
 const result=()=>vm.runInContext("visibleMenu()",context) as {name:string}[];
 assert.deepEqual(Array.from(result(),i=>i.name),["QA Вода"]);scope.query="";assert.equal(result().length,1);assert.equal(result()[0].name,"Хлеб".repeat(60));scope.query="булочка";assert.equal(result()[0].name,"Булочка");
});
const presentation=()=>{const window={} as {bdFormatSalesCost:(batch:unknown,currency:string)=>string};vm.runInNewContext(readFileSync("public/accounting-currency.js","utf8"),{window,Intl});return window.bdFormatSalesCost;};
for(const scenario of ["KNOWN","UNKNOWN","ZERO","NONE","MIXED"] as const)test("F07 real handler SQLite distinguishes "+scenario,async t=>{
 const r=openingRuntime(new URL("../app/api/sales-events/route.ts",import.meta.url));t.after(r.close);const c=salesEventFixture();r.put("bd_assortment_v1",c.assortment);
 if(scenario==="KNOWN"||scenario==="ZERO")r.put("bd_stock_movements",[{id:"receipt",type:"receipt",venueId:1,productKey:"beer-stock",amount:20,unit:"pcs",costAmount:scenario==="KNOWN"?100:0,costStatus:scenario==="KNOWN"?"KNOWN":"KNOWN_ZERO",currency:"MDL",date:"2026-09-01",sourceDocumentId:"receipt",sourceLineId:"receipt-line"}]);
 const send=(body:unknown)=>r.api.POST(new Request("http://test/api/sales-events",{method:"POST",headers:{"Content-Type":"application/json","X-Venue-Id":"1"},body:JSON.stringify({venueId:1,...body as object})}));
 assert.equal((await send({action:"open_shift",shiftId:"night",name:"Night"})).status,201);
 const ids=scenario==="NONE"?["ticket"]:scenario==="MIXED"?["beer","ticket"]:["beer"];
 const command={id:"cost-test",source:"POS_API",shiftId:"night",lines:ids.map((id,i)=>({id:"line"+i,menuItemId:id,quantity:1})),payments:[{id:"pay",method:"CASH",amount:scenario==="NONE"?0:20}]};
 const quote=await (await send({action:"preview",command})).json() as {previewHash:string};
 const result=await send({action:"post",command,previewHash:quote.previewHash});assert.equal(result.status,201);
 const event=(await result.json() as {event:SalesEvent}).event;
 const unknown=scenario==="UNKNOWN"||scenario==="MIXED";
 assert.equal(event.batch.costStatus,scenario==="MIXED"?"PARTIAL":unknown?"UNVALUED":"FULL");
 assert.equal(event.batch.totalTheoreticalCost,scenario==="UNKNOWN"?null:scenario==="KNOWN"?5:0);
 assert.equal(salesBatchKpis([event.batch],1).theoreticalCost,unknown?null:scenario==="KNOWN"?5:0);
 const display=presentation()(event.batch,"MDL");if(unknown)assert.match(display,/не рассчитана/);else assert.doesNotMatch(display,/не рассчитана/);
 const renderer=readFileSync("public/sales-import.js","utf8");const begin=renderer.indexOf("  function renderEventDocument("),end=renderer.indexOf("  function lineState(",begin);
 const body={innerHTML:""},footer={innerHTML:""};const window={} as {bdFormatSalesCost:(batch:unknown,currency:string)=>string;bdFormatAccountingMoney:(value:unknown,currency:string)=>string};
 const ui=vm.createContext({window,Intl,header:()=>{},editorBody:body,editorFooter:footer,h:String,batch:{...event.batch,currency:event.currency,revenue:event.revenue,prices:event.prices,payments:event.payments}});
 vm.runInContext(readFileSync("public/accounting-currency.js","utf8"),ui);ui.money=window.bdFormatAccountingMoney;
 vm.runInContext(readFileSync("public/sales-journal.js","utf8"),ui);
 vm.runInContext("var journal=window.bdSalesJournal;var state={payload:{shifts:[],capabilities:{}}};",ui);
 vm.runInContext(renderer.slice(begin,end)+"\nrenderEventDocument(batch)",ui);
 if(unknown)assert.match(body.innerHTML,/Себестоимость: не рассчитана/);else assert.doesNotMatch(body.innerHTML,/Себестоимость: не рассчитана/);
 assert.equal(event.originalMovements.length,scenario==="NONE"?0:1);
 if(scenario!=="NONE")assert.equal(event.originalMovements[0].costStatus,unknown?"UNKNOWN":scenario==="ZERO"?"KNOWN_ZERO":"KNOWN");
 const read=await r.api.GET(new Request("http://test/api/sales-events",{headers:{"X-Venue-Id":"1"}}));assert.equal((await read.json() as {events:SalesEvent[]}).events[0].batch.costStatus,event.batch.costStatus);
 // Simulate a lost response by using the already committed stable operation again concurrently.
 const before=JSON.stringify(r.get("bd_stock_movements"));const retry=await Promise.all([send({action:"post",command,previewHash:quote.previewHash}),send({action:"post",command,previewHash:quote.previewHash})]);
 for(const response of retry){assert.equal(response.status,200);assert.equal((await response.json() as {duplicate:boolean}).duplicate,true);}
 assert.equal((r.get("bd_sales_events_v1") as unknown[]).length,1);assert.equal(JSON.stringify(r.get("bd_stock_movements")),before);
 const revenue=r.get("bd_finance_revenue") as {revenue:number;receipts:number}[];assert.equal(revenue.length,1);assert.equal(revenue[0].receipts,1);assert.equal(revenue[0].revenue,scenario==="NONE"?0:20);
});

test("F01 server overview uses the same canonical taxonomy in menu cards and section summaries",()=>{
 const source={nomenclatureStructure:structure,menuItems:menu.map(item=>({...item,venueId:1,type:"service",consumptionMode:"NONE",salePrice:10,currency:"MDL",active:true}))};
 const result=buildAssortmentAnalytics({assortment:source,venueId:1});
 assert.deepEqual(result.menuItems.map(row=>row.groupName),["Бар","Кухня","Кальянная"]);
 assert.equal(result.menuItems.find(row=>row.id==="bread")?.subcategory,"Хлеб и выпечка");
});

test("F01 prepared SPA runs the shared canonical hierarchy, including a legacy-only fallback",()=>{
 const source=readFileSync("public/assets/index-BQGspy0I.js","utf8");
 const start=source.indexOf("/* bd-menu-taxonomy-shared-start */"),end=source.indexOf("/* bd-menu-taxonomy-shared-end */",start);
 assert.ok(start>=0&&end>start);
 const functions=source.split("\n").filter(line=>line.startsWith("function bdAssortmentHierarchyV171(")||line.startsWith("function bdLegacyAssortmentHierarchyV171("));
 const context=vm.createContext({window:{},bdCatState:(value:unknown)=>value,bdCatArray:(value:unknown)=>Array.isArray(value)?value:[],bdCatNumber:(value:unknown)=>Number(value)||0,bdAssortmentNodeParentV171:(value:{parentId?:string})=>value.parentId||""});
 vm.runInContext(source.slice(start,end)+functions.join("\n"),context);
 const root={nomenclatureStructure:structure,menuItems:menu};
 context.root=root;context.analytics={menuItems:menu};
 const result=vm.runInContext("bdAssortmentHierarchyV171(analytics,root)",context);
 assert.deepEqual(JSON.parse(JSON.stringify(result)),menuTaxonomyHierarchy(context.analytics,root));
 context.root={groups:[{id:"old-kitchen",name:"Кухня"}],subgroups:[{id:"food",groupId:"old-kitchen",name:"Продукты"},{id:"bread",groupId:"old-kitchen",parentId:"food",name:"Выпечка"}],menuItems:[{id:"legacy",groupId:"old-kitchen",subgroupId:"bread",name:"Хлеб"}]};
 context.analytics={menuItems:context.root.menuItems};
 const legacy=vm.runInContext("bdAssortmentHierarchyV171(analytics,root)",context);
 assert.equal(legacy[0].id,"old-kitchen");assert.equal(legacy[0].roots[0].children[0].items[0].id,"legacy");
});
