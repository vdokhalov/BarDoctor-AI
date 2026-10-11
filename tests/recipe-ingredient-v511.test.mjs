import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
const source=fs.readFileSync('public/assets/index-BQGspy0I.js','utf8');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'script'});
const names=['bdCatArray','bdCatPackage','bdCatMatchingProductsV258','bdCatNumber','bdCatToBase','bdTechCostUnitV376','bdIngredientReferencePatchV440','bdRecipeProductV511','bdRecipeAmountV511','bdRecipeChooseV511','bdRecipeLineCostV511'];
const context=vm.createContext({});
vm.runInContext(ast.body.filter(node=>node.type==='FunctionDeclaration'&&names.includes(node.id.name)).map(node=>source.slice(node.start,node.end)).join('\n'),context);
const product={id:'milk',key:'stock:milk',name:'Молоко 1 л',unit:'l',venueId:801};
const line={id:'line',name:'Milk',quantity:1,unit:'шт.'};
function plain(value){return JSON.parse(JSON.stringify(value));}
const choose=(l,p=product)=>plain(context.bdRecipeChooseV511(l,p,801));
const cost=(l,rows,products=[product])=>plain(context.bdRecipeLineCostV511(l,rows,products,801));
const bound={...line,name:product.name,purchaseProductKey:product.key,productKey:product.key,nomenclatureItemId:product.id,unit:'мл',quantity:250};
const price={productKey:product.key,nomenclatureItemId:product.id,unit:'l',unitPrice:12,currency:'MDL',complete:true,costStatus:'KNOWN_VALUE'};
test('new untouched ingredient selects name/IDs together and uses stock unit',()=>{const p=choose({...line,name:'',_editorNewIngredient:true});assert.equal(p.name,product.name);assert.equal(p.productKey,product.key);assert.equal(p.purchaseProductKey,product.key);assert.equal(p.nomenclatureItemId,product.id);assert.equal(p.unit,'л');assert.equal(p.resolutionStatus,'linked_ready');});
test('existing or edited quantity is never silently reinterpreted',()=>{for(const l of [line,{...line,name:'',quantity:2,_editorNewIngredient:true}]){const p=choose(l);assert.equal(p.unit,undefined);assert.equal(p.unitResolutionStatus,'requires_review');assert.equal(p.normalizedQuantity,undefined);}});
test('selection rejects foreign, archived, inactive and service products',()=>{for(const extra of [{venueId:802},{archived:true},{active:false},{status:'archived'},{kind:'service'},{type:'service'}])assert.equal(choose(line,{...product,...extra}),null);});
test('product replacement clears previous conversion, normalized amount and cached costs',()=>{const p=choose({...bound,purchaseProductKey:'old',productKey:'old',nomenclatureItemId:'old',unitConversion:{amount:100,unit:'ml',confirmedByUser:true},normalizedQuantity:999,unitPrice:90,cost:90});for(const key of ['unitConversion','unitPrice','cost'])assert.equal(p[key],undefined);assert.equal(p.normalizedQuantity,250);});
test('cost lookup cannot reuse a matching line ID bound to another product',()=>{assert.equal(cost(bound,[{...price,id:'line',productKey:'old',nomenclatureItemId:'old'}]).complete,false);assert.equal(cost(bound,[{...price,id:'line',productKey:'old'}]).complete,false);});
test('kg/g l/ml authoritative basis and known zero remain correct',()=>{assert.equal(cost(bound,[price]).cost,3);assert.equal(cost({...bound,unit:'л',quantity:2},[price]).cost,24);assert.equal(cost(bound,[{...price,unitPrice:0,costStatus:'KNOWN_ZERO'}]).cost,0);const flour={...product,id:'flour',key:'flour',unit:'kg'};assert.equal(cost({...bound,nomenclatureItemId:'flour',purchaseProductKey:'flour',productKey:'flour',unit:'г',quantity:250},[{...price,nomenclatureItemId:'flour',productKey:'flour',unit:'kg'}],[flour]).cost,3);});
test('missing price and incompatible quantity report different causes',()=>{assert.equal(cost(bound,[]).reason,'price');assert.equal(cost({...bound,unit:'шт.'},[price]).reason,'unit');assert.equal(cost(bound,[{...price,unit:'kg'}]).reason,'price_unit');});
test('piece conversion requires explicit confirmation and is recalculated for quantity',()=>{const l={...bound,unit:'шт.',quantity:2,unitConversion:{amount:200,unit:'ml',confirmedByUser:true}};assert.equal(cost(l,[price]).cost,4.8);assert.equal(cost({...l,unitConversion:{...l.unitConversion,confirmedByUser:false}},[price]).reason,'unit');});
test('text and IDs remain independent; a recipe alias cannot change the stock target',()=>{assert.equal(cost({...bound,name:'Особое название'},[price]).cost,3);assert.equal(cost({...bound,name:product.name,nomenclatureItemId:'other'},[price]).reason,'mapping');});
test('unknown, blank, negative and unconfirmed prices do not manufacture known cost',()=>{for(const extra of [{unitPrice:null},{unitPrice:''},{unitPrice:-1},{complete:false},{costStatus:'UNKNOWN'},{currency:''}])assert.equal(cost(bound,[{...price,...extra}]).complete,false);});

