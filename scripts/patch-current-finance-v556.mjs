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
if(process.argv.includes('--restore')){fs.writeFileSync(file,s.replace(after,before));process.exit(0);}
if(s.split(anchor).length!==2)throw Error('Unique Finance current result anchor required');
s=s.replace(anchor,start+'\n'+fs.readFileSync(new URL('./fragments/finance-current-result.fragment.txt',import.meta.url),'utf8')+end+'\n'+patched);
if(!s.includes(after)){if(s.split(before).length!==2)throw Error('Unique Home finance anchor required');s=s.replace(before,after);}
fs.writeFileSync(file,s);
