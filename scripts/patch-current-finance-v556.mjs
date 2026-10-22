import fs from 'node:fs';
const file=new URL('../public/assets/index-BQGspy0I.js',import.meta.url);
let s=fs.readFileSync(file,'utf8');
const before='i.jsx(bdHomeMoneyCard,{report:j,previousReport:v,onNavigate:g})';
const after='i.jsx(bdHomeCurrentFinanceV556,{profile:e,settings:u,onNavigate:g,revision:JSON.stringify([t,n,d,u,r])})';
const start='/* finance-current-result-v573:start */',end='/* finance-current-result-v573:end */';
const anchor='function bdFinanceMonthResultV160({report:e,hasData:t,onContinue:n}){';
const patched=anchor+'if(e?.currentFinance)return bdFinanceCurrentResultV573({report:e,onContinue:n});';
const from=s.indexOf(start);
if(from>=0){const to=s.indexOf(end,from);if(to<from)throw Error('Finance current result boundary missing');s=s.slice(0,from)+s.slice(to+end.length).replace(/^\n/,'');}
s=s.replace(patched,anchor);
const documentLinks=[
 ['function k(){window.bdNavigateBack(bdWarehouseNavigationUrlV247({writeoff:null,tab:"writeoffs"}))}', 'function k(){const back=bdFinanceDocumentReturnUrl();if(back){window.location.assign(back);return;}window.bdNavigateBack(bdWarehouseNavigationUrlV247({writeoff:null,tab:"writeoffs"}))}'],
 ['function close(){if(dirty&&!busy&&!window.confirm("Есть несохранённые значения. Закрыть без сохранения?"))return;a()}', 'function close(){if(dirty&&!busy&&!window.confirm("Есть несохранённые значения. Закрыть без сохранения?"))return;const back=bdFinanceDocumentReturnUrl();if(back){window.location.assign(back);return;}a()}'],
 ['i.jsx(bdAccountingHeader, { title: "Месячный отчёт"', 'report&&i.jsx(BdFinanceDocuments,{report}),i.jsx(bdAccountingHeader, { title: "Месячный отчёт"'],
 ['value: bdMoney2(report.writeoffs)','value: i.jsx(BdFinanceDocumentAmount,{report,kind:"writeoffs",children:bdMoney2(report.writeoffs)})'],
 ['value: report.inventoryLoss == null ? "Пока недоступна" : bdMoney2(report.inventoryLoss)','value: i.jsx(BdFinanceDocumentAmount,{report,kind:"stock",children:report.inventoryLoss == null ? "Пока недоступна" : bdMoney2(report.inventoryLoss)})'],
 ['children: entry.amount === null ? "—" : bdMoney2(entry.amount)','children: entry.key === "inventory" && entry.amount !== null ? i.jsx(BdFinanceDocumentAmount,{report,kind:"stock",children:bdMoney2(entry.amount)}) : entry.amount === null ? "—" : bdMoney2(entry.amount)'],
];
for(const [original,linked] of documentLinks)s=s.replaceAll(linked,original);
if(process.argv.includes('--restore')){
 s=s.replace('children:[i.jsx(BdFinanceDocumentReturn,{}),bdManagementStockContextPhase4b.banner','children:[bdManagementStockContextPhase4b.banner');
 s=s.replace('function bdFinanceQuickActionsV160({navigate:e,onCloseMonth:t,monthKey,currentFinance=false}){','function bdFinanceQuickActionsV160({navigate:e,onCloseMonth:t,monthKey}){');
 s=s.replace('children:n.filter(row=>!currentFinance||row.key!=="close").map(r=>','children:n.map(r=>');
 s=s.replace('i.jsx(bdFinanceQuickActionsV160,{navigate,monthKey,currentFinance:monthlyReport?.currentFinance,onCloseMonth:','i.jsx(bdFinanceQuickActionsV160,{navigate,monthKey,onCloseMonth:');
 s=s.replace('monthlyReport?.currentFinance&&i.jsx("h1",{className:"bd-finance-current-title",children:"Финансы"}),','');
 const original='monthlyReport&&i.jsx(bdFinanceReadinessV160,{report:monthlyReport,coverage,missingDates,onMissing:missingDates.length?()=>setGapDate(missingDates[0].date):null,onInventory:()=>navigate("/warehouse?add=inventory"),onContinue:bdFinanceOpenMonthCloseV160,onReport:()=>navigate("/reports?month="+encodeURIComponent(monthKey))})';
 s=s.replace('monthlyReport?.currentFinance?i.jsxs("details",{className:"bd-finance-month-review",children:[i.jsx("summary",{children:"Полнота месяца"}),'+original+']}):'+original,original);
 s=s.replace('if(verified.report?.currentFinance&&!verified.error)return null;','');
 for(const name of ['bdFinanceKpisV160','bdFinanceSummaryV160'])s=s.replace(new RegExp('(function '+name+'\\(\\{report:([a-zA-Z]+)[^]*?\\)\\{)if\\(\\2\\?\\.currentFinance\\)return null;'),'$1');
 fs.writeFileSync(file,s.replace(after,before));process.exit(0);
}
for(const [original,linked] of documentLinks)s=s.replaceAll(original,linked);
s=s.replace('children:[bdManagementStockContextPhase4b.banner','children:[i.jsx(BdFinanceDocumentReturn,{}),bdManagementStockContextPhase4b.banner');
if(s.split(anchor).length!==2)throw Error('Unique Finance current result anchor required');
s=s.replace(anchor,start+'\n'+fs.readFileSync(new URL('./fragments/finance-documents.fragment.txt',import.meta.url),'utf8')+'\n'+fs.readFileSync(new URL('./fragments/finance-current-result.fragment.txt',import.meta.url),'utf8')+end+'\n'+patched);
if(!s.includes(after)){if(s.split(before).length!==2)throw Error('Unique Home finance anchor required');s=s.replace(before,after);}
// Current-month summary owns current uncertainty. Keep closure checks secondary.
const currentStatus='function bdFinanceCanonicalStatusV515({verified,monthKey,venueId}){';
s=s.replace(currentStatus+'if(verified.report?.currentFinance&&!verified.error)return null;',currentStatus);
if(s.includes(currentStatus))s=s.replace(currentStatus,currentStatus+'if(verified.report?.currentFinance&&!verified.error)return null;');
for(const name of ['bdFinanceKpisV160','bdFinanceSummaryV160']){
 const re=new RegExp('(function '+name+'\\(\\{report:([a-zA-Z]+)[^]*?\\)\\{)');
 const match=s.match(re);if(match){const guard='if('+match[2]+'?.currentFinance)return null;';s=s.replace(match[1]+guard,match[1]);s=s.replace(match[1],match[1]+guard);}
}
const ready='monthlyReport&&i.jsx(bdFinanceReadinessV160,{report:monthlyReport,coverage,missingDates,onMissing:missingDates.length?()=>setGapDate(missingDates[0].date):null,onInventory:()=>navigate("/warehouse?add=inventory"),onContinue:bdFinanceOpenMonthCloseV160,onReport:()=>navigate("/reports?month="+encodeURIComponent(monthKey))})';
const wrapped='monthlyReport?.currentFinance?i.jsxs("details",{className:"bd-finance-month-review",children:[i.jsx("summary",{children:"Полнота месяца"}),'+ready+']}):'+ready;
if(!s.includes(wrapped)){if(!s.includes(ready))throw Error('Finance readiness anchor missing');s=s.replace(ready,wrapped);}
const quick='function bdFinanceQuickActionsV160({navigate:e,onCloseMonth:t,monthKey}){';
const quickNew='function bdFinanceQuickActionsV160({navigate:e,onCloseMonth:t,monthKey,currentFinance=false}){';
s=s.replace(quick,quickNew);
const quickStart=s.indexOf(quickNew),quickEnd=s.indexOf('\nfunction ',quickStart+quickNew.length);
if(quickStart<0||quickEnd<0)throw Error('Quick actions anchor missing');
let quickBody=s.slice(quickStart,quickEnd);quickBody=quickBody.replace('children:n.map(r=>','children:n.filter(row=>!currentFinance||row.key!=="close").map(r=>');s=s.slice(0,quickStart)+quickBody+s.slice(quickEnd);
s=s.replace('i.jsx(bdFinanceQuickActionsV160,{navigate,monthKey,onCloseMonth:','i.jsx(bdFinanceQuickActionsV160,{navigate,monthKey,currentFinance:monthlyReport?.currentFinance,onCloseMonth:');
const monthNav='i.jsxs("nav",{className:"bd-finance-month-v160"';
const title='monthlyReport?.currentFinance&&i.jsx("h1",{className:"bd-finance-current-title",children:"Финансы"}),';
if(!s.includes(title+monthNav)){if(!s.includes(monthNav))throw Error('Month navigation anchor missing');s=s.replace(monthNav,title+monthNav);}
fs.writeFileSync(file,s);
