import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { patchMonthlyReasonsV515 } from '../scripts/patch-monthly-reasons-v515.mjs';
const source=fs.readFileSync('scripts/fragments/monthly-report-v165.fragment.txt','utf8');
const c=vm.createContext({URL,Set,Number,i:{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}});vm.runInContext(source,c);
const render=(reasons,reasonDetails=[])=>c.bdMonthlyPendingReasonsV513({reasons,reasonDetails,monthKey:'2026-09',venueId:901});
const text=node=>node==null?'':typeof node==='string'?node:typeof node==='number'?String(node):Array.isArray(node)?node.map(text).join(' '):text(node.props?.children);
const links=node=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(links):[...(node.type==='a'?[node.props.href]:[]),...links(node.props?.children)];
test('every emitted finance/cost/month-close reason has a distinct human description and safe contextual action',()=>{
 const codes=new Set(['REVENUE_OR_CURRENCY','PAYROLL','EXPENSES_OR_CURRENCY']);
 for(const file of ['financial-reconciliation.ts','verified-month-close.ts'])for(const match of fs.readFileSync('lib/bardoctor/'+file,'utf8').matchAll(/(?:fail\(|reasons\.push\()"([A-Z_]+)"/g))codes.add(match[1]);
 for(const code of codes){const tree=render([code]);assert.doesNotMatch(text(tree),/Неподтверждённое условие/,code);const urls=links(tree);assert.ok(urls.length,code);for(const path of urls){const url=new URL(path,'https://qa.test');assert.equal(url.origin,'https://qa.test');assert.equal(url.searchParams.get('venue'),'901');assert.equal(url.searchParams.get('month'),'2026-09');}}
 const tree=render([...codes]);assert.equal(tree.props.children[1].props.children.length,codes.size);
 const descriptions=tree.props.children[1].props.children.map(row=>text(row.props.children[0]));assert.equal(new Set(descriptions).size,codes.size);
});
test('unknown codes remain explicit and distinct; duplicate identical codes only collapse',()=>{
 const tree=render(['FUTURE_REASON_A','FUTURE_REASON_B','FUTURE_REASON_A']);assert.match(text(tree),/FUTURE_REASON_A/);assert.match(text(tree),/FUTURE_REASON_B/);assert.equal(tree.props.children[1].props.children.length,2);
});
test('diagnostic links reject external/command paths and override foreign context without rendering raw ids or amounts',()=>{
 const tree=render(['PAYROLL'],[{code:'PAYROLL',recordId:'hidden-id',date:'2026-08-31',outsidePeriod:true,amount:987654,href:'/salaries?venue=999&month=2020-01'},{code:'PAYROLL',href:'https://evil.test/finance'},{code:'PAYROLL',href:'/api/store/bd_inventory_snapshots?delete=1'}]);
 assert.match(text(tree),/2026-08-31/);assert.match(text(tree),/за пределами/);assert.doesNotMatch(text(tree),/hidden-id|987654/);
 for(const href of links(tree)){assert.doesNotMatch(href,/evil|\/api\/|999|2020/);assert.match(href,/venue=901/);}
 assert.equal(c.bdMonthlyReasonLinkV515('/finance','2026-09',NaN),null);
});
test('no reasons renders nothing; labels do not derive financial numbers or change calculation',()=>{assert.equal(render([]),null);assert.doesNotMatch(source.slice(source.indexOf('const bdMonthlyReasonCatalogV515'),source.indexOf('function bdMonthlyReportPage')),/costOfGoods\s*=|finalProfit\s*=|fetch\(/);});
test('wizard reasons are in scroll body, use current server metadata and preserve closed report fields; patch replay stable',()=>{
 const bundle=fs.readFileSync('public/assets/index-BQGspy0I.js','utf8'),after=patchMonthlyReasonsV515(bundle);assert.equal(patchMonthlyReasonsV515(after),after);assert.match(after,/_verificationReasonsV515:current.reasons/);assert.match(after,/closed\?\.status!=="closed"/);assert.match(after,/reasons:n\._verificationReasonsV515/);
});
test('reasons are rendered for a loaded zero-data month independently of financial-data branch',()=>{
 assert.match(source,/report && i\.jsx\(bdMonthlyPendingReasonsV513/);
 const marker=source.indexOf('report && i.jsx(bdMonthlyPendingReasonsV513'),branch=source.indexOf('!report ? i.jsxs("section"',marker);
 assert.ok(marker>0&&branch>marker);assert.equal((source.match(/reasons: verified\.reasons/g)||[]).length,1);
 assert.equal(render(['PAYROLL']).props['data-bd-monthly-blockers'],'v515');
});
