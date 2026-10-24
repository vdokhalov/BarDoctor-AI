import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('public/reviews.js','utf8');
const code=source.slice(source.indexOf('  function showRequestedReview()'),source.indexOf('  window.addEventListener("popstate",showRequestedReview)'));
function fixture(hash,{id='r',visible=true}={}){
 let scrolled=0,rendered=0;const input={value:'saved'},select={value:'google'};
 const state={search:'saved',source:'google',filter:'negative'};
 const target={scrollIntoView:()=>scrolled++};
 const context={state,window:{location:{hash}},reviews:()=>[{id}],document:{getElementById:key=>key==='review-search'?input:key==='review-source-select'?select:visible&&key==='review-'+encodeURIComponent(id)?target:null},renderFilters:()=>{},renderReviewList:()=>{rendered++;visible=true;}};
 vm.createContext(context);vm.runInContext(code,context);context.showRequestedReview();return {state,input,select,scrolled,rendered};
}
test('existing visible review scrolls without discarding filters',()=>{const f=fixture('#review-r');assert.equal(f.scrolled,1);assert.equal(f.state.search,'saved');assert.equal(f.rendered,0);});
test('hidden existing review clears only obstructing filters and scrolls',()=>{const f=fixture('#review-r',{visible:false});assert.equal(f.scrolled,1);assert.equal(f.rendered,1);assert.equal(f.state.search,'');assert.equal(f.select.value,'all');});
test('unknown or another venue review does not clear filters or invent a target',()=>{const f=fixture('#review-foreign');assert.equal(f.scrolled,0);assert.equal(f.state.search,'saved');});
test('encoded identifiers resolve exact review',()=>{assert.equal(fixture('#review-'+encodeURIComponent('id /я'),{id:'id /я'}).scrolled,1);});
test('empty and malformed hashes are harmless',()=>{for(const hash of ['', '#other', '#review-%E0%A4'])assert.equal(fixture(hash).scrolled,0);});
