import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import {storeRuntime} from './helpers/store-runtime.ts';
const source=fs.readFileSync('public/assets/index-BQGspy0I.js','utf8');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'script'});
const names=['bdCatNumber','bdCatToBase','bdIngredientReferencePatchV440','bdRecipeProductV511','bdRecipeAmountV511','bdRecipeChooseV511'];
const context=vm.createContext({});
vm.runInContext(ast.body.filter(n=>n.type==='FunctionDeclaration'&&names.includes(n.id.name)).map(n=>source.slice(n.start,n.end)).join('\n'),context);
test('actual store persistence clears old product conversion without touching stock balances',async()=>{
 const runtime=await storeRuntime(901);
 try{
  const milk={id:'milk',key:'milk-key',productKey:'milk-key',name:'Milk QA',unit:'ml',baseUnit:'ml',unitModelVersion:4,venueId:901,active:true,kind:'stock'};
  const flour={...milk,id:'flour',key:'flour-key',productKey:'flour-key',name:'Flour QA',unit:'g',baseUnit:'g'};
  const ingredient={id:'line',name:'Milk QA',quantity:2,unit:'шт.',purchaseProductKey:milk.key,productKey:milk.key,nomenclatureItemId:milk.id,unitConversion:{amount:100,unit:'ml',confirmedByUser:true},normalizedQuantity:200,normalizedUnit:'ml',unitResolutionStatus:'packaging_compatible',cost:12};
  const before={menuItems:[{id:'menu',name:'Recipe QA',type:'composite',consumptionMode:'RECIPE',venueId:901,active:true}],recipes:[{id:'recipe',menuItemId:'menu',ownerId:'menu',ownerType:'menu_item',venueId:901,status:'draft',reviewStatus:'requires_review',current:true,lifecycleStatus:'current',ingredients:[ingredient]}],nomenclature:[milk,flour],stockBalances:[{...milk,current:1000},{...flour,current:1000}]};
  runtime.seed('bd_assortment_v1',before);
  const next=structuredClone(before);Object.assign(next.recipes[0].ingredients[0],context.bdRecipeChooseV511(ingredient,flour,901));
  const saved=await runtime.put('bd_assortment_v1',JSON.parse(JSON.stringify(next)),'QA explicit ingredient replacement',before);
  assert.equal(saved.status,200,JSON.stringify(saved.body));
  const after=(await runtime.get('bd_assortment_v1')).body.data;
  const line=after.recipes[0].ingredients[0];
  assert.equal(line.purchaseProductKey,flour.key);assert.equal(line.productKey,flour.key);assert.equal(line.nomenclatureItemId,flour.id);assert.equal(line.quantity,2);assert.equal(line.unit,'шт.');
  assert.equal(line.unitConversion,undefined);assert.notEqual(line.normalizedQuantity,200);assert.equal(line.cost,undefined);assert.equal(after.recipes[0].status,'draft');assert.deepEqual(after.stockBalances,before.stockBalances);
 }finally{runtime.close()}
});
