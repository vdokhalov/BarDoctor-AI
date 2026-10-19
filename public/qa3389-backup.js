(() => {
  'use strict';
  const $=id=>document.getElementById(id), endpoint='/api/migration/pos-backup';
  const identity=()=>[localStorage.getItem('bd_session'),localStorage.getItem('bd_session_token'),localStorage.getItem('bd_active_venue_id')].join(':');
  const initialIdentity=identity();let state=null,busy=false,receipt=null;
  const notice=text=>{$('notice').textContent=text};
  function context(){if(identity()!==initialIdentity)throw Error('Аккаунт или заведение изменились. Перезагрузите страницу.');}
  function render(){const run=state?.run,phase=run?.phase;const allowed=!!state&&!busy;$('controls').hidden=!state;$('status').disabled=busy;
    $('details').textContent=state?`Заведение: ${state.scope.venueId}; аккаунт данных: ${state.scope.accountId}\nФаза: ${phase||'не начато'}; пауза: ${run?.paused?'включена':'выключена'}\nRun ID: ${run?.run_id||'—'}\nSHA256 копии: ${run?.backup_hash||'—'}\nPOS: ${state.pos?.state||'исходное хранилище'}`:'';
    $('prepare').disabled=!(allowed&&(!run||phase==='ABORTED')&&$('ready').checked);
    $('resume').disabled=!(allowed&&phase==='CAPTURE');$('download').disabled=!(allowed&&run?.backup_hash);
    $('abort').disabled=!(allowed&&run?.paused&&state.pos?.state!=='active');
    $('receipt').disabled=!(allowed&&phase==='BACKED_UP');$('attest').disabled=!(allowed&&phase==='BACKED_UP'&&receipt);
    $('step').disabled=!(allowed&&['REHEARSED','COPYING','CUTOVER'].includes(phase));
  }
  async function request(action,download=false){context();const headers={'X-Venue-Id':'3389'};const email=localStorage.getItem('bd_session'),token=localStorage.getItem('bd_session_token');if(email&&token){headers['X-Session-Email']=email;headers['X-Session-Token']=token;}if(action)headers['Content-Type']='application/json';
    const response=await fetch(endpoint+(download?'?download=1':''),{method:action?'POST':'GET',headers,credentials:'same-origin',cache:'no-store',...(action?{body:JSON.stringify({venueId:3389,accountId:148,confirmation:'QA3389_ACCOUNT_BACKUP_AND_POS_CUTOVER',action,runId:state?.run?.run_id,...(action==='attest_local_rehearsal'?{receipt}:{})})}:{})});context();
    if(!response.ok){let code;try{code=(await response.json()).code}catch{}throw Error(code||`HTTP ${response.status}`);}return download?response.blob():response.json();
  }
  async function perform(action,download=false){if(busy)return;busy=true;render();try{const result=await request(action,download);if(download){const url=URL.createObjectURL(result),a=document.createElement('a');a.href=url;a.download='qa3389-business-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);notice('Скачивание запрошено. Проверьте наличие приватного файла; перенос ещё не разрешён.');}else{state=result;if(state.scope?.venueId!==3389||state.scope?.accountId!==148)throw Error('Неверная область данных');receipt=null;$('receipt').value='';notice('Статус подтверждён сервером. '+(state.run?.phase==='COMPLETE'?'Перенос завершён, пауза снята.':''));}}catch(e){state=null;receipt=null;notice(`${e.message}. Операция могла начаться: нажмите «Проверить доступ и статус». При активной паузе продолжите или отмените её.`);}finally{busy=false;render();}}
  $('status').onclick=()=>perform();$('ready').onchange=render;
  for(const [id,action] of Object.entries({prepare:'prepare',resume:'resume_backup',abort:'abort',attest:'attest_local_rehearsal',step:'step'}))$(id).onclick=()=>perform(action);
  $('download').onclick=()=>perform(null,true);
  $('receipt').onchange=async()=>{receipt=null;const file=$('receipt').files[0];try{if(!file||file.size>16000)throw Error('Выберите квитанцию JSON до 16 КБ');const value=JSON.parse(await file.text());context();if(value.format!=='qa-pos-rehearsal-v2'||value.backupHash!==state?.run?.backup_hash||!['workerd-d1','node-sqlite-file-r2'].includes(value.engine)||['restore','migration','rollback'].some(k=>value[k]!=='PASS'))throw Error('Квитанция не подтверждает восстановление текущей копии');receipt=value;notice('Квитанция выбрана. Подтвердите выполненное восстановление.');}catch(e){notice(e.message)}render();};
  render();
})();
