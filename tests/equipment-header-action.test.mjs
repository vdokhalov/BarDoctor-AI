import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('public/app-shell-v185.js','utf8');
const start=source.indexOf('    syncAction(config) {'),end=source.indexOf('\n    setConfig(config)',start);
function fixture(path='/equipment'){
 let current=null,proxy=null,clicks=[];
 const trailing={querySelector:()=>proxy,appendChild(value){proxy=value}};
 const context={window:{location:{pathname:path}},document:{querySelector(selector){return current&&current.selector===selector?current:null}},makeIconButton(original){return {click(){original.click()},remove(){proxy=null}}},explicitAction:()=>null,genericAction:()=>null};
 const header=vm.runInNewContext('new (class {'+source.slice(start,end)+'})()',context);header.querySelector=()=>trailing;
 const button=(id,detail=false)=>({id,isConnected:true,selector:detail?'[data-bd-equipment-detail] .bd-eq-detail-header-v167 button[aria-label="Редактировать"]':'.bd-eq-add-icon-v167',click(){clicks.push(id)}});
 return {header,context,button,clicks,get proxy(){return proxy},set current(value){current=value},sync(){header.syncAction({variant:'detail',screenType:'detail'})}};
}
test('list-to-detail cannot retain detached add handler',()=>{const f=fixture(),add=f.button('add');f.current=add;f.sync();f.context.window.location.pathname='/equipment/a';f.sync();assert.equal(f.proxy,null);add.isConnected=false;f.current=f.button('edit-a',true);f.sync();f.proxy.click();assert.deepEqual(f.clicks,['edit-a'])});
test('replacement card rebinds edit handler even with same route',()=>{const f=fixture('/equipment/a');f.current=f.button('old',true);f.sync();f.current=f.button('new',true);f.sync();f.proxy.click();assert.deepEqual(f.clicks,['new'])});
test('unchanged live source does not recreate proxy on observer refresh',()=>{const f=fixture('/equipment/a');f.current=f.button('edit',true);f.sync();const previous=f.proxy;f.sync();assert.equal(f.proxy,previous)});
test('missing or unauthorized card removes action; return restores add',()=>{const f=fixture('/equipment/a');f.current=f.button('edit',true);f.sync();f.current=null;f.sync();assert.equal(f.proxy,null);f.context.window.location.pathname='/equipment';f.current=f.button('add');f.sync();f.proxy.click();assert.deepEqual(f.clicks,['add'])});
test('detached source cannot supply an action',()=>{const f=fixture('/equipment/a'),button=f.button('edit',true);button.isConnected=false;f.current=button;f.sync();assert.equal(f.proxy,null)});