test('imported names remain available after explicit matching; new query text does not invent identity',()=>{const imported=choose(line);assert.equal(imported.originalName,'Milk');const fresh=choose({...line,name:'Молоко',_editorNewIngredient:true});assert.equal(fresh.unit,'л');assert.equal(fresh.originalName,undefined);assert.equal(fresh._editorNewIngredient,false);});

test('unresolved references and explicit unit-review states never show known cost',()=>{for(const extra of [{productKey:'another'},{linkStatus:'missing'},{resolutionStatus:'reference_conflict'}])assert.equal(cost({...bound,...extra},[price]).reason,'mapping');for(const status of ['requires_review','invalid','missing'])assert.equal(cost({...bound,unitResolutionStatus:status},[price]).reason,'unit');});

test('real catalog adapter preserves canonical stock unit for new rows and quick-create parity',()=>{
 for(const unit of ['l','kg']){
  const raw={...product,unit,baseUnit:unit,unitModelVersion:4,packageSize:''};
  const adapted=context.bdCatMatchingProductsV258({nomenclature:[raw]},[])[0];
  assert.equal(adapted.unit,unit==='l'?'ml':'g');assert.equal(adapted.canonicalStockUnit,unit);
  assert.equal(choose({...line,_editorNewIngredient:true},adapted).unit,choose({...line,_editorNewIngredient:true},raw).unit);
 }
});
test('existing packaging resolution recomputes same-product package and rejects stale or ambiguous values',()=>{
 const p={...product,packageSize:'1 л'};
 const packaged={...bound,unit:'шт.',quantity:1,unitResolutionStatus:'packaging_compatible',normalizedQuantity:99999,normalizedUnit:'ml'};
 assert.equal(cost(packaged,[price],[p]).cost,12);assert.equal(cost(packaged,[price],[{...p,packageSize:'6 x 1 л'}]).cost,72);
 assert.equal(cost({...packaged,quantity:2},[price],[p]).cost,24);
 assert.equal(cost(packaged,[price],[{...p,packageOptions:['500 мл']}]).reason,'unit');
 assert.equal(cost({...packaged,purchaseProductKey:'old',productKey:'old'},[price],[p]).reason,'mapping');
 const replacement={...p,id:'replacement',key:'replacement'};
 const next={...packaged,...context.bdRecipeChooseV511(packaged,replacement,801)};
 assert.equal(next.normalizedQuantity,undefined);assert.equal(next.unitResolutionStatus,'requires_review');
});
