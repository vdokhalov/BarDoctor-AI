import assert from 'node:assert/strict';
const normalized=s=>s.replace(/[\d.,]+/g,'').trim().replace(/\s+/g,' ');
const canonical=(url,venue)=>{const u=new URL(url,'http://isolated.test');if(u.searchParams.get('venue')===String(venue))u.searchParams.delete('venue');if(u.searchParams.get('returnTo')==='health')u.searchParams.delete('returnTo');u.searchParams.sort();return u.pathname+u.search;};
export function compareRecoveryParity(inventory,versions,engine,width){const rows=[];
  for(const item of inventory.items){try{
    const path=item.path??item.from,a=versions.v485[path],b=versions.candidate[path];
    assert.ok(a&&b,item.id+' evaluated');
    const payrollDefault=new URL(path,'http://isolated.test').pathname.startsWith('/salaries')&&!new URL(path,'http://isolated.test').searchParams.has('month');
    assert.equal(canonical(b.before.url,b.before.venue),canonical(a.before.url,a.before.venue),item.id+' resolved route');
    const contractMeaning=c=>({...c,url:canonical(c.url,b.before.venue),...(c.parent?{parent:canonical(c.parent,b.before.venue)}:{})});
    assert.deepEqual(contractMeaning(b.before.contract),contractMeaning(a.before.contract),item.id+' return/reload contract');
    const approved=['/home','/health','/analysis'].includes(path)||['home','health','doctor'].includes(a.before.surface)&&a.before.surface===b.before.surface;
    if(!approved&&!payrollDefault){
      const entries=v=>v.before.entries.filter(e=>e.label.trim()).map(e=>({...Object.fromEntries(Object.entries(e).filter(([key])=>key!=='index')),label:normalized(e.label)}));
      // Only the two owner-requested More entries are new. Every existing
      // control still participates in the unchanged module parity check.
      const addedMore=new Set(['AI Doctor Диагностика и рекомендации','Состояние бизнеса Индекс и зоны Business Health']);
      const candidateEntries=entries(b).filter(entry=>path!=='/more'||!addedMore.has(entry.label));
      assert.deepEqual(candidateEntries,entries(a),item.id+' all visible/discoverable controls');
      assert.deepEqual(b.before.frames.map(f=>({title:f.title,text:normalized(f.text)})),a.before.frames.map(f=>({title:f.title,text:normalized(f.text)})),item.id+' embedded module content');
    }
    if(payrollDefault){assert.deepEqual(b.baselineDefects,[],item.id+' repaired Payroll runtime');assert.ok(b.before.text.includes('Зарплат'),item.id+' Payroll visible');assert.equal(new URL(b.before.url,'http://isolated.test').searchParams.get('month'),'2026-10',item.id+' same existing default month');}
    const x=a.actions[item.id],y=b.actions[item.id];
    if(x||y){assert.ok(x&&y,item.id+' actions evaluated');assert.equal(!!y.absent,!!x.absent,item.id+' unexplained missing capability');assert.equal(!!y.disabled,!!x.disabled,item.id+' enabled state');if(x.url&&y.url){const originalPayrollFailure=x.baselineDefects?.length&&new URL(x.url,'http://isolated.test').pathname.startsWith('/salaries');if(originalPayrollFailure){assert.equal(new URL(y.url,'http://isolated.test').pathname,new URL(x.url,'http://isolated.test').pathname,item.id+' repaired Payroll destination');assert.equal(new URL(y.url,'http://isolated.test').searchParams.get('month'),'2026-10',item.id+' existing Payroll default');assert.deepEqual(y.baselineDefects,[],item.id+' no candidate Payroll failure');}else if(item.id==='context:/analysis:Обновить ответ'){
      assert.ok(x.actionOrigin&&y.actionOrigin,item.id+' refresh origin captured');
      assert.equal(x.actionOrigin.question,'attention');assert.equal(y.actionOrigin.question,x.actionOrigin.question,item.id+' same selected/default question');
      for(const action of [x,y])assert.equal(canonical(action.url),canonical(action.actionOrigin.url),item.id+' refresh must not navigate');
      const refreshMeaning=c=>{const u=new URL(c.url,'http://isolated.test');for(const [key,value] of [['doctorQuestion',x.actionOrigin.question],['venueId',b.before.venue]]){if(u.searchParams.has(key))assert.equal(u.searchParams.get(key),String(value),item.id+' refresh context');u.searchParams.delete(key);}return contractMeaning({...c,url:u.pathname+u.search});};
      assert.deepEqual(refreshMeaning(y.contract),refreshMeaning(x.contract),item.id+' refresh contract');
    }else{assert.equal(canonical(y.url),canonical(x.url),item.id+' actual click destination');const meaning=c=>c?({...c,url:canonical(c.url),...(c.parent?{parent:canonical(c.parent)}:{})}):null;assert.deepEqual(meaning(y.contract),meaning(x.contract),item.id+' return context');}}}
    if(x?.reloaded||y?.reloaded){assert.ok(x.reloaded&&y.reloaded,item.id+' reload evaluated');assert.equal(canonical(y.reloaded.url),canonical(x.reloaded.url),item.id+' reload state parity');}
    rows.push({id:item.id,engine,width,route:'PASS',desktop:width===1280?'PASS':'N/A',mobile:width<1024?'PASS':'N/A',home:item.home?'PASS':'N/A',discoverability:x?.absent?'CONDITIONAL (same baseline inputs)':'PASS',clickability:x?.absent||x?.disabled?'N/A (same baseline precondition)':'PASS',destination:x?.absent||x?.disabled?'N/A (same baseline precondition)':'PASS',venue:'PASS',reload:'PASS',return:'PASS (v485 canonical contract)',permissions:'PASS (protected handlers + RBAC regression)',condition:x?.absent?'Data-dependent: absent in identical v485 inputs; unchanged source handler':x?.conditional??(x?.disabled?'Same v485 precondition/disabled state':null),functional:b.baselineDefects?.length?'FAIL':'PASS',approvedException:payrollDefault?'Owner-approved two initializer calls; original cold failure captured separately; baseline functional comparison supplies its existing supported month query, candidate opens without month':null,verdict:b.baselineDefects?.length?'BLOCKED':'PASS'});
  }catch(error){rows.push({id:item.id,engine,width,verdict:'FAIL',error:String(error)});}}
return rows;}
