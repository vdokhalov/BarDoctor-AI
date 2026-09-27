import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync('public/sales-navigation.js','utf8');
function fixture(embedded=true){
 const listeners={},events={},routes=[],timers=new Map(),nodes=new Map();let allow=true,id=0;
 const control={attributes:{},setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]}};
 const document={getElementById:id=>nodes.get(id),querySelector:()=>null,body:{append(n){nodes.set(n.id,n)}},createElement:()=>({setAttribute(){},remove(){nodes.delete(this.id)}}),addEventListener(k,f){listeners[k]=f},dispatchEvent:()=>allow};
 const location={href:'https://qa.test/sales-entry?view=shifts&venue=42',origin:'https://qa.test',assign:p=>routes.push({native:p})};
 const window={location,document,addEventListener(k,f){events[k]=f}};window.self=window;window.top=embedded?{location,bdNavigate:p=>routes.push({spa:p}),document:{createElement(){throw Error('No inset simulation')}}}:window;
 vm.runInNewContext(source,{window,document,location,localStorage:{getItem:()=> '17'},URL,CustomEvent:class{},setTimeout:f=>{timers.set(++id,f);return id},clearTimeout:id=>timers.delete(id)});
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

test('checkout measurements settle without synchronous resize delivery writes',()=>{
 const cashier=fs.readFileSync('public/cashier.js','utf8');
 const source=cashier.slice(cashier.indexOf('  let layoutFrame=0;'),cashier.indexOf('  function selectPane(order)'));
 const frames=[],writes=[],values=new Map(),observed=[];let callback,top=180,height=240;
 const footer={getBoundingClientRect:()=>({height})},shell={};
 const style={getPropertyValue:key=>values.get(key)||'',setProperty(key,value){writes.push([key,value]);values.set(key,value)}};
 vm.runInNewContext(source,{
  requestAnimationFrame:f=>{frames.push(f);return frames.length},window:{scrollY:20},
  $:()=>({getBoundingClientRect:()=>({top})}),
  document:{documentElement:{style},querySelector:q=>q==='.pos-shell'?shell:footer},
  ResizeObserver:class{constructor(fn){callback=fn}observe(node){observed.push(node)}}
 });
 assert.deepEqual(observed,[shell,footer]);callback();callback();assert.equal(frames.length,1);assert.equal(writes.length,0);
 frames.shift()();assert.deepEqual(writes,[['--pos-cart-offset','200px'],['--pos-checkout-height','240px']]);
 callback();frames.shift()();assert.equal(writes.length,2,'stable measurements do not invalidate layout');
 top=190;height=310;callback();frames.shift()();assert.equal(values.get('--pos-cart-offset'),'210px');assert.equal(values.get('--pos-checkout-height'),'310px');
});
