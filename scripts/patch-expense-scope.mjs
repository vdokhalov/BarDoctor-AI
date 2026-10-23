import fs from 'node:fs';
const file=new URL('../public/assets/index-BQGspy0I.js',import.meta.url);
let source=fs.readFileSync(file,'utf8');
const restoring=process.argv.includes('--restore');
const start='/* expense-scope:start */',end='/* expense-scope:end */';
if(source.includes(start))source=source.slice(0,source.indexOf(start))+source.slice(source.indexOf(end)+end.length);
if(!restoring)source=source.replace('function bdFinanceDetailV160(',start+'\n'+fs.readFileSync(new URL('./fragments/expense-scope.fragment.txt',import.meta.url),'utf8')+'\n'+end+'\nfunction bdFinanceDetailV160(');
function replace(a,b){if(restoring){if(source.includes(b))source=source.replace(b,a);return;}if(source.includes(b))return;if(!source.includes(a))throw Error('Expense scope anchor absent: '+a.slice(0,90));source=source.replace(a,b);}
replace('onDelete:g,onClose:y})','onDelete:g,onClose:y,report:expenseReport})');
replace('mode:recordMode,setMode:e=>','report:monthlyReport,mode:recordMode,setMode:e=>');
replace('}):i.jsx(am,{title:"Расходы",data:n.expenses,color:"#DC2626"})}),i.jsx("div",{className:"bd-finance-detail-records"','}):null}),i.jsx("div",{className:"bd-finance-detail-records"');
replace('i.jsx(bdFinanceExpenseRecordsV160,{records:a,equipment:f,documents:m,canManage:u,onView:h,onDelete:g})','i.jsx(bdFinanceScopedExpenseRecords,{records:a,equipment:f,documents:m,canManage:u,onView:h,onDelete:g,report:expenseReport})');
replace('e?.source==="purchase_document"?"Закупочный документ":"Вручную"','bdExpenseSourceLabel(e)');
replace('expenses.filter(e=>e.date.slice(0,7)===monthKey&&e?.status!=="voided"&&!e?.reversedAt)','expenses.filter(e=>typeof e?.date==="string"&&e.date.slice(0,7)===monthKey&&bdExpenseScope(e)!==null)');
replace('key:"expenses",title:"Расходы",value:t?bdMoney2(e.periodExpenses)','key:"expenses",title:"Оплаты и прочие расходы",value:t?bdMoney2(e.periodExpenses)');
fs.writeFileSync(file,source);
console.log('Expense scope presentation applied');
