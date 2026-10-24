import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import{readFileSync}from'node:fs';
function contract(){const window={location:{origin:'https://local.test',href:'https://local.test/catalog'}};vm.runInNewContext(readFileSync('public/navigation-contract-v247.js','utf8'),{window,URL,URLSearchParams,document:{documentElement:{setAttribute(){}}}});return(window as any).bdNavigationContract}
test('catalog return preserves exact item venue and list context',()=>{const c=contract(),result=new URL(c.parent('/catalog?returnTo=nomenclature&returnItem=nom%3Aa&venue=3393&returnView=all&returnQ=water'),'https://local.test');assert.equal(result.pathname,'/nomenclature');assert.equal(result.searchParams.get('item'),'nom:a');assert.equal(result.searchParams.get('venue'),'3393');assert.equal(result.searchParams.get('q'),'water');assert.equal(result.searchParams.get('view'),'all')});
test('item detail closes within catalog before returning to nomenclature',()=>{assert.match(contract().parent('/catalog?returnTo=nomenclature&returnItem=a&itemId=menu1'),/^\/catalog\?/)});
test('return cannot redirect externally or accept a forged venue',()=>{const c=contract();assert.equal(c.resolve('https://outside.invalid/catalog?returnTo=nomenclature'),null);const result=new URL(c.parent('/catalog?returnTo=nomenclature&returnItem=https://outside.invalid&venue=evil&returnView=evil'),'https://local.test');assert.equal(result.pathname,'/nomenclature');assert.equal(result.searchParams.has('venue'),false);assert.equal(result.searchParams.has('view'),false);assert.equal(c.parent('/catalog?returnTo=https://outside.invalid'),'/more')});
test('legal owner and anonymous fallbacks are fixed internal destinations',()=>{for(const signed of [true,false]){const c=vm.createContext({location:{search:'?venue=3393&from=https://outside.invalid'},Ot:()=>signed?'fixture':null,gz:()=>signed?'token':null,URLSearchParams});vm.runInContext(readFileSync('scripts/fragments/legal-item-back.js','utf8'),c);assert.equal(c.bdTermsBackUrl(),signed?'/about?venue=3393':'/login')}});
test('existing integration and notification subview parents remain unchanged',()=>{const c=contract();assert.equal(c.parent('/integrations?venue=2&flow=onec'),'/integrations?venue=2');assert.equal(c.parent('/notifications?venue=2&view=category&category=incident'),'/notifications?venue=2')});
test('privacy retains only supported entry contexts and validated venue',()=>{
 for(const signed of [true,false])for(const from of ['about','login','register','https://outside.invalid','//outside.invalid','']){
  const c=vm.createContext({location:{search:'?venue=3393&from='+encodeURIComponent(from)},Ot:()=>signed?'fixture':null,gz:()=>signed?'token':null,URLSearchParams});vm.runInContext(readFileSync('scripts/fragments/legal-item-back.js','utf8'),c);
  assert.equal(c.bdPrivacyBackUrl(),from==='login'?'/login':from==='register'?'/register':signed?'/about?venue=3393':'/login');
 }
});
test('privacy About link preserves venue but cannot create arbitrary targets',()=>{
 const c=vm.createContext({location:{search:'?venue=3393'},localStorage:{getItem:()=>null},URLSearchParams});vm.runInContext(readFileSync('scripts/fragments/legal-item-back.js','utf8'),c);
 assert.equal(c.bdTermsEntryUrl('privacy'),'/privacy?from=about&venue=3393');assert.equal(c.bdTermsEntryUrl('https://outside.invalid'),'/terms?from=about&venue=3393');
 c.location.search='?venue=evil';assert.equal(c.bdTermsEntryUrl('privacy'),'/privacy?from=about');
});
