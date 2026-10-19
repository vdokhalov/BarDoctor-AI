(() => {
  'use strict';
  const $=id=>document.getElementById(id), endpoint='/api/migration/pos-backup';
  const identity=()=>[localStorage.getItem('bd_session'),localStorage.getItem('bd_session_token'),localStorage.getItem('bd_active_venue_id')].join(':');
  const initialIdentity=identity();let state=null,busy=false,receipt=null,loop=false,stop=false;
  const notice=text=>{$('notice').textContent=text};
  function context(){if(identity()!==initialIdentity)throw Error('Аккаунт или заведение изменились. Перезагрузите страницу.');}
  function render(){const run=state?.run,phase=run?.phase;const allowed=!!state&&!busy&&!loop;$('controls').hidden=!state;$('status').disabled=busy||loop;$('stop').disabled=!loop;
    $('details').textContent=state?`Заведение: ${state.scope.venueId}; аккаунт данных: ${state.scope.accountId}\nФаза: ${phase||'не начато'}; пауза: ${run?.paused?'включена':'выключена'}\nRun ID: ${run?.run_id||'—'}\nSHA256 копии: ${run?.backup_hash||'—'}\nPOS: ${state.pos?.state||'исходное хранилище'}`:'';
    if(state?.progress)$('details').textContent+='\nПрогресс: '+JSON.stringify(state.progress);
    if(state?.preflight)$('details').textContent+='\nПредварительная проверка (без паузы): '+JSON.stringify(state.preflight,null,2);
    $('prepare').disabled=!(allowed&&(!run||phase==='ABORTED')&&$('ready').checked&&state.preflight?.ready);
    $('resume').disabled=!(allowed&&phase==='CAPTURE');$('download').disabled=!(allowed&&run?.backup_hash);
    $('abort').disabled=!(allowed&&run?.paused&&state.pos?.state!=='active');
    $('receipt').disabled=!(allowed&&phase==='BACKED_UP');$('attest').disabled=!(allowed&&phase==='BACKED_UP'&&receipt);
    $('step').disabled=!(allowed&&['REHEARSED','COPYING','CUTOVER'].includes(phase));
  }
  async function request(action,preflight=false){context();const headers={'X-Venue-Id':'3389'};const email=localStorage.getItem('bd_session'),token=localStorage.getItem('bd_session_token');if(email&&token){headers['X-Session-Email']=email;headers['X-Session-Token']=token;}if(action)headers['Content-Type']='application/json';
    const response=await fetch(endpoint+(preflight?'?preflight=1':''),{method:action?'POST':'GET',headers,credentials:'same-origin',cache:'no-store',...(action?{body:JSON.stringify({venueId:3389,accountId:148,confirmation:'QA3389_ACCOUNT_BACKUP_AND_POS_CUTOVER',action,runId:state?.run?.run_id,...(action==='attest_local_rehearsal'?{receipt}:{})})}:{})});context();
    if(!response.ok){let code;try{code=(await response.json()).code}catch{}throw Error(code||`HTTP ${response.status}`);}return response.json();
  }
  async function perform(action,preflight=false){if(busy)return;busy=true;render();try{const result=await request(action,preflight);state=result;if(state.scope?.venueId!==3389||state.scope?.accountId!==148)throw Error('Неверная область данных');receipt=null;$('receipt').value='';notice('Статус подтверждён сервером. '+(state.run?.phase==='COMPLETE'?'Перенос завершён, пауза снята.':''));}catch(e){state=null;receipt=null;notice(`${e.message}. Операция могла начаться: нажмите «Проверить доступ и статус». При активной паузе продолжите или отмените её.`);}finally{busy=false;render();}}
  $('status').onclick=()=>perform(null,true);$('ready').onchange=render;
  async function continueStage(action){if(busy||loop||!state?.run)return;const phase=state.run.phase;loop=true;stop=false;try{do{const revision=state?.run?.revision;await perform(action);if(stop||!state||state.run.phase!==phase||!(state.run.revision>revision))break;}while(true);}finally{loop=false;render();}}
  $('stop').onclick=()=>{stop=true;notice('После текущего запроса продолжение остановится. Пауза сохраняется; проверьте статус перед отменой.');};
  for(const [id,action] of Object.entries({prepare:'prepare',resume:'resume_backup',abort:'abort',attest:'attest_local_rehearsal',step:'step'}))$(id).onclick=()=>['resume_backup','step'].includes(action)?continueStage(action):perform(action);
  $('download').onclick=()=>{if(busy||loop||!state?.run?.backup_hash)return;try{context();const params=new URLSearchParams({attachment:'1',venueId:'3389',accountId:'148',runId:state.run.run_id,hash:state.run.backup_hash});const a=document.createElement('a');a.href=endpoint+'?'+params.toString();a.download='qa3389-business-backup.ndjson';a.rel='noreferrer';document.body.appendChild(a);a.click();a.remove();notice('Стандартная загрузка запрошена. Проверьте файл в загрузках браузера. При отказе авторизации войдите заново обычным способом; перенос не запускается.');}catch(e){notice(e.message)}};
  $('receipt').onchange=async()=>{receipt=null;const file=$('receipt').files[0];try{if(!file||file.size>16000)throw Error('Выберите квитанцию JSON до 16 КБ');const value=JSON.parse(await file.text());context();if(value.format!=='qa3389-parts-receipt-v1'||value.backupHash!==state?.run?.backup_hash||!['node-sqlite-file-r2'].includes(value.engine)||['restore','migration','rollback'].some(k=>value[k]!=='PASS'))throw Error('Квитанция не подтверждает восстановление текущей копии');receipt=value;notice('Квитанция выбрана. Подтвердите выполненное восстановление.');}catch(e){notice(e.message)}render();};
  render();
})();
