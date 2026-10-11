import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { patchDataControlNavigation } from '../scripts/patch-data-control-navigation-v513.mjs';
const bundle=fs.readFileSync('public/assets/index-BQGspy0I.js','utf8');
const patched=patchDataControlNavigation(bundle);
function fixture(){
 let search='?venue=3389',subscriptions=0;
 const context=vm.createContext({URLSearchParams,window:{location:{search:'?venue=3389',hash:''}},ste:()=>{subscriptions++;return search;},bt:()=>[null,()=>{}],nt:'shell',bdPrepareEmbeddedPage:()=>{},i:{jsx:(type,props)=>({type,props})}});
 const start=patched.indexOf('function bdEmbeddedPage('),end=patched.indexOf('function bdTeamAccessPage',start);
 vm.runInContext(patched.slice(start,end),context);
 return {context,setSearch:value=>{search=value;},subscriptions:()=>subscriptions,render:()=>{const page=context.bdDataControlPage();return context.bdEmbeddedPage(page.props).props.children.props;}};
}
test('subsection query updates reach the iframe without remounting the outer route',()=>{
 const f=fixture();assert.equal(f.render().src,'/data-control?venue=3389&embedded=1');
 for(const tab of ['journal','periods','overview']){
  f.setSearch('?venue=3389'+(tab==='overview'?'':'&tab='+tab));
  const src=new URL(f.render().src,'https://qa.test');assert.equal(src.searchParams.get('tab'),tab==='overview'?null:tab);assert.equal(src.searchParams.get('venue'),'3389');assert.equal(src.searchParams.get('embedded'),'1');
 }
 assert.equal(f.subscriptions(),4,'Data Control subscribes to router search changes');
});
test('explicit empty search, venue switch and browser back cannot reuse stale window query',()=>{
 const f=fixture();f.setSearch('?venue=999&tab=journal&event=sample');assert.match(f.render().src,/venue=999&tab=journal&event=sample/);
 f.setSearch('');assert.equal(f.render().src,'/data-control?embedded=1');
 f.setSearch('?venue=3389');assert.equal(f.render().src,'/data-control?venue=3389&embedded=1');
});
test('other embedded pages retain their location fallback, title and preparation handler',()=>{
 const f=fixture();const props=f.context.bdEmbeddedPage({source:'/reviews',title:'Отзывы'}).props.children.props;
 assert.equal(props.src,'/reviews?venue=3389&embedded=1');assert.equal(props.title,'Отзывы');assert.equal(typeof props.onLoad,'function');
});
test('patch is repeatable and fails closed against unexpected source',()=>{
 assert.equal(patchDataControlNavigation(patched),patched);assert.throws(()=>patchDataControlNavigation('unexpected source'),/target/);
});
