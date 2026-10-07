import test from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createIntelligenceUI} from '../lib/bardoctor/client/intelligence-ui';
import type {BusinessHealthSnapshot} from '../lib/bardoctor/business-health-snapshot';
const {Score}=createIntelligenceUI(React);
const snapshot=(overrides:Partial<BusinessHealthSnapshot>={})=>({score:95,status:'critical',statusLabel:'Критично',factorScores:[],managementCoverage:{tasks:'PARTIAL'},dataFreshness:{fresh:1,aging:0,stale:1,missing:0},period:{startDate:'2026-10-01',endDate:'2026-10-03'},confidenceLevel:'low',...overrides}) as BusinessHealthSnapshot;

test('score presentation follows authoritative category, retains STALE and PARTIAL with high score',()=>{
 const html=renderToStaticMarkup(React.createElement(Score,{snapshot:snapshot(),home:true,onNavigate:()=>{}}));
 assert.match(html,/data-score-category="critical"/);assert.match(html,/data-score-freshness="STALE"/);
 assert.match(html,/>95</);assert.match(html,/>Критично<\/p>/);assert.match(html,/Данные устарели/);assert.match(html,/Частичные данные/);
 assert.doesNotMatch(html,/VERIFIED/);
});
test('missing score has no numeric arc and does not become zero',()=>{
 const html=renderToStaticMarkup(React.createElement(Score,{snapshot:snapshot({score:null,status:'insufficient_data',statusLabel:'Недостаточно данных'}),onNavigate:()=>{}}));
 assert.match(html,/Индекс не рассчитан/);assert.match(html,/Не рассчитан/);assert.doesNotMatch(html,/bd-score-fill/);assert.doesNotMatch(html,/>0</);
});
test('all existing server categories stay named; client does not recompute a band',()=>{
 for(const status of ['healthy','attention','critical','insufficient_data'] as const){const html=renderToStaticMarkup(React.createElement(Score,{snapshot:snapshot({status}),onNavigate:()=>{}}));assert.ok(html.includes(`data-score-category="${status}"`));}
});

test('a snapshot without confirmed freshness renders UNKNOWN, never CURRENT',()=>{
 const html=renderToStaticMarkup(React.createElement(Score,{snapshot:snapshot({dataFreshness:null as never}),home:true,onNavigate:()=>{}}));
 assert.match(html,/data-score-freshness="UNKNOWN"/);assert.match(html,/Свежесть данных неизвестна/);assert.match(html,/>Критично<\/p>/);assert.doesNotMatch(html,/data-score-freshness="CURRENT"/);
});
