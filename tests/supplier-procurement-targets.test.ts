import test from 'node:test';import assert from 'node:assert/strict';
import {supplierProcurementTargets as targets} from '../lib/bardoctor/supplier-procurement-targets';
import {salesEventFixture} from './helpers/sales-event-fixture';
import {isPackagedProcurementItem} from '../lib/bardoctor/supplier-alternative-rules';
function fixture(){const a:any=structuredClone(salesEventFixture().assortment);a.menuItems=a.menuItems.slice(0,1);a.menuItems[0].name='Borjomi 0,5 л, стекло';a.menuItems[0].category='category-id';return a;}
test('reproduces name-only omission; canonical ready product included',()=>{const a=fixture();assert.equal(isPackagedProcurementItem(a.menuItems[0].name+' category-id'),false);assert.deepEqual(targets(a,1),['Borjomi 0,5 л, стекло']);});
test('no purchase or stock balance required, legacy water retained',()=>{const a=fixture();a.stockBalances=[];a.menuItems.push({id:'old',name:'Тест Вода',active:true,venueId:1});assert.deepEqual(targets(a,1),['Borjomi 0,5 л, стекло','Тест Вода']);});
test('packaging names kept distinct, duplicates removed, no180row truncation',()=>{const a=fixture();a.menuItems=Array.from({length:182},(_,i)=>({...a.menuItems[0],id:'menu'+i,name:'Borjomi '+i+' л, стекло'}));a.menuItems.push({...a.menuItems[0]});assert.equal(targets(a,1).length,182);assert.ok(targets(a,1).includes('Borjomi 181 л, стекло'));});
test('foreign and archived menu/nomenclature, missing links cannot add branded target',()=>{for(const alter of [(a:any)=>a.menuItems[0].venueId=2,(a:any)=>a.nomenclature[0].venueId=2,(a:any)=>a.menuItems[0].active=false,(a:any)=>a.menuItems[0].archived=true,(a:any)=>a.nomenclature=[]]){const a=fixture();alter(a);assert.deepEqual(targets(a,1),[]);}});
test('calls always reflect fresh data without modifying assortment',()=>{const a=fixture(),saved=JSON.stringify(a);targets(a,1);assert.equal(JSON.stringify(a),saved);a.menuItems[0].name='Новая марка 0,5 л';assert.deepEqual(targets(a,1),['Новая марка 0,5 л']);});
