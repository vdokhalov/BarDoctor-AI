function bdTermsEntryUrl(page="terms"){const q=new URLSearchParams({from:'about'}),venue=new URLSearchParams(location.search).get('venue')||localStorage.getItem('bd_active_venue_id');if(/^[1-9]\d*$/.test(venue||''))q.set('venue',venue);return (page==='privacy'?'/privacy?':'/terms?')+q}
function bdTermsBackUrl(){const q=new URLSearchParams(location.search),signedIn=Boolean(Ot()&&gz()),target=signedIn?'/about':q.get('from')==='register'?'/register':'/login',venue=q.get('venue');return target+(signedIn&&/^[1-9]\d*$/.test(venue||'')?'?venue='+encodeURIComponent(venue):'')}
function bdMenuFromNomenclature(item){
 const source=new URL(location.href),key=String(bdWarehouseKey(item)||''),venue=source.searchParams.get('venue')||localStorage.getItem('bd_active_venue_id'),q=new URLSearchParams({tab:'menu',q:String(item?.name||''),returnTo:'nomenclature',returnItem:key});
 for(const [from,to]of [['view','returnView'],['q','returnQ']])if(source.searchParams.has(from))q.set(to,source.searchParams.get(from));
 if(/^[1-9]\d*$/.test(venue||''))q.set('venue',venue);
 source.searchParams.set('item',key);const state={...history.state};state.bdTransientLayer=null;state.bdTransientVersion=null;history.replaceState(state,'',source.pathname+source.search);
 return '/catalog?'+q;
}

function bdPrivacyBackUrl(){const from=new URLSearchParams(location.search).get("from");return from==="login"?"/login":from==="register"?"/register":bdTermsBackUrl()}
