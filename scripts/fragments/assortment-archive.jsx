function bdArchiveUrl(kind,changes={}){
 const u=new URL(location.href);u.pathname=kind==='menu'?'/catalog':'/nomenclature';
 for(const [key,value] of Object.entries(changes))value==null?u.searchParams.delete(key):u.searchParams.set(key,String(value));
 return u.pathname+u.search;
}
function bdPositionArchive({kind}){
 const Shell=nt,Container=$e,Header=bdAccountingHeader;
 const [,navigate]=bt(),locationQuery=ste(),context=bdUseProcVenueContextV168(),{isReady}=Ai();
 const params=new URLSearchParams(locationQuery),query=params.get('q')||'',venue=Number(context.activeVenueId),token=Ot(),scope=venue+':'+token;
 const [state,setState]=S.useState({scope:'',status:'loading',items:[]}),[retry,setRetry]=S.useState(0),[busy,setBusy]=S.useState(''),[notice,setNotice]=S.useState('');
 const generation=S.useRef(0),current=S.useRef(scope),pending=S.useRef(false);current.current=scope;
 S.useEffect(()=>{const id=++generation.current,abort=new AbortController();pending.current=false;setBusy('');setNotice('');setState({scope,status:'loading',items:[]});
 if(!isReady||!venue||!token)return;
 fetch('/api/assortment/archive?kind='+kind,{headers:{...ca(token),'x-venue-id':String(venue)},cache:'no-store',signal:abort.signal}).then(async r=>{const data=await r.json();if(!r.ok||!data.ok||Number(data.venueId)!==venue)throw Error();if(id===generation.current&&current.current===scope)setState({scope,status:'ready',items:data.items,canRestore:data.canRestore});}).catch(error=>{if(error.name!=='AbortError'&&id===generation.current&&current.current===scope)setState({scope,status:'error',items:[]});});return()=>{abort.abort();generation.current++};
 },[scope,isReady,kind,retry]);
 const ready=state.scope===scope&&state.status==='ready',items=ready?state.items.filter(item=>String(item.name).toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru'))):[];
 async function restore(item){if(pending.current||!ready)return;pending.current=true;setBusy(item.id);setNotice('');const id=generation.current;
 try{const response=await fetch('/api/assortment/archive',{method:'POST',headers:{...ca(token),'x-venue-id':String(venue),'Content-Type':'application/json'},body:JSON.stringify({kind,id:item.id})});const data=await response.json();if(!response.ok||!data.ok||Number(data.venueId)!==venue)throw Error(data.error||'Не удалось восстановить. Попробуйте ещё раз.');if(current.current!==scope||id!==generation.current)return;
 setState(old=>({...old,items:old.items.filter(row=>row.id!==item.id)}));setNotice('«'+item.name+'» восстановлена');
 // Refresh the scoped store through the existing provider before returning to its original card.
 const updated=await Yse('bd_assortment_v1',token).catch(()=>undefined);if(current.current===scope&&id===generation.current&&updated!==undefined){Vm('bd_assortment_v1',updated);Kse('bd_assortment_v1',updated);}
 }catch(error){if(current.current===scope&&id===generation.current)setNotice('Не удалось восстановить. Попробуйте ещё раз.');}finally{if(current.current===scope&&id===generation.current){pending.current=false;setBusy('');}}}
 const back=()=>navigate(bdArchiveUrl(kind,{view:kind==='menu'?null:'all',q:params.get('activeQ'),activeQ:null}));
 return <Shell showBottomNav={true} className="pb-32"><Container className="pt-0"><Header title="Архив" back={bdArchiveUrl(kind,{view:kind==='menu'?null:'all',q:params.get('activeQ'),activeQ:null})}/><main className="bd-position-archive"><h2>{kind==='menu'?'Архив меню':'Архив номенклатуры'}</h2><input aria-label="Поиск в архиве" placeholder="Найти позицию…" value={query} onChange={event=>navigate(bdArchiveUrl(kind,{q:event.target.value||null}))}/>{notice&&<p role="status">{notice}</p>}{!ready?(state.scope===scope&&state.status==='error'?<div role="alert">Не удалось загрузить архив. <button onClick={()=>setRetry(value=>value+1)}>Повторить</button></div>:<p role="status">Загрузка…</p>):items.length?<div className="bd-archive-list">{items.map(item=><article key={item.id}><strong>{item.name}</strong>{state.canRestore&&<button disabled={!!busy} onClick={()=>restore(item)}>{busy===item.id?'Восстанавливаем…':'Восстановить'}</button>}</article>)}</div>:<p>{query?'Ничего не найдено':'Архив пуст'}</p>}<button className="bd-archive-back" onClick={back}>К активным позициям</button></main></Container></Shell>;
}
function bdArchiveCatalogPage(){const query=ste();return new URLSearchParams(query).get('view')==='archive'?i.jsx(bdPositionArchive,{kind:'menu'}):i.jsx(bdAssortmentCommandPageV170,{})}
function bdArchiveNomenclaturePage(){const query=ste();return new URLSearchParams(query).get('view')==='archive'?i.jsx(bdPositionArchive,{kind:'inventory'}):i.jsx(bdNomenclaturePage,{})}
