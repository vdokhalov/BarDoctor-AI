import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {confirmedLineIds} from '../lib/bardoctor/pos-preparation';
const source=readFileSync('public/cashier.js','utf8');
const helpers=source.match(/  const sentLines=.*\n  const wholeOrderCancellationBlocked=.*\n/)![0];
const blocked=runInNewContext(helpers+'\nwholeOrderCancellationBlocked');
for(const [name,order,expected] of [
 ['unconfirmed',{lines:[{id:'a'}]},false],
 ['confirmed',{lines:[{id:'a'}],preparationTickets:[{lines:[{lineId:'a'}]}]},true],
 ['partially cancelled',{lines:[{id:'a',quantity:1}],preparationTickets:[{lines:[{lineId:'a',quantity:2}]}]},true],
 ['empty with history',{lines:[],preparationTickets:[{lines:[{lineId:'a'}]}]},false],
 ['only unconfirmed additions remain',{lines:[{id:'b'}],preparationTickets:[{lines:[{lineId:'a'}]}]},false],
] as const)test(name+' matches authoritative remaining-line restriction',()=>{
 assert.equal(blocked(order),expected);
 const ids=confirmedLineIds(order as never);assert.equal(blocked(order),order.lines.some(l=>ids.has(l.id)));
});
