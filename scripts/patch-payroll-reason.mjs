import fs from 'node:fs';const path='public/assets/index-BQGspy0I.js';let s=fs.readFileSync(path,'utf8');const restore=process.argv.includes('--restore');
function change(a,b){const x=restore?b:a,y=restore?a:b;if(s.includes(x))s=s.replace(x,y);else if(!restore&&!s.includes(y))throw Error('Missing payroll explanation anchor: '+x.slice(0,90));}
change('function bdPayrollSummaryCardV164({totals:e,month:t,onRules:n,unallocated:o=0})','function bdPayrollSummaryCardV164({totals:e,month:t,onRules:n,unallocated:o=0,report:problemReport})');
change('value:e.gross==null?"Неизвестно":Mn(e.gross)','value:e.gross==null?"—":Mn(e.gross)');
change('value:e.balance==null?"Неизвестно":r?"Закрыто":Mn(e.balance),detail:e.balance==null?"ФОТ требует данных"','value:e.balance==null?"—":r?"Закрыто":Mn(e.balance),detail:e.balance==null?""');
change('o>.005&&i.jsxs("button",{type:"button",className:"bd-payroll-unallocated-v164"','i.jsx(bdPayrollProblemView,{report:problemReport,month:t}),o>.005&&i.jsxs("button",{type:"button",className:"bd-payroll-unallocated-v164"');
change('totals:N,month:m,unallocated:bdSalaryUnallocated,onRules:','totals:N,month:m,unallocated:bdSalaryUnallocated,report:bdSalaryReport,onRules:');
const start='/* payroll-reason:start */',end='/* payroll-reason:end */';if(s.includes(start))s=s.slice(0,s.indexOf(start))+s.slice(s.indexOf(end)+end.length);if(!restore)s=s.replace('function bdSalariesPage(){',start+fs.readFileSync('scripts/fragments/payroll-reason.fragment.txt','utf8')+end+'function bdSalariesPage(){');fs.writeFileSync(path,s);
