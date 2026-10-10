import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';

const source=fs.readFileSync('public/assets/index-BQGspy0I.js','utf8');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const fn=name=>{const node=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name===name);assert.ok(node,name);return source.slice(node.start,node.end);};
for(const role of ['owner','manager','shift_manager','cashier']) test(`${role}: direct cashier entry uses current venue without a management destination`,()=>{
 const paths=[];let venue='3389',allowed=true;
 const context=vm.createContext({window:{bdHasClientPermission:key=>allowed&&key==='sales.view'},localStorage:{getItem:()=>venue},encodeURIComponent,i:{jsx:(type,props)=>({type,props})}});
 vm.runInContext(fn('bdCashierEntryHref')+'\n'+fn('bdCashierEntry'),context);
 const button=context.bdCashierEntry({onNavigate:path=>paths.push(path)});
 assert.equal(button.type,'button');assert.match(button.props.children,/Касса/);button.props.onClick();
 venue='3390';button.props.onClick();assert.deepEqual(paths,['/cashier?venue=3389','/cashier?venue=3390']);
 allowed=false;assert.equal(context.bdCashierEntry({onNavigate:()=>assert.fail('denied')}),null);
});
test('home, shifts and More expose cashier; warehouse journal stays registered',()=>{
 assert.match(fn('Dce'),/bdCashierEntry,\{onNavigate:a\}/);
 assert.match(fn('bdShiftsPage'),/bdCashierEntry,\{onNavigate:navigate\}/);
 assert.match(fn('t_e'),/bdMoreHasPermissionV166\("sales.view"\)&&\{key:"cashier"/);
 assert.match(fn('t_e'),/onClick:\(\)=>e\(bdCashierEntryHref\(\)\)/);
 assert.ok(source.includes('path:"/sales-import"'));
});
