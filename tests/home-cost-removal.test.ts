import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';
import {restoreBusinessDateBaseline} from './helpers/business-dates-guard.mjs';
const current=restoreBusinessDateBaseline(readFileSync('public/assets/index-BQGspy0I.js','utf8'));
function previous(commit:string){return execFileSync('git',['show',commit+':public/assets/index-BQGspy0I.js'],{encoding:'utf8',maxBuffer:64*1024*1024});}
function home(source:string){const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name==='bdHomeDaily');assert.ok(node);return source.slice(node.start,node.end);}
test('Home retains exactly the v503 removal of the v502 cost component mount',()=>{
 const before=home(previous('772ceee943028b9982b53c957b6472d09cd180e4'));
 const mount='i.jsx(bdCostHomePhase4a,{onNavigate:g}),';assert.equal(before.split(mount).length,2);assert.equal(home(current),before.replace(mount,''));
});
test('owner QA fixes change only five writeoff/equipment functions and the recorded payroll adapter; all other client code stays v503',()=>{
 const allowed=new Set(['bdWriteoffDefaultUnitV271','bdWriteoffDisplayQuantityV271','bdWriteoffBaseV271','bdWriteoffLineV271','bdEquipmentWorkOrderEditorV167']);
 function outside(source:string){let count=0;for(const node of parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.reverse()){
  if(node.type==='FunctionDeclaration'&&allowed.has(node.id?.name??'')||node.type==='ExpressionStatement'&&node.expression.type==='AssignmentExpression'&&node.expression.left.type==='Identifier'&&node.expression.left.name==='bdPayrollMonthAudits'){
   source=source.slice(0,node.start)+'/* scoped owner QA repair */'+source.slice(node.end);count++;
  }
 }assert.equal(count,6);return source;}
 assert.equal(outside(current),outside(previous('fa836b711941c39984c40a40e3b9b45e88265014')));
});

test('recorded payroll adapter stays byte-identical to the verified owner-QA implementation',()=>{
 function adapter(source:string){const nodes=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.filter(node=>node.type==='ExpressionStatement'&&node.expression.type==='AssignmentExpression'&&node.expression.left.type==='Identifier'&&node.expression.left.name==='bdPayrollMonthAudits');assert.equal(nodes.length,1);return source.slice(nodes[0].start,nodes[0].end);}
 assert.equal(adapter(current),adapter(previous('27a223e7db9988d6cee394b73ac07bb9442067c7')));
});
