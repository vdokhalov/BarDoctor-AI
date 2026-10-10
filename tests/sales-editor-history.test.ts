import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function setup({owned=true,dirty=false,allow=true}={}) {
 const source=readFileSync('public/sales-import.js','utf8');
 const body=source.slice(source.indexOf('  function closeEditor(force)'),source.indexOf('  function header(',source.indexOf('  function closeEditor(force)')));
 const state={dirty,batch:{id:'original'},mode:'edit',editorHistoryClosing:false};
 let backs=0,closes=0,confirmations=0;
 const editor={open:true,close(){this.open=false;closes++;}};
 const context=vm.createContext({state,editor,history:{state:owned?{salesEditor:true}:{},back(){backs++;}},setDirty(value:boolean){state.dirty=value;},confirm(){confirmations++;return allow;}});
 vm.runInContext(body,context);
 return {state,editor,close(force=false){context.closeEditor(force);},counts(){return {backs,closes,confirmations};}};
}
test('explicit editor close removes its history entry once before closing the dialog',()=>{
 const r=setup();r.close();r.close();
 assert.deepEqual(r.counts(),{backs:1,closes:0,confirmations:0});
 assert.equal(r.editor.open,true);assert.deepEqual(r.state.batch,{id:'original'});
 r.close(true);
 assert.deepEqual(r.counts(),{backs:1,closes:1,confirmations:0});
 assert.equal(r.state.batch,null);assert.equal(r.state.editorHistoryClosing,false);
});
test('cancelled discard preserves editor, data and history',()=>{
 const r=setup({dirty:true,allow:false});r.close();
 assert.deepEqual(r.counts(),{backs:0,closes:0,confirmations:1});
 assert.equal(r.state.dirty,true);assert.deepEqual(r.state.batch,{id:'original'});
});
test('accepted discard confirms once while the history transition is pending',()=>{
 const r=setup({dirty:true});r.close();r.close();r.close(true);
 assert.deepEqual(r.counts(),{backs:1,closes:1,confirmations:1});assert.equal(r.state.dirty,false);
});
test('closing without an owned history entry never traverses browser history',()=>{
 const r=setup({owned:false});r.close();
 assert.deepEqual(r.counts(),{backs:0,closes:1,confirmations:0});assert.equal(r.editor.open,false);
});
