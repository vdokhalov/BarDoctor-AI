import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync('public/sales-navigation.js','utf8');
function fixture(embedded=true, sharedTop, now=()=>Date.now()){
 const listeners={},events={},routes=[],timers=new Map(),nodes=new Map();let allow=true,id=0;
 const control={attributes:{},setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]}};
 const document={getElementById:id=>nodes.get(id),querySelector:()=>null,body:{append(n){nodes.set(n.id,n)}},createElement:()=>({setAttribute(){},remove(){nodes.delete(this.id)}}),addEventListener(k,f){listeners[k]=f},dispatchEvent:()=>allow};
 const location={href:'https://qa.test/sales-entry?view=shifts&venue=42',origin:'https://qa.test',assign:p=>routes.push({native:p})};
 const window={location,document,addEventListener(k,f){events[k]=f}};window.self=window;window.top=sharedTop||(embedded?{location,bdNavigate:p=>routes.push({spa:p}),document:{createElement(){throw Error('No inset simulation')}}}:window);
 vm.runInNewContext(source,{window,document,location,localStorage:{getItem:()=> '17'},URL,CustomEvent:class{},Date:{now},Math,setTimeout:f=>{timers.set(++id,f);return id},clearTimeout:id=>timers.delete(id)});
 return {window,control,routes,nodes,events,timers,listeners,cancel(){allow=false}};
}
test('embedded Sales navigation preserves venue and deduplicates taps with immediate local feedback',()=>{
 const f=fixture();f.window.bdSalesNavigation.navigate('/cashier?embedded=1',f.control);f.window.bdSalesNavigation.navigate('/cashier',f.control);
 assert.deepEqual(f.routes,[{spa:'/cashier?venue=42'}]);assert.equal(f.control.attributes['aria-busy'],'true');assert.match(f.nodes.get('sales-navigation-status').textContent,/Открываем/);
});
test('standalone uses native navigation and explicit venue wins',()=>{const f=fixture(false);f.window.bdSalesNavigation.navigate('/cashier?venue=99',f.control);assert.deepEqual(f.routes,[{native:'/cashier?venue=99'}]);});
test('draft cancellation prevents navigation and pending state',()=>{const f=fixture();f.cancel();f.window.bdSalesNavigation.navigate('/cashier',f.control);assert.equal(f.routes.length,0);assert.equal(f.nodes.size,0);});
test('stalled transition becomes retryable and pageshow clears pending',()=>{const f=fixture();f.window.bdSalesNavigation.navigate('/cashier',f.control);[...f.timers.values()][0]();assert.equal(f.control.attributes['aria-busy'],undefined);f.window.bdSalesNavigation.navigate('/cashier',f.control);assert.equal(f.routes.length,2);f.events.pageshow();assert.equal(f.nodes.size,0);assert.equal(f.control.attributes['aria-busy'],undefined);});
test('capture handler consumes one action and ignores modified or external links',()=>{
 const f=fixture();let prevented=0,stopped=0;const link={...f.control,dataset:{},matches:()=>false,getAttribute:()=>'/cashier'};
 const event={button:0,target:{closest:()=>link},preventDefault(){prevented++},stopImmediatePropagation(){stopped++}};
 f.listeners.click(event);f.listeners.click(event);assert.equal(f.routes.length,1);assert.equal(prevented,2);assert.equal(stopped,2);
 f.events.pageshow();f.listeners.click({...event,ctrlKey:true});assert.equal(f.routes.length,1);assert.equal(f.window.bdSalesNavigation.href('https://external.test'),null);
});

test('leaving Sales refreshes the canonical domain stores via native document',()=>{const f=fixture();f.window.bdSalesNavigation.navigate('/warehouse?sourceDocumentId=sale',f.control);assert.deepEqual(f.routes,[{native:'/warehouse?sourceDocumentId=sale&venue=42'}]);});

// POS layout amendment: checkout now participates in normal document flow.
// The old observer-specific assertion is replaced by the same no-feedback/no-overlap
// contract; real viewport geometry is exercised in pos-recovery-browser-qa.ts.
test('flow checkout needs no synchronous resize writes or fixed footer reservation',()=>{
 const cashier=fs.readFileSync('public/cashier.js','utf8'),css=fs.readFileSync('public/cashier.css','utf8');
 assert.doesNotMatch(cashier,/new ResizeObserver|--pos-checkout-height|--pos-cart-offset/);
 const rules=[...css.matchAll(/[^{}]*\.cart-foot[^{}]*\{([^{}]*)\}/g)].map(match=>match[1]);
 assert.ok(rules.length>0,'checkout retains explicit styles');
 for(const rule of rules)assert.doesNotMatch(rule,/position\s*:\s*(fixed|absolute|sticky)|bottom\s*:/);
 const qa=fs.readFileSync('scripts/pos-recovery-browser-qa.ts','utf8');
 assert.match(qa,/checkout does not overlap order lines/);
});

function touch(f, href='/cashier', {x=100,y=160,detail=1,pointerType='touch'}={}) {
 let prevented=0,stopped=0;
 f.listeners.pointerdown({pointerType,screenX:x,screenY:y});
 const link={...f.control,dataset:{},matches:()=>false,getAttribute:()=>href};
 f.listeners.click({button:0,detail,target:{closest:()=>link},preventDefault(){prevented++},stopImmediatePropagation(){stopped++}});
 return {prevented,stopped};
}
function handoff(elapsed=50){
 let time=1000;const from=fixture(true,undefined,()=>time);
 touch(from);const top=from.window.top;time+=elapsed;
 return {from,to:fixture(true,top,()=>time),top};
}
test('rapid second touch cannot activate Back in the replacement Cashier document',()=>{
 const {from,to,top}=handoff();
 assert.deepEqual(touch(to,'/sales-import'),{prevented:1,stopped:1});
 assert.deepEqual(from.routes,[{spa:'/cashier?venue=42'}]);
 assert.equal(top.__bdSalesTapHandoff,undefined,'handoff consumes only one extra tap');
 touch(to,'/sales-import');assert.equal(from.routes.length,2,'subsequent intentional Back works');
});
for(const [name,elapsed,options] of [
 ['later touch',351,{}],['different position',50,{x:150}],
 ['mouse click',50,{pointerType:'mouse'}],['keyboard activation',50,{detail:0}],
])test('handoff preserves '+name,()=>{
 const {from,to}=handoff(elapsed);touch(to,'/sales-import',options);
 assert.deepEqual(from.routes,[{spa:'/cashier?venue=42'},{spa:'/sales-import?venue=42'}]);
});
test('cancelled and cross-module navigation do not arm a touch handoff',()=>{
 const cancelled=fixture();cancelled.cancel();touch(cancelled);
 assert.equal(cancelled.window.top.__bdSalesTapHandoff,undefined);
 const leaving=fixture();touch(leaving,'/warehouse');
 assert.equal(leaving.window.top.__bdSalesTapHandoff,undefined);
 assert.deepEqual(leaving.routes,[{native:'/warehouse?venue=42'}]);
});
