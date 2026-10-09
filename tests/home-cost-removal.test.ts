import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

test('Home removes only the cost component mount from the deployed v502 client',()=>{
  const previous=execFileSync('git',['show','772ceee943028b9982b53c957b6472d09cd180e4:public/assets/index-BQGspy0I.js'],{encoding:'utf8',maxBuffer:64*1024*1024});
  const mount='i.jsx(bdCostHomePhase4a,{onNavigate:g}),';
  assert.equal(previous.split(mount).length,2);
  assert.equal(readFileSync('public/assets/index-BQGspy0I.js','utf8'),previous.replace(mount,''));
  // Includes byte identity of Health, Doctor, other Home priorities and the cost module.
});
