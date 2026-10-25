import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parse} from 'acorn';
function simple(node,visitors){if(!node||typeof node!=='object')return;visitors[node.type]?.(node);for(const child of Object.values(node)){if(Array.isArray(child))child.forEach(x=>simple(x,visitors));else if(child&&typeof child==='object')simple(child,visitors);}}
const source=fs.readFileSync(new URL('../public/assets/index-BQGspy0I.js',import.meta.url),'utf8');
const values=[];simple(parse(source,{ecmaVersion:'latest',sourceType:'module'}),{Property(node){if(node.key.name==='children'&&node.value.type==='ConditionalExpression')values.push(source.slice(node.value.start,node.value.end));}});
const evaluate=(text,e,ready=true)=>new Function('e','bdCanPostV357','bdBlockingTextV357','return ('+text+')')(e,ready,'Проверьте позиции');
const note=values.find(x=>x.includes('Сохранятся цены поставщика. Прихода и долга не будет.'));
const footer=values.find(x=>x.includes('Цены будут сохранены'));
test('price list explains supplier prices without receipt/debt, draft and edit',()=>{assert.ok(note);assert.ok(footer);for(const status of ['draft','confirmed']){const doc={documentType:'price_list',status};assert.equal(evaluate(note,doc),'Сохранятся цены поставщика. Прихода и долга не будет.');assert.equal(evaluate(footer,doc),'Цены будут сохранены');}});
test('receipt/invoice copy stays intact when switching back',()=>{for(const documentType of ['receipt','invoice']){const doc={documentType,status:'draft'};assert.match(evaluate(note,doc),/Долг поставщику появится/);assert.equal(evaluate(footer,doc),'Склад и себестоимость обновятся после проведения');assert.equal(evaluate(footer,{...doc,status:'confirmed'}),'Изменения будут пересчитаны');}});
test('validation guidance still takes priority over save reassurance',()=>{assert.equal(evaluate(footer,{documentType:'price_list'},false),'Проверьте позиции');});
