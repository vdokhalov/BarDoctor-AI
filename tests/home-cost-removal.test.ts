import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';
import {p0Amendment,p0Baseline} from './helpers/p0-release-amendment.mjs';
const current=readFileSync('public/assets/index-BQGspy0I.js','utf8');
function previous(commit:string){return execFileSync('git',['show',commit+':public/assets/index-BQGspy0I.js'],{encoding:'utf8',maxBuffer:64*1024*1024});}
function home(source:string){const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name==='bdHomeDaily');assert.ok(node);return source.slice(node.start,node.end);}
test('Home retains the released v517 cost removal and operational-day behavior',()=>{
 assert.equal(home(current),home(previous(p0Baseline)));
 assert.doesNotMatch(home(current),/i\.jsx\(bdCostHomePhase4a,/);
 assert.match(home(current),/operationalDays:bdHomeDays/);
});

test('current client is exactly the reviewed P0 amendment over v517',()=>{ assert.ok(p0Amendment()); });

test('recorded payroll adapter stays byte-identical to the verified owner-QA implementation',()=>{
 function adapter(source:string){const nodes=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.filter(node=>node.type==='ExpressionStatement'&&node.expression.type==='AssignmentExpression'&&node.expression.left.type==='Identifier'&&node.expression.left.name==='bdPayrollMonthAudits');assert.equal(nodes.length,1);return source.slice(nodes[0].start,nodes[0].end);}
 assert.equal(adapter(current),adapter(previous('27a223e7db9988d6cee394b73ac07bb9442067c7')));
});
