import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { parse } from 'acorn';

const text=readFileSync('public/cashier.js','utf8');
const body=(parse(text,{ecmaVersion:'latest'}) as unknown as {body:{expression:{callee:{body:{body:{type:string;id?:{name:string};start:number;end:number}[]}}}}[]}).body[0].expression.callee.body.body;
const fn=(name:string)=>{const node=body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name===name)!;return text.slice(node.start,node.end);};
for(const pending of [false,true]) test(`successful read clears only transient connection notice; pending=${pending}`,()=>{
 const nodes:Record<string,{textContent?:string}>={connection:{},notice:{}};
 const state={frozen:false,data:{},pending:pending?{id:'pay'}:null,legacy:null,noticeKind:null as string|null,stale:false};
 const context=vm.createContext({state,Date,loadGeneration:4,identity:()=>"session",initialIdentity:"session",selectedVenue:()=>1,initialVenue:1,clearSensitive:()=>assert.fail("unchanged identity rejected"),$:(id:string)=>nodes[id],notice:(message:string,kind='operation')=>{state.noticeKind=kind;nodes.notice.textContent=message;},render:()=>{},syncQuickShift:()=>{},setReport:()=>{},reconcileAccess:()=>{}});
 vm.runInContext(fn('accept')+'\n'+fn('errorView'),context);
 context.errorView({network:true,message:'Нет связи. Запрос сохранён'});assert.equal(state.stale,true);
 context.accept({generation:4,data:{},orders:[],overview:null});assert.equal(state.stale,false);assert.equal(nodes.connection.textContent,'На связи');
 assert.equal(nodes.notice.textContent,pending?'Нет связи. Запрос сохранён':'');assert.equal(Boolean(state.pending),pending);
});
test('success cannot erase an operation error or overwrite frozen identity state',()=>{
 const nodes:Record<string,{textContent?:string}>={connection:{},notice:{textContent:'Операция не подтверждена'}};
 const state={frozen:false,data:{},noticeKind:'operation'};
 const context=vm.createContext({state,Date,loadGeneration:4,identity:()=>"session",initialIdentity:"session",selectedVenue:()=>1,initialVenue:1,clearSensitive:()=>assert.fail("unchanged identity rejected"),$:(id:string)=>nodes[id],notice:()=>assert.fail('operation notice cleared'),render:()=>{},syncQuickShift:()=>{},setReport:()=>{},reconcileAccess:()=>{}});
 vm.runInContext(fn('accept'),context);context.accept({generation:4,data:{},orders:[],overview:null});assert.equal(nodes.notice.textContent,'Операция не подтверждена');
 state.frozen=true;context.accept({generation:4,data:{secret:'late'}});assert.deepEqual(state.data,{});
});
test('team permission revocation removes management data from every cached view',()=>{
 let removed=0;
 const state={data:{permissions:{managementDay:false}},workday:{payroll:70},rules:[]};
 const context=vm.createContext({state,document:{querySelectorAll:()=>[{remove:()=>removed++},{remove:()=>removed++}]},senior:()=>true,configure:()=>true});
 vm.runInContext(fn('reconcileAccess'),context);context.reconcileAccess();assert.equal(state.workday,null);assert.equal(removed,2);
});
test('late refresh cannot replace the current order data or render',()=>{
 const current={venueId:1};const state={frozen:false,data:current};
 const context=vm.createContext({state,loadGeneration:5,render:()=>assert.fail('late response rendered')});
 vm.runInContext(fn('accept'),context);assert.equal(context.accept({generation:4,data:{venueId:2},orders:[]}),false);assert.equal(state.data,current);
});
