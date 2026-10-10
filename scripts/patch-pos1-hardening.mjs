import fs from 'node:fs';
import { parse } from 'acorn';
const path='public/assets/index-BQGspy0I.js';
let source=fs.readFileSync(path,'utf8');
source=source.replace('if(h.pathname==="/sales-entry"){','if(["/sales-entry","/cashier"].includes(h.pathname)){');
const shared='/* bd-shared-accounting-money-start */\n'+fs.readFileSync('public/accounting-currency.js','utf8')+'/* bd-shared-accounting-money-end */\n';
source=source.replace(/\/\* bd-shared-accounting-money-start \*\/[\s\S]*?\/\* bd-shared-accounting-money-end \*\/\n?/,'');
source=source.replace('function bdAccountingMoneyV243(',shared+'function bdAccountingMoneyV243(');
const start=source.indexOf('function bdAccountingMoneyV243('),end=source.indexOf('\n',start);
if(start<0||end<0)throw Error('Accounting formatter anchor missing');
source=source.slice(0,start)+'function bdAccountingMoneyV243(e,t){return window.bdFormatAccountingMoney(e,bdAccountingCurrencyV243(t)||bdCurrentAccountingCurrencyV243())}'+source.slice(end);
source=source.replace('function bdWarehouseMoney(e,t="MDL"){return bdWarehouseDecimal(e,2)+" "+String(t||"MDL").toUpperCase()}','function bdWarehouseMoney(e,t){return bdAccountingMoneyV243(e,t)}');
source=source.replaceAll('bdWarehouseMoney(e.inventoryValue,e.currency||"MDL")','bdWarehouseMoney(e.inventoryValue,e.currency||bdCurrentAccountingCurrencyV243())');
source=source.replaceAll('bdWarehouseMoney(B.costAmount,B.currency||"MDL")','bdWarehouseMoney(B.costAmount,B.currency||bdCurrentAccountingCurrencyV243())');
source=source.replaceAll('bdWarehouseMoney(e.inventoryValue,e.currency||bdCurrentAccountingCurrencyV243())','bdWarehouseMoney(e.inventoryValue,e.currency)');
source=source.replaceAll('bdWarehouseMoney(B.costAmount,B.currency||bdCurrentAccountingCurrencyV243())','bdWarehouseMoney(B.costAmount,B.currency)');
if(!source.includes('["/sales-entry","/cashier"].includes(h.pathname)'))throw Error('Cashier navigation bridge missing');
// Discoverability is separate from the existing POS route and its server RBAC.
const entryHelpers = `function bdCashierEntryHref(){const venue=localStorage.getItem("bd_active_venue_id");return "/cashier"+(venue?"?venue="+encodeURIComponent(venue):"")}
function bdCashierEntry({onNavigate}){return typeof window.bdHasClientPermission==="function"&&window.bdHasClientPermission("sales.view")?i.jsx("button",{type:"button",className:"bd-more-quick-v166","data-bd-cashier-entry":true,onClick:()=>onNavigate(bdCashierEntryHref()),children:"Касса · столы, заказы и оплата"}):null}
`;
for(const name of ['bdCashierEntryHref','bdCashierEntry']) {
 const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(node=>node.type==='FunctionDeclaration'&&node.id?.name===name);
 if(node)source=source.slice(0,node.start)+source.slice(node.end);
}
source=entryHelpers+source;
function addEntry(name,anchor,entry){
 const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(node=>node.type==='FunctionDeclaration'&&node.id?.name===name);
 if(!node)throw Error('Cashier entry target missing: '+name);
 let code=source.slice(node.start,node.end);
 if(!code.includes(entry)){if(!code.includes(anchor))throw Error('Cashier entry anchor missing: '+name);code=code.replace(anchor,entry+anchor);}
 source=source.slice(0,node.start)+code+source.slice(node.end);
}
addEntry('Dce','i.jsx(bdHomeDaily,','i.jsx(bdCashierEntry,{onNavigate:a}),');
addEntry('bdShiftsPage','i.jsxs("div",{className:"bd-shifts-layout"','i.jsx(bdCashierEntry,{onNavigate:navigate}),');
fs.writeFileSync(path,source);
console.log('POS-1 navigation and shared money presentation applied');
