import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';
const source=fs.readFileSync('public/assets/index-BQGspy0I.js','utf8');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const extract=name=>{const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert.ok(n,name);return source.slice(n.start,n.end)};
const nodes=[];let currency='MDL';
const jsx=(type,props)=>{const node={type,...props};nodes.push(node);return node};
const ctx=vm.createContext({Un:()=>({profile:{currency}}),i:{jsx,jsxs:jsx,Fragment:'fragment'},S:{useState:v=>[typeof v==='function'?v():v,()=>{}],useMemo:f=>f(),useEffect:()=>{},useRef:()=>({current:null})},W:{div:'div'},bdFieldLabel:'label',bdPayrollDefaultDate:()=> '2026-10-27',bdPayrollDeductionTypes:[],bdPayrollEntryOptions:[],bdPayrollEntryLabels:{},bdPayrollMoney:String,Y_:()=> '2026-10-27',qe:"fragment",ke:"button",noe:[],vt:'icon',Dn:'icon',xi:'icon',Vt:'icon',ze:'button',console});
vm.runInContext(extract('bdFinanceFormCurrency')+';'+extract('bdRecurringSettingsEditor')+';'+extract('bdPayrollEntrySheet')+';'+extract('RAe'),ctx);
for(const [code,label] of [['MDL','MDL'],['PMR_RUB','руб. ПМР'],['RUB','₽'],['EUR','EUR'],['USD','USD'],['UAH','UAH'],['RON','RON'],['','валюта не указана'],[undefined,'валюта не указана']]) {
 test('current profile '+code,()=>{currency=code;nodes.length=0;ctx.bdRecurringSettingsEditor({title:'Налоги',value:{mode:'fixed',amount:15},onChange:()=>{},id:'tax'});assert.ok(nodes.some(n=>n['aria-label']==='Налоги — сумма за месяц, '+label));assert.ok(nodes.some(n=>n.children==='Налоги — сумма за месяц ('+label+')'));nodes.length=0;ctx.bdPayrollEntrySheet({month:'2026-10',employees:[],onClose:()=>{},onSave:()=>{}});const input=nodes.find(n=>n['aria-label']==='Сумма зарплатной операции, '+label);assert.ok(input);assert.equal(input.value,'');assert.ok(nodes.some(n=>n.children==='Сумма ('+label+')'));nodes.length=0;ctx.RAe({areas:[],equipment:[],onClose:()=>{},onSave:()=>{}});assert.ok(nodes.some(n=>n['aria-label']==='Сумма расхода, '+label));});
}
test('percentage remains percentage and profile change is immediate',()=>{currency='MDL';nodes.length=0;ctx.bdRecurringSettingsEditor({title:'Налоги',value:{mode:'percent',percent:5},onChange:()=>{},id:'tax'});assert.ok(nodes.some(n=>n['aria-label']==='Налоги — процент от выручки'));currency='EUR';assert.equal(ctx.bdFinanceFormCurrency(currency),'EUR');});
test('expense and salary save calculations unchanged; labels all profile based',()=>{for(const name of ['bdPayrollEntrySheet','bdRecurringSettingsEditor','RAe']){const s=extract(name);assert.ok(s.includes('Un()'));assert.ok(s.includes('bdFormCurrencyLabel'));assert.ok(!s.includes('₽'));}assert.match(extract('bdPayrollEntrySheet'),/amount:Number\(g\)/);});

test('only labels and reactive profile hook change in all three forms',()=>{
const old=execFileSync('git',['show','bb380008b4f2ad8895abd08b2fd236f1abfb8442:public/assets/index-BQGspy0I.js'],{maxBuffer:30*1024*1024}).toString();const tree=parse(old,{ecmaVersion:'latest',sourceType:'module'});
for(const name of ['bdPayrollEntrySheet','bdRecurringSettingsEditor','RAe']){const n=tree.body.find(n=>n.id?.name===name);let prior=old.slice(n.start,n.end);prior=prior.replace('}){const','}){const {profile:bdFormProfile}=Un(),bdFormCurrencyLabel=bdFinanceFormCurrency(bdFormProfile?.currency);const').replace('e+" — сумма за месяц (₽)"','e+" — сумма за месяц ("+bdFormCurrencyLabel+")"').replace('e+" — сумма за месяц, ₽"','e+" — сумма за месяц, "+bdFormCurrencyLabel').replace('children:"Сумма (₽)"','children:"Сумма ("+bdFormCurrencyLabel+")"').replace('children:"Сумма (₽) *"','children:"Сумма ("+bdFormCurrencyLabel+") *"').replace('"aria-label":"Сумма зарплатной операции, ₽"','"aria-label":"Сумма зарплатной операции, "+bdFormCurrencyLabel').replace('"aria-label":"Сумма расхода, ₽"','"aria-label":"Сумма расхода, "+bdFormCurrencyLabel');assert.equal(extract(name),prior);}
});

test('expense blank amount uses current currency without changing value',()=>{currency='MDL';nodes.length=0;ctx.RAe({areas:[],equipment:[],onClose:()=>{},onSave:()=>{}});const input=nodes.find(n=>n['aria-label']==='Сумма расхода, MDL');assert.ok(input);assert.equal(input.value,'');});
