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
function render(document){const tree=context.bdProcPurchaseDetailV168({document,analytics:{},expenses:[],movements:[]});const texts=[];function walk(n){if(n==null)return;if(typeof n==='string')texts.push(n);else if(Array.isArray(n))n.forEach(walk);else if(typeof n==='object'){if(n.type==='fact'){walk(n.props.label);walk(n.props.value)}walk(n.props?.children)}}walk(tree);return texts.join('|');}
for(const status of ['draft','confirmed','cancelled']){
 for(const category of ['repairs','marketing','other','equipment'])test(status+' '+category+' has no warehouse warnings',()=>{const text=render({id:'a',status,documentType:'receipt',items:[{category,name:'Fixture',quantity:1,unitPrice:7}]});assert.ok(text.includes('Без складского учёта'));assert.ok(text.includes('Приход не требуется'));assert.ok(!text.includes('Требуется сопоставление'));assert.ok(!text.includes('Связанный приход не найден'));assert.ok(!text.includes('Приход отменён'));});
 test(status+' goods/mixed retain genuine mapping requirement',()=>{for(const items of [[{category:'products'}],[{category:'repairs'},{category:'products'}],[{category:undefined}]]){const text=render({id:'g',status,documentType:'receipt',items});assert.ok(text.includes('Требуется сопоставление'));if(status==='confirmed')assert.ok(text.includes('Связанный приход не найден'));}});
 test(status+' price list has no posting-result section; goods still need matching',()=>{const text=render({id:'p',status,documentType:'price_list',items:[{category:'products'}]});assert.ok(text.includes('Требуется сопоставление'));assert.ok(!text.includes('Результат проведения'));});
}
test('missing legacy category stays conservative; explicit nonstock document with no lines does not invent a receipt',()=>{assert.ok(render({status:'confirmed',items:[]}).includes('Связанный приход не найден'));assert.ok(render({status:'confirmed',expenseCategory:'repairs',items:[]}).includes('Приход не требуется'));});
