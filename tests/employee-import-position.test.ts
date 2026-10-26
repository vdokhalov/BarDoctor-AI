import test from 'node:test';
import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
async function fixture(){
 const r=await lifecycleRuntime({storeAll:'./app/api/store/route',preview:'./app/api/integration-hub/import/preview/route',importFile:'./app/api/integration-hub/import/route',storeKey:'./app/api/store/[key]/route'});
 const user=await r.register('employee-import@local.test');
 const csv='external_id,name,position,department\nteam-import-test-2610,Вера Импорт Тест,Бариста,Бар';
 const fileRequest=(data:string,mapping?:unknown)=>{const f=new FormData();f.set('file',new File([data],'team-import-employees.csv',{type:'text/csv'}));f.set('entityType','employee');f.set('externalSystem','Isolated CSV');if(mapping)f.set('fieldMapping',JSON.stringify(mapping));const auth=r.request(user,'/api/integration-hub/import','POST');auth.headers.delete('content-type');return new Request(auth,{body:f});};
 const read=async()=>{const response=await r.api.storeKey.GET(r.request(user,'/api/store/bd_employees'),{params:Promise.resolve({key:'bd_employees'})} as never);return (await response.json() as any).data as any[]};
 return {...r,user,csv,fileRequest,read};
}
test('exact audit CSV preview→import→store preserves Barista for card/editor',async()=>{const r=await fixture();try{
 const p=await r.api.preview.POST(r.fileRequest(r.csv));assert.equal(p.status,200,await p.clone().text());const parsed=await p.json() as any;
 assert.equal(parsed.inspection.suggestedMapping.role,'position');
 const result=await r.api.importFile.POST(r.fileRequest(r.csv,parsed.inspection.suggestedMapping));assert.equal(result.status,201,await result.clone().text());
 const employees=await r.read();assert.equal(employees.length,1);assert.equal(employees[0].position,'other');assert.equal(employees[0].customPositionLabel,'Бариста');
}finally{r.close()}});

import {EMPLOYEE_POSITION_LABELS, importedEmployeePosition} from '../lib/bardoctor/employee-import-position';
import {readFileSync} from 'node:fs';
test('job title definitions match the existing manual editor, including custom Barista',()=>{
 const bundle=readFileSync(new URL('../public/assets/index-BQGspy0I.js',import.meta.url),'utf8');
 for(const [key,label] of Object.entries(EMPLOYEE_POSITION_LABELS))assert.ok(bundle.includes(`${key}:"${label}"`),key);
 for(const [key,label] of Object.entries(EMPLOYEE_POSITION_LABELS).filter(([key])=>key!=='other')){
  assert.equal(importedEmployeePosition('  '+label.toUpperCase()+'  ')?.position,key);
  assert.equal(importedEmployeePosition(key)?.position,key);
 }
 assert.deepEqual(importedEmployeePosition('  Старший бариста  '),{position:'other',customPositionLabel:'Старший бариста'});
 for(const v of ['', '  ', 'other', 'Другое'])assert.equal(importedEmployeePosition(v),null);
});
test('real CSV repeat, custom/standard titles, blank validation and access isolation',async()=>{const r=await fixture();try{
 const accessBefore=JSON.stringify(r.sqlite.prepare('SELECT * FROM venue_memberships').all());
 const rows=['one,Анна, ОФИЦИАНТ ','two,Борис,Старший бариста','three,Владелец только по должности,owner','empty,Пустая,','other,Без названия,Другое'];
 const csv='external_id,name,position\n'+rows.join('\n');
 const first=await r.api.importFile.POST(r.fileRequest(csv));assert.equal(first.status,201);const body=await first.json() as any;
 assert.equal(body.run.errors.length,2,JSON.stringify(body));
 const saved=await r.read();assert.equal(saved.length,3);assert.equal(saved.find(x=>x.name==='Анна').position,'waiter');assert.equal(saved.find(x=>x.name==='Борис').customPositionLabel,'Старший бариста');assert.equal(saved.find(x=>x.name.startsWith('Владелец')).position,'owner');assert.ok(saved.every(x=>!('role' in x)));
 await r.api.importFile.POST(r.fileRequest(csv));assert.deepEqual(await r.read(),saved);
 assert.equal(JSON.stringify(r.sqlite.prepare('SELECT * FROM venue_memberships').all()),accessBefore);
 const user2=await r.register('other-employee-import@local.test');const response=await r.api.storeKey.GET(r.request(user2,'/api/store/bd_employees'),{params:Promise.resolve({key:'bd_employees'})} as never);assert.equal((await response.json() as any).data,null);
 // Update the same external ID: blank optional title preserves a known existing title, not an empty Other.
 const update=await r.api.importFile.POST(r.fileRequest('external_id,name,position\none,Анна обновлена,'));assert.equal(update.status,201);const after=await r.read();assert.equal(after.length,3);assert.equal(after.find(x=>x.externalId==='one').position,'waiter');assert.equal(after.find(x=>x.externalId==='one').id,saved.find(x=>x.externalId==='one').id);
}finally{r.close()}});

test('historical role-only import is readable in both GETs without database writes or overriding manual positions',async()=>{const r=await fixture();try{
 const account=Number(r.sqlite.prepare('SELECT data_account_id id FROM venues WHERE id=?').get(r.user.activeVenueId)!.id);
 const originals=[{id:'legacy',venueId:r.user.activeVenueId,name:'Вера Импорт Тест',role:'Бариста',externalId:'team-import-test-2610',externalSystem:'Учебный CSV — проверка импорта'}, {id:'manual',venueId:r.user.activeVenueId,name:'Manual',role:'owner'}, {id:'already',venueId:r.user.activeVenueId,position:'cook',role:'Бариста',externalId:'other',externalSystem:'CSV'}];
 r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?)').run(account,'bd_employees',JSON.stringify(originals));
 const before=r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all();
 const data=await r.read();assert.equal(data[0].position,'other');assert.equal(data[0].customPositionLabel,'Бариста');assert.equal(data[1].position,undefined);assert.equal(data[2].position,'cook');
 const all=await r.api.storeAll.GET(r.request(r.user,'/api/store'));assert.deepEqual((await all.json() as any).entries.bd_employees.data,data);
 assert.deepEqual(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all(),before);
}finally{r.close()}});
