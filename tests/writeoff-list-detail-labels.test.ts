import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as labels from '../lib/bardoctor/display-consistency';
test('shipped writeoff list and detail use the same source/location labels without changing the document',()=>{
 const source=readFileSync('public/assets/index-BQGspy0I.js','utf8');
 const list=source.match(/children:(\(A\.reasonLabel\|\|"Без причины"\)[\s\S]*?)\}\)/)?.[1];assert(list);
 const start=source.indexOf('children:[["Дата",sg(e.date)]'),end=source.indexOf('.map(([s,l])',start);assert(start>=0&&end>start);const detail=source.slice(start+'children:'.length,end);
 const renderList=new Function('A','bdWarehouseDocumentModule',`return ${list}`),renderDetail=new Function('e','bdWarehouseDocumentModule','sg','bdWriteoffStatusV271',`return ${detail}`);
 for(const [kind,expected] of [['pos_cancellation','Отмена позиции POS'],['shift_close','Закрытие смены'],['warehouse','Склад']]){
  const document={source:kind,location:'__venue__',shiftId:'test-shift',reasonLabel:'Отмена подтверждённой позиции',status:'posted',date:'2026-10-19'},before=JSON.stringify(document);
  assert.equal(renderList(document,labels),`Отмена подтверждённой позиции · Склад заведения · ${expected}`);
  const fields=Object.fromEntries(renderDetail(document,labels,(s:string)=>s,(s:string)=>s));assert.equal(fields['Зона'],'Склад заведения');assert.equal(fields['Источник'],expected);assert.equal(JSON.stringify(document),before);
 }
});
