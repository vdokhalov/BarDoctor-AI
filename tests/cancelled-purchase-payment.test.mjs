import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
const source=fs.readFileSync(new URL('../public/assets/index-BQGspy0I.js',import.meta.url),'utf8');
const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='bdProcPurchaseDetailV168');
const code=source.slice(node.start,node.end);
const context={Array,String,Math,Number,Set,S:{useState:()=>[100,()=>{}],useEffect:()=>{}},i:{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'fragment'},Fn:'icon',Br:'icon',aQ:'icon'};
for(const name of new Set(code.match(/\bbd\w+/g)))if(name!=='bdProcPurchaseDetailV168')context[name]=()=>'';
Object.assign(context,{bdProcSheetV168:'sheet',bdProcFactV168:'fact',bdProcBadgeV168:'badge',bdProcNumberV168:(v,f=0)=>Number.isFinite(Number(v))?Number(v):f,bdProcTextV168:v=>String(v??''),bdProcPluralV168:()=>'',bdProcEffectiveStateV168:e=>e.status,bdProcOriginalV168:()=>null,bdProcPurchasePaymentV188:()=>({paidAmount:0,balanceDue:7,paymentStatus:'unpaid'}),bdProcMoneyV168:v=>String(v),bdProcActivePaymentV186:()=>false});
vm.createContext(context);vm.runInContext(code,context);
for(const name of ['bdProcActivePaymentV186','bdProcPurchasePaymentV188','bdProcPaymentStatusLabelV186']){const fn=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);vm.runInContext(source.slice(fn.start,fn.end),context);}

function render(document,expenses=[]){const tree=context.bdProcPurchaseDetailV168({document,analytics:{},expenses,movements:[],canPay:true,onPay:()=>{},canFinance:true,onReversePayment:()=>{}});const texts=[];function walk(n){if(n==null)return;if(typeof n==='string')texts.push(n);else if(Array.isArray(n))n.forEach(walk);else if(typeof n==='object'){if(n.type==='fact'){walk(n.props.label);walk(n.props.value)}walk(n.props?.children);walk(n.props?.footer)}}walk(tree);return texts.join('|');}

const doc={id:'service',status:'cancelled',documentType:'invoice',total:7,paidAmount:0,currency:'MDL',items:[{category:'repairs',lineTotal:7}]};
const payment={id:'payment',sourceDocumentId:'service',source:'purchase_payment',amount:7,currency:'MDL',status:'posted'};
for(const [name,expenses,total]of [['none',[],0],['voided',[{...payment,status:'voided'}],0],['reversed',[{...payment,reversedAt:'2026-10-25'}],0],['active',[payment],7],['mixed',[payment,{...payment,id:'old',status:'voided'}],7]])test('cancelled '+name+' never claims payable debt; history preserved',()=>{
 const input={...doc,paidAmount:7};const before=JSON.stringify([input,expenses]);const text=render(input,expenses);
 assert.ok(text.includes('Документ отменён'));assert.ok(text.includes('К оплате|Не требуется'));assert.ok(text.includes('Платежи без сторно|'+(name==='none'?'Нет записей':total)));assert.ok(!text.includes('Осталось'));assert.ok(!text.includes('Не оплачено'));assert.ok(!text.includes('Оплатить'));
 if(total)assert.ok(text.includes('Есть платежи без сторно. Нужна сверка.'));else assert.ok(!text.includes('Нужна сверка.'));
 if(name==='voided'||name==='reversed'||name==='mixed')assert.ok(text.includes('Сторнирован'));
 assert.equal(JSON.stringify([input,expenses]),before);
});
for(const amount of [0,3,7,9])test('active payment amount '+amount+' retains existing balance and actions',()=>{
 const text=render({...doc,status:'confirmed'},amount?[{...payment,amount}]:[]);assert.ok(text.includes('Осталось|'+Math.max(0,7-amount)));assert.ok(text.includes('Оплачено|'+amount));assert.ok(!text.includes('Не требуется|'));
 assert.equal(text.includes('Оплатить'),amount<7);
});
