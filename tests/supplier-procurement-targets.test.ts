import test from 'node:test';import assert from 'node:assert/strict';
import {supplierProcurementTargets as targets} from '../lib/bardoctor/supplier-procurement-targets';
import {isSameSupplierMenuProduct} from '../lib/bardoctor/supplier-alternative-rules';
const names=['Мука пшеничная','Absolut','Borjomi','Салфетки','Fairy','Сахар'];
function fixture(){return {nomenclature:names.map((name,i)=>({id:String(i),name,venueId:1,kind:'stock',active:true})),menuItems:[{id:'dish',name:'Коктейль с соком',consumptionMode:'RECIPE',active:true}],stockBalances:[]};}
test('all procurement categories without menu links, purchases or stock',()=>{assert.deepEqual(targets(fixture(),1),names);});
test('self-made menu dish and menu-only keyword never become procurement SKU',()=>{assert.deepEqual(targets({nomenclature:[],menuItems:fixture().menuItems},1),[]);});
test('archived/deleted/service/foreign records excluded',()=>{const a=fixture();for(const flags of [{active:false},{archived:true},{status:'deleted'},{isDeleted:true},{kind:'service'},{inventoryType:'non_stock'},{venueId:2}])assert.deepEqual(targets({nomenclature:[{...a.nomenclature[0],...flags}]},1),[]);});
test('packaging preserved and no prefix truncation',()=>{const rows=Array.from({length:182},(_,i)=>({id:String(i),name:'Borjomi',packageSize:i+' л',venueId:1}));assert.equal(targets({nomenclature:rows},1).length,182);assert.ok(targets({nomenclature:rows},1).includes('Borjomi · 181 л'));});
test('fresh source respected and unmodified; duplicates removed',()=>{const a=fixture(),saved=JSON.stringify(a);targets(a,1);assert.equal(JSON.stringify(a),saved);a.nomenclature.push({...a.nomenclature[0]});assert.equal(targets(a,1).length,names.length);a.nomenclature[0].name='Рис';assert.ok(targets(a,1).includes('Рис'));});
test('nonbranded generic stock products match actual product but not another category',()=>{assert.equal(isSameSupplierMenuProduct('Вода','Вода питьевая 1 л'),true);assert.equal(isSameSupplierMenuProduct('Вода','Молоко 1 л'),false);assert.equal(isSameSupplierMenuProduct('Fairy','Другой бренд'),false);});
