import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const helper=readFileSync(new URL('../scripts/fragments/menu-taxonomy-v440.fragment.txt',import.meta.url),'utf8');
const context=vm.createContext({ca:()=>({}),Ot:()=>({})});
vm.runInContext(helper,context);
test('canonical category with optional empty subcategory survives late taxonomy and retry',()=>{
 const draft={name:'edited',sectionId:'bar',taxonomyCategoryId:'vodka',subcategoryId:''};
 assert.equal(context.bdMenuTaxonomyMergeV440(draft,{legacyMenuPaths:[{sectionId:'wrong'}]},true),draft);
});
test('existing unmapped and ambiguous legacy records are not assigned an arbitrary category',()=>{
 const draft={groupId:'legacy',name:'edited'};
 assert.equal(context.bdMenuTaxonomyMergeV440(draft,{taxonomy:{sections:[{id:'first'}]},legacyMenuPaths:[]},true),draft);
 assert.equal(context.bdMenuTaxonomyMergeV440(draft,{legacyMenuPaths:[{groupId:'legacy'},{groupId:'legacy'}]},true),draft);
});
test('unavailable references differ from a successfully empty taxonomy',()=>{
 const empty={sections:[],categories:[],subcategories:[]};
 assert.equal(context.bdMenuTaxonomyIssueV440(empty,{}),'');
 assert.match(context.bdMenuTaxonomyIssueV440(empty,{sectionId:'deleted'}),/недоступен/);
});
test('request pins venue, preserves HTTP versus transport diagnostics and rejects wrong venue',async()=>{
 let options;
 context.fetch=async(path,opts)=>{options=opts;return {ok:false,status:403}};
 await assert.rejects(context.bdMenuTaxonomyRequestV440(901),error=>error.diagnostic.status===403&&error.diagnostic.kind==='http');
 assert.equal(options.headers['X-Venue-Id'],'901');
 context.fetch=async()=>{throw new TypeError('Load failed')};
 await assert.rejects(context.bdMenuTaxonomyRequestV440(901),error=>error.diagnostic.kind==='transport'&&error.diagnostic.status===null);
 context.fetch=async()=>({ok:true,status:200,json:async()=>({ok:true,venueId:902,taxonomy:{sections:[],categories:[],subcategories:[]}})});
 await assert.rejects(context.bdMenuTaxonomyRequestV440(901),error=>error.diagnostic.kind==='invalid-response');
});

test('existing recipe selector excludes other owners, foreign venues and history without mutating mode',()=>{
 const access=readFileSync(new URL('../scripts/fragments/tech-card-access-v440.fragment.txt',import.meta.url),'utf8');
 const scope=vm.createContext({});vm.runInContext(access,scope);
 const item={id:'a',venueId:901,consumptionMode:'NONE'};
 const current={id:'one',ownerId:'a',venueId:901,current:true};
 const recipes=[current,{...current,id:'two'},{...current,id:'foreign',venueId:902},{...current,id:'other-owner',ownerId:'b'},{...current,id:'history',current:false}];
 assert.deepEqual(Array.from(scope.bdEditableRecipesV440(item,recipes,901),r=>r.id),['one','two']);
 assert.equal(scope.bdEditableRecipesV440(item,recipes,902).length,0);
 assert.equal(item.consumptionMode,'NONE');
 const cleared=scope.bdIngredientReferencePatchV440(null,'');
 assert.equal(cleared.nomenclatureItemId,undefined);assert.equal(cleared.productKey,undefined);assert.equal(cleared.purchaseProductKey,undefined);
});
test('actual loading effect ignores stale success and failure after unmount',async()=>{
 const menu=readFileSync(new URL('../scripts/fragments/menu-consumption-sot-v418.fragment.txt',import.meta.url),'utf8');
 const effect=menu.slice(menu.indexOf('S.useEffect(()=>{let live=true;'),menu.indexOf('  const bdMenuTaxIssueV440='));
 for(const outcome of ['resolve','reject']){
  let cleanup,finish;const writes=[];
  const pending=new Promise((resolve,reject)=>{finish=outcome==='resolve'?resolve:reject});
  const local={AbortController,S:{useEffect:fn=>{cleanup=fn()}},bdMenuVenueId:901,e:{id:'a'},bdMenuTaxRetryV440:0,
   bdMenuTaxonomyRequestV440:()=>pending,bdSetMenuTaxLoadingV350:v=>writes.push(v),bdSetMenuTaxErrorV440:v=>writes.push(v),bdSetMenuTaxonomy:v=>writes.push(v),bdSetMenuTaxPathsV350:v=>writes.push(v),g:v=>writes.push(v)};
  vm.runInNewContext(effect,local);cleanup();writes.length=0;
  finish(outcome==='resolve'?{taxonomy:{},legacyMenuPaths:[]}:new Error('late error'));await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(writes,[]);
 }
});

test('catalog projection keeps the canonical taxonomy during unrelated recipe writes',()=>{
 const bundle=readFileSync(new URL('../public/assets/index-BQGspy0I.js',import.meta.url),'utf8');
 const start=bundle.indexOf('function bdCatState('),end=bundle.indexOf('\nfunction ',start+1);
 const local={bdCatArray:value=>Array.isArray(value)?value:[],bdCatNumber:(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback};
 vm.runInNewContext(bundle.slice(start,end),local);
 const taxonomy={sections:[{id:'bar',name:'Бар'}],categories:[{id:'vodka',parentId:'bar'}],subcategories:[]};
 const projected=local.bdCatState({groups:[{id:'bar',name:'Бар'}],menuItems:[],nomenclatureStructure:taxonomy});
 assert.equal(projected.nomenclatureStructure,taxonomy);
});
