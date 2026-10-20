import fs from 'node:fs';
const file=new URL('../public/assets/index-BQGspy0I.js',import.meta.url);
let s=fs.readFileSync(file,'utf8');
const before='i.jsx(bdHomeMoneyCard,{report:j,previousReport:v,onNavigate:g})';
const after='i.jsx(bdHomeCurrentFinanceV556,{profile:e,settings:u,onNavigate:g,revision:JSON.stringify([t,n,d,u,r])})';
if(process.argv.includes('--restore')){fs.writeFileSync(file,s.replace(after,before));process.exit(0);}
if(!s.includes(after)){if(s.split(before).length!==2)throw Error('Unique Home finance anchor required');s=s.replace(before,after);}
fs.writeFileSync(file,s);
