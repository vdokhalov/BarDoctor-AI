(()=>{
 const $=id=>document.getElementById(id),message=$('message');
 async function api(path,method='GET',body){const headers={'Content-Type':'application/json'},email=localStorage.getItem('bd_session'),token=localStorage.getItem('bd_session_token'),venue=localStorage.getItem('bd_active_venue_id');if(email&&token){headers['X-Session-Email']=email;headers['X-Session-Token']=token;}if(venue)headers['X-Venue-Id']=venue;const r=await fetch(path,{method,headers,cache:'no-store',...(body?{body:JSON.stringify(body)}:{})});let data;try{data=await r.json();}catch{}if(!r.ok)throw Error(data?.error||'Доступ запрещён или сессия завершена.');return data;}
 async function action(task){message.textContent='';try{await task();}catch(e){message.textContent=e.message;}}
 function button(text,fn){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=()=>action(async()=>{b.disabled=true;try{await fn();}finally{b.disabled=false;}});return b;}
 function employeeOptions(select,employees){
  select.replaceChildren(new Option('Выберите сотрудника',''));
  for(const employee of employees)select.append(new Option(employee.name,employee.employee_id));
 }
 async function refresh(){
  const data=await api('/api/staff-pin/members');$('controls').hidden=false;$('members').replaceChildren();
  const available=data.employees.filter(employee=>!data.members.some(member=>member.employee_id===employee.employee_id));
  employeeOptions($('employee'),available);
  for(const member of data.members){
   const row=document.createElement('p'),label=document.createElement('span');
   const employee=data.employees.find(employee=>employee.employee_id===member.employee_id);
   label.textContent=(employee?.name||member.name)+' · '+(member.login||'Логин не назначен')+' · '+(member.pin_active?'PIN активен':'PIN не активен')+' ';
   row.append(label);
   if(!member.employee_active){
    const note=document.createElement('span');note.textContent=member.employee_id?'Связь со штатом неактивна или неоднозначна. Новая выдача недоступна.':'Не связан со штатом. Существующий доступ сохранён; новая выдача требует связи.';row.append(note);
    if(!member.employee_id&&member.status==='active'){
     const select=document.createElement('select');select.setAttribute('aria-label','Штатный сотрудник для '+member.name);employeeOptions(select,available);row.append(select);
     row.append(button('Связать с сотрудником',async()=>{
      if(!select.value)throw Error('Выберите сотрудника из штата.');
      if(!confirm('Подтвердите, что этот доступ принадлежит выбранному сотруднику. История операций и PIN сохранятся.'))return;
      await api('/api/staff-pin/members','POST',{action:'link',membershipId:member.id,employeeId:select.value});await refresh();
     }));
    }
   }else{
    row.append(button(member.login?'Изменить логин':'Назначить логин',async()=>{const login=prompt('Логин: 3–32 латинских символа, цифры, точка, дефис или подчёркивание. Смена логина завершит сессии.',member.login||'');if(login===null)return;await api('/api/staff-pin/members','POST',{action:'login',membershipId:member.id,login});await refresh();}));
    if(member.login)row.append(button(member.pin_active?'Сбросить PIN':'Выдать PIN',async()=>{if(member.pin_active&&!confirm('Прежний PIN и его сессии перестанут работать. Сбросить?'))return;const result=await api('/api/staff-pin/members','POST',{action:'issue',membershipId:member.id});$('pin').textContent=result.pin;$('secret').showModal();await refresh();}));
   }
   if(member.pin_active)row.append(button('Отозвать',async()=>{if(!confirm('Отозвать PIN и все его сессии?'))return;await api('/api/staff-pin/members','POST',{action:'revoke',membershipId:member.id});await refresh();}));
   $('members').append(row);
  }
 }
 $('close').onclick=()=>{$('pin').textContent='';$('secret').close();};$('secret').addEventListener('close',()=>{$('pin').textContent='';});
 $('create').onsubmit=event=>{event.preventDefault();action(async()=>{const form=new FormData(event.target);await api('/api/staff-pin/members','POST',{action:'create',employeeId:form.get('employeeId'),jobTitle:form.get('jobTitle'),login:form.get('login')});event.target.reset();await refresh();});};
 action(refresh);
})();
