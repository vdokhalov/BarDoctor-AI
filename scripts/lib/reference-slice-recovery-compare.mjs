import assert from 'node:assert/strict';
import {releasedScope,releasedEntries,releasedReportContract,releasedReportAction,assertSalesEntry,releasedViewport} from './released-reports-more-parity.mjs';
import {releasedModuleScope,releasedModuleEntries,releasedModuleContract,releasedModuleFrame,releasedModuleAction,releasedRemoval,assertReleasedPlacement} from './released-module-parity.mjs';
const normalized=s=>s.replace(/[\d.,]+/g,'').trim().replace(/\s+/g,' ');
const canonical=(url,venue)=>{const u=new URL(url,'http://isolated.test');if(u.searchParams.get('venue')===String(venue))u.searchParams.delete('venue');if(u.searchParams.get('returnTo')==='health')u.searchParams.delete('returnTo');u.searchParams.sort();return u.pathname+u.search;};
export function compareRecoveryParity(inventory,versions,engine,width){const rows=[];
  for(const item of inventory.items){try{
    if(versions.capture||engine==='chromium')assert.deepEqual(versions.capture,{engine,width},'observations belong to the requested engine and width');
    const path=item.path??item.from,a=versions.v485[path],b=versions.candidate[path];
    assert.ok(a&&b,item.id+' evaluated');
    const released=releasedScope(path,a.before,engine,width),moduleRelease=releasedModuleScope(path,a.before,engine,width),releaseApplied=released||moduleRelease;
    if(moduleRelease)assertReleasedPlacement(path,b,versions);
    if(released&&path==='/more')assertSalesEntry(b,b.before.venue);
    const payrollDefault=new URL(path,'http://isolated.test').pathname.startsWith('/salaries')&&!new URL(path,'http://isolated.test').searchParams.has('month');
    assert.equal(canonical(b.before.url,b.before.venue),canonical(a.before.url,a.before.venue),item.id+' resolved route');
    const contractMeaning=c=>({...c,url:canonical(c.url,b.before.venue),...(c.parent?{parent:canonical(c.parent,b.before.venue)}:{})});
    assert.deepEqual(contractMeaning(b.before.contract),contractMeaning(released?releasedReportContract(a.before.contract):moduleRelease?releasedModuleContract(a.before.contract):a.before.contract),item.id+' return/reload contract');
    const approved=['/home','/health','/analysis'].includes(path)||['home','health','doctor'].includes(a.before.surface)&&a.before.surface===b.before.surface;
    const recoveredCashier=item.id==='route:/cashier'&&path==='/cashier';
    if(recoveredCashier){
      const rejection={status:409,code:'SALES_EVENT_STORE_NEEDS_REVIEW',visible:true,ledgerUnchanged:true};
      assert.deepEqual(a.cashierRejection,rejection,'historical cashier rejects incomplete fixture sale');
      assert.deepEqual(b.cashierRejection,rejection,'recovered cashier retains visible, read-only rejection');
      assert.deepEqual(b.cashierReturn,{visible:true,href:'/sales-import',destination:'/sales-import'},'recovered cashier journal return is functional');
    }
    const teamCopy=text=>path==='/team-access'?text.replace(normalized('Сотрудник кассы Работа только в кассе: заказы и свои чеки. Управление сменой и отмены доступны старшим.'),normalized('Кассир Просмотр смен и проведение продаж в кассе без отмены проведённых операций.')):text;
    if(!approved&&!payrollDefault&&!recoveredCashier){
      const entries=v=>v.before.entries.filter(e=>e.label.trim()).map(e=>({...Object.fromEntries(Object.entries(e).filter(([key])=>key!=='index')),label:teamCopy(normalized(e.label))}));
      // Only the two owner-requested More entries are new. Every existing
      // control still participates in the unchanged module parity check.
      // The existing More renderer sets aria-label to the title only.
      const addedMore=new Set(['AI Doctor','Состояние бизнеса']);
      const candidateEntries=entries(b).filter(entry=>path!=='/more'||!(addedMore.has(entry.label)&&entry.tag==='BUTTON'&&!entry.nav&&!entry.disabled&&!entry.href));
      assert.deepEqual(candidateEntries,released?releasedEntries(path,entries(a),b.before.venue):moduleRelease?releasedModuleEntries(path,entries(a),b.before.venue,width):entries(a),item.id+' all visible/discoverable controls');
      assert.deepEqual(b.before.frames.map(f=>({title:f.title,text:teamCopy(normalized(f.text))})),a.before.frames.map(f=>({title:f.title,text:moduleRelease?releasedModuleFrame(path,teamCopy(normalized(f.text))):teamCopy(normalized(f.text))})),item.id+' embedded module content');
    }
    if(payrollDefault){assert.deepEqual(b.baselineDefects,[],item.id+' repaired Payroll runtime');assert.ok(b.before.text.includes('Зарплат'),item.id+' Payroll visible');assert.equal(new URL(b.before.url,'http://isolated.test').searchParams.get('month'),'2026-10',item.id+' same existing default month');}
    const reportReturn=releasedViewport(engine,width)&&['context:/finance:Месячный отчёт','context:/finance/settings:Перейти к месячному отчёту'].includes(item.id);
    const y=b.actions[item.id],original=a.actions[item.id];
    const x=released?releasedReportAction(item,original,y,b.before.venue,canonical):moduleRelease?releasedModuleAction(item,original,y,b,versions,canonical):original;
    if(x||y){assert.ok(x&&y,item.id+' actions evaluated');assert.equal(!!y.absent,!!x.absent,item.id+' unexplained missing capability');assert.equal(!!y.disabled,!!x.disabled,item.id+' enabled state');if(x.url&&y.url){const originalPayrollFailure=x.baselineDefects?.length&&new URL(x.url,'http://isolated.test').pathname.startsWith('/salaries');if(originalPayrollFailure){assert.equal(new URL(y.url,'http://isolated.test').pathname,new URL(x.url,'http://isolated.test').pathname,item.id+' repaired Payroll destination');assert.equal(new URL(y.url,'http://isolated.test').searchParams.get('month'),'2026-10',item.id+' existing Payroll default');assert.deepEqual(y.baselineDefects,[],item.id+' no candidate Payroll failure');}else if(item.id==='context:/analysis:Обновить ответ'){
      assert.ok(x.actionOrigin&&y.actionOrigin,item.id+' refresh origin captured');
      assert.equal(x.actionOrigin.question,'attention');assert.equal(y.actionOrigin.question,x.actionOrigin.question,item.id+' same selected/default question');
      for(const action of [x,y])assert.equal(canonical(action.url),canonical(action.actionOrigin.url),item.id+' refresh must not navigate');
      const refreshMeaning=c=>{const u=new URL(c.url,'http://isolated.test');for(const [key,value] of [['doctorQuestion',x.actionOrigin.question],['venueId',b.before.venue]]){if(u.searchParams.has(key))assert.equal(u.searchParams.get(key),String(value),item.id+' refresh context');u.searchParams.delete(key);}return contractMeaning({...c,url:u.pathname+u.search});};
      assert.deepEqual(refreshMeaning(y.contract),refreshMeaning(x.contract),item.id+' refresh contract');
    }else{assert.equal(canonical(y.url),canonical(x.url),item.id+' actual click destination');const meaning=c=>c?({...c,url:canonical(c.url),...(c.parent?{parent:canonical(c.parent)}:{})}):null;assert.deepEqual(meaning(y.contract),meaning((released||reportReturn)?releasedReportContract(x.contract):x.contract),item.id+' return context');}}}
    if(x?.reloaded||y?.reloaded){assert.ok(x.reloaded&&y.reloaded,item.id+' reload evaluated');assert.equal(canonical(y.reloaded.url),canonical(x.reloaded.url),item.id+' reload state parity');if(reportReturn){assert.equal(y.reloaded.venue,b.before.venue,item.id+' Reports reload venue');assert.deepEqual(contractMeaning(y.reloaded.contract),contractMeaning(releasedReportContract(x.reloaded.contract)),item.id+' Reports reload return context');}}
    const movedCost=item.id==='home:Cost correction',removal=moduleRelease?releasedRemoval(item):null;
    if(movedCost)assert.deepEqual(b.approvedCostPlacement,{approval:'v503',homeAbsent:true,healthVisible:true,healthOutsideClosedDisclosure:true},'v503 cost placement must be verified in browser');
    rows.push({id:item.id,engine,width,route:'PASS',desktop:width===1280?'PASS':'N/A',mobile:width<1024?'PASS':'N/A',home:movedCost?'REMOVED (owner-approved v503)':item.home?'PASS':'N/A',discoverability:removal??(movedCost?'PASS (Health)':x?.absent?'CONDITIONAL (same baseline inputs)':'PASS'),clickability:removal?'N/A (released relocation/removal; replacement verified)':x?.absent||x?.disabled?'N/A (same baseline precondition)':'PASS',destination:removal?'PASS (replacement verified)':x?.absent||x?.disabled?'N/A (same baseline precondition)':'PASS',venue:'PASS',reload:removal?.startsWith('REMOVED:')?'N/A (removed control)':removal?'PASS (More Sales replacement)':'PASS',return:releaseApplied?'PASS (v517 scoped contract)':'PASS (v485 canonical contract)',permissions:'PASS (protected handlers + RBAC regression)',condition:removal??(x?.absent?'Data-dependent: absent in identical v485 inputs; unchanged source handler':x?.conditional??(x?.disabled?'Same v485 precondition/disabled state':null)),functional:b.baselineDefects?.length?'FAIL':'PASS',approvedException:moduleRelease?(removal??'Exact v517 released controls/contract/copy; independently audited engine/viewport owner fixture; source provenance and negative controls pinned'):released?'Released v517 Reports/More; October owner fixture, independently audited engine/viewport; new controls and measured action/reload required':recoveredCashier?'Recovered POS presentation; measured same visible409 rejection without ledger changes; successful POS workflow has a separate mandatory browser gate':movedCost?'Home mount removed in v503; cost verified visible on Health':payrollDefault?'Owner-approved two initializer calls; original cold failure captured separately; baseline functional comparison supplies its existing supported month query, candidate opens without month':null,verdict:b.baselineDefects?.length?'BLOCKED':'PASS'});
  }catch(error){rows.push({id:item.id,engine,width,verdict:'FAIL',error:String(error)});}}
return rows;}
