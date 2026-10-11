import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {parse} from 'acorn';
const source=readFileSync('public/cashier.js','utf8');
type AstNode={type:string;start:number;end:number;id?:{name:string};init?:{start:number;end:number};declarations?:AstNode[]};
const nodes=(parse(source,{ecmaVersion:'latest'}) as unknown as {body:{expression:{callee:{body:{body:AstNode[]}}}}[]}).body[0].expression.callee.body.body;
function fn(name:string){const node=nodes.find((n)=>n.type==='FunctionDeclaration'&&n.id?.name===name);assert(node);return source.slice(node.start,node.end);}
function variable(name:string){const node=nodes.flatMap((n)=>n.type==='VariableDeclaration'?n.declarations||[]:[]).find((n)=>n.id?.name===name);assert(node?.init);return 'const '+name+'='+source.slice(node.init.start,node.init.end)+';';}
for(const status of ['CANCELLED','PAID'])test(`terminal ${status} order cannot remain selected or claim to be Open`,()=>{
 const quick={id:'local-quick',lines:[{quantity:3}]};const state:Record<string,unknown>={data:{},quick,orderId:'table',orders:[{id:'table',status:'OPEN'}],frozen:false};
 const context=vm.createContext({state,loadGeneration:4,identity:()=>1,initialIdentity:1,selectedVenue:()=>2,initialVenue:2,clearSensitive:()=>assert.fail('identity unchanged'),syncQuickShift:()=>{},setReport:()=>{},reconcileAccess:()=>{},render:()=>{},notice:()=>{},$ :()=>({}),Date});
 vm.runInContext(variable('selectedOrder')+variable('badge')+fn('accept')+'\nthis.selectedOrder=selectedOrder;this.badge=badge',context);
 context.accept({generation:4,data:{},orders:[{id:'table',status}],overview:null});assert.equal(state.orderId,null);assert.equal(context.selectedOrder(),undefined);assert.equal(state.quick,quick);assert.doesNotMatch(context.badge({status}),/Открыт/);
});
test('unchanged staff access purges management caches without dismissing a POS dialog',()=>{
 const state:Record<string,unknown>={data:{permissions:{managementDay:false}},workday:{},view:'cashier',rules:[{}]};const context=vm.createContext({state,document:{querySelectorAll:()=>[]},senior:()=>false,configure:()=>false,clearView:()=>{},setReport:()=>{},$ :()=>({close:()=>assert.fail('ordinary staff refresh must not close dialog')})});
 vm.runInContext(fn('reconcileAccess'),context);context.reconcileAccess();assert.equal(state.workday,null);assert.equal(state.overview,null);assert(Array.isArray(state.rules));assert.equal(state.rules.length,0);
});
for(const changed of ['role','permissions','shift','order','quick','menu','pending'])test(`recovery rejects changed ${changed} without clicking or submitting`,()=>{
 const original={role:'owner',permissions:{management:true},shift:'s',order:null,quick:{id:'q'},menu:[{id:'coffee',price:20}]};const next=JSON.parse(JSON.stringify(original));if(changed!=='pending')next[changed]={changed:true};let cleared=0;
 const context=vm.createContext({state:{frozen:false,pending:changed==='pending'?{}:null,legacy:null},sessionStorage:{getItem:()=>JSON.stringify({kind:'payment',context:original,values:{method:'CASH'}})},dialogDraftKey:()=> 'k',clearDialogDraft:()=>cleared++,dialogContext:()=>next,render:()=>assert.fail('stale context rendered'),document:{querySelectorAll:()=>assert.fail('stale context used')}});
 vm.runInContext(fn('restoreDialogDraft'),context);context.restoreDialogDraft();assert.equal(cleared,1);
});

test('revoked access before initial bootstrap erases transient drafts, retaining cart and unrelated session data',()=>{
 const store=new Map([['bd_pos_workspace_v2:a:1:dialog','private input'],['bd_pos_workspace_v2:a:2:dialog','other venue input'],['bd_pos_workspace_v2:a:1','cart'],['unrelated','keep']]);
 const context=vm.createContext({dialogDraft:{kind:'payment'},dialogDraftKey:()=>null,sessionStorage:{get length(){return store.size;},key:(i:number)=>[...store.keys()][i],removeItem:(key:string)=>store.delete(key)}});
 vm.runInContext(fn('clearDialogDraft'),context);context.clearDialogDraft(true);assert.deepEqual([...store.entries()],[['bd_pos_workspace_v2:a:1','cart'],['unrelated','keep']]);assert.equal(context.dialogDraft,null);
});
