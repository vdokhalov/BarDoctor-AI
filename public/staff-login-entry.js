(()=>{
 function offer(){if(!['/','/login'].includes(location.pathname)||new URLSearchParams(location.search).has('management'))return;
 const password=document.querySelector('input[type="password"]');if(!password||document.getElementById('staff-login-entry'))return;
 const form=password.closest('form')||password.parentElement;const link=document.createElement('a');link.id='staff-login-entry';link.href='/login';link.textContent='Вход сотрудника · логин и PIN';form.after(link);}
 new MutationObserver(offer).observe(document.body,{childList:true,subtree:true});offer();
})();
