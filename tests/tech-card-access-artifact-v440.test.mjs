import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const bundlePath=new URL('../public/assets/index-BQGspy0I.js',import.meta.url);
test('access and taxonomy patches replay without duplicate helpers or losing final handlers',()=>{
 const scripts=['patch-menu-consumption-sot-v418.mjs','patch-menu-edit-actions-v435.mjs','patch-legacy-consumption-normalization-v436.mjs','patch-edit-form-actions-v438.mjs','patch-editor-standard-v439.mjs','patch-tech-card-access-v440.mjs','patch-menu-taxonomy-v440.mjs'];
 const apply=()=>{for(const file of scripts){const result=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/'+file,import.meta.url))],{encoding:'utf8'});assert.equal(result.status,0,result.stderr)}};
 apply();const before=fs.readFileSync(bundlePath,'utf8');apply();const after=fs.readFileSync(bundlePath,'utf8');
 assert.equal(after,before);
 for(const name of ['bdEditableRecipesV440','bdExistingRecipeEditorV440','bdMenuTaxonomyRequestV440','bdIngredientReferencePatchV440'])assert.equal(after.split('function '+name+'(').length-1,1,name);
 assert.ok(after.includes('if(!c.synced||w.status==="confirmed"&&!p)'),'draft stays open on failed sync');
 assert.ok(after.includes('onClick:()=>{bdMenuCloseV435()&&bdMenuOpenRecipeV440()}'),'menu transition uses existing dirty confirmation');
 assert.ok(after.includes('bdIngredientReferenceConflictV440(p,n)||'),'conflicts block confirmation');
 assert.ok(after.includes('const bdRecipeSourceChangedV442=bdUseRecipeRefreshV442(t,r,bdTechDirtyRefV438,bdRecipeSavingRefV418,u,f)'),'editor subscribes to fresh source without remounting');
 assert.ok(after.includes('E=async p=>{if(bdRecipeSourceChangedV442)'),'both saves guard against a changed source');
 assert.ok(after.includes('resolutionStatus:bdIngredientReferenceConflictV440(p,n)?"reference_conflict":"linked_ready"'),'unit conversion does not clear an unresolved reference conflict');
});
