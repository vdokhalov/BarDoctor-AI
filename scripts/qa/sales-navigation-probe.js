/* QA-only probe: injected by Playwright, never included in application HTML. */
(() => {
  const emit = (kind, detail = {}) => window.__bdPerfObserve({kind, at:performance.timeOrigin+performance.now(), frame:location.pathname+location.search, top:window===window.top, ...detail}).catch(()=>{});
  document.addEventListener('pointerdown', e=>emit('T0:pointer',{control:e.target.closest('button,a')?.id||e.target.tagName}),true);
  document.addEventListener('click', e=>emit('T1:click',{control:e.target.closest('button,a')?.id||e.target.tagName}),true);
  document.addEventListener('DOMContentLoaded',()=>{const n=performance.getEntriesByType('navigation')[0];emit('T4:dom',{navigation:n?{start:performance.timeOrigin+n.fetchStart,response:performance.timeOrigin+n.responseStart,committed:performance.timeOrigin+n.domInteractive}:null})},{once:true});
  for(const method of ['pushState','replaceState']){const original=history[method];history[method]=function(...args){emit('T2:history',{method,target:String(args[2]||'')});return original.apply(this,args)}}
  window.addEventListener('popstate',()=>emit('history:popstate'));
  const oldFetch=window.fetch;window.fetch=async function(input,init){const url=new URL(typeof input==='string'?input:input.url,location.href),path=url.pathname;emit('T5:fetch',{path,method:init?.method||'GET'});try{const response=await oldFetch.apply(this,arguments);emit('T6:fetch',{path,status:response.status,serverTiming:response.headers.get('Server-Timing')});return response}catch(e){emit('T6:fetch-error',{path});throw e}};
  const get=Storage.prototype.getItem;Storage.prototype.getItem=function(key){if(String(key).startsWith('bd_pos_draft')||String(key).startsWith('bd_pos_pending'))emit('draft:read',{storage:this===localStorage?'local':'session'});return get.apply(this,arguments)};
  try{new PerformanceObserver(list=>list.getEntries().forEach(e=>emit('longtask',{duration:e.duration}))).observe({type:'longtask',buffered:true})}catch{/* WebKit may not expose Long Tasks. */}
  let queued=false,previous='',lastFeedback='';const scan=()=>{queued=false;if(!document.body)return;
    const notice=document.querySelector('#notice'),pending=document.querySelector('#sales-navigation-status');
    const state={pane:document.body.classList.contains('pos-order-view')?'order':'menu',view:document.querySelector('[data-sales-view][aria-current=page]')?.dataset.salesView,lines:document.querySelectorAll('.pos-line').length,warehouse:!!document.querySelector('.bd-warehouse-movement-list'),notice:notice?.textContent||'',pending:pending?.textContent||'',cashier:!!document.querySelector('#cashier:not([hidden])'),shift:!!document.querySelector('#work:not([hidden]) .cash-shift'),manual:!!document.querySelector('#sale:not([hidden]) select option[value]:not([value=""])'),journal:document.querySelector('#journal-count')?.textContent||'',venue:document.querySelector('#journal-venue')?.textContent||'',receipt:!!document.querySelector('#receipt:not([hidden])'),document:!!document.querySelector('dialog[open] .pos-event-summary')};
    const key=JSON.stringify(state);if(key!==previous){previous=key;emit('ui:state',state)};
    if(typeof window.bdNavigate==='function'&&!window.bdNavigate.__perf){const original=window.bdNavigate;const wrapped=function(target){emit('T2:bridge',{target});return original.apply(this,arguments)};wrapped.__perf=true;window.bdNavigate=wrapped;}
  };
  new MutationObserver(()=>{const feedback=document.querySelector('#sales-navigation-status')?.textContent||'';if(feedback&&feedback!==lastFeedback){lastFeedback=feedback;emit('ui:feedback',{text:feedback})}if(!queued){queued=true;requestAnimationFrame(scan)}}).observe(document,{subtree:true,childList:true,attributes:true,characterData:true});
})();
