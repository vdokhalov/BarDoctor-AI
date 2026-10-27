import fs from 'node:fs';import {parse} from 'acorn';import {transformSync} from 'esbuild';
const path='public/assets/index-BQGspy0I.js';let s=fs.readFileSync(path,'utf8');
function replace(name,fn){const n=parse(s,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);if(!n)throw Error('Missing '+name);s=s.slice(0,n.start)+fn(s.slice(n.start,n.end))+s.slice(n.end)}
const helper=transformSync(fs.readFileSync('lib/bardoctor/finance-form-currency.ts','utf8').replace('export function','function'),{loader:'ts'}).code.trim();
if(s.includes('function bdFinanceFormCurrency('))replace('bdFinanceFormCurrency',()=>helper);else s=helper+'\n'+s;
for(const name of ['bdRecurringSettingsEditor','bdPayrollEntrySheet','RAe'])replace(name,t=>{
 if(t.includes('bdFormCurrencyLabel'))return t;
 t=t.replace('}){const','}){const {profile:bdFormProfile}=Un(),bdFormCurrencyLabel=bdFinanceFormCurrency(bdFormProfile?.currency);const');
 t=t.replace('e+" — сумма за месяц (₽)"','e+" — сумма за месяц ("+bdFormCurrencyLabel+")"').replace('e+" — сумма за месяц, ₽"','e+" — сумма за месяц, "+bdFormCurrencyLabel');
 t=t.replace('children:"Сумма (₽)"','children:"Сумма ("+bdFormCurrencyLabel+")"').replace('children:"Сумма (₽) *"','children:"Сумма ("+bdFormCurrencyLabel+") *"');
 t=t.replace('"aria-label":"Сумма зарплатной операции, ₽"','"aria-label":"Сумма зарплатной операции, "+bdFormCurrencyLabel').replace('"aria-label":"Сумма расхода, ₽"','"aria-label":"Сумма расхода, "+bdFormCurrencyLabel');
 if(t.includes('₽'))throw Error('Unpatched currency in '+name);return t;
});
parse(s,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path,s);console.log('Finance forms use current venue currency in visible and accessible labels');
