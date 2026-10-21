function bdUseShiftCases() {
 const search=ste(),scope=Pt(Wm),query=new URLSearchParams(search),enabled=query.has('workday'),date=query.get('workday')||'',venue=query.get('workdayVenue')||'';
 const key=scope+'|'+venue+'|'+date,[state,setState]=S.useState(null),[revision,setRevision]=S.useState(0);
 const valid=/^\d{4}-\d{2}-\d{2}$/.test(date)&&/^[1-9]\d*$/.test(venue);
 S.useEffect(()=>{
  if(!enabled||!valid)return;
  const controller=new AbortController();setState(null);
  fetch('/api/workdays?view=incidents&date='+encodeURIComponent(date)+'&venue='+encodeURIComponent(venue),{credentials:'include',cache:'no-store',headers:ca(Ot()),signal:controller.signal}).then(async response=>{
   const data=await response.json();
   if(!response.ok||!data.ok)throw Error(data.error||(response.status===403?'Нет доступа к происшествиям смены.':'Не удалось загрузить происшествия.'));
   if(String(data.venueId)!==venue||data.date!==date||!Array.isArray(data.incidents))throw Error('Область данных сменилась. Откройте смену заново.');
   if(!controller.signal.aborted)setState({key,cases:data.incidents.map(row=>({...row,type:ka[row.type]?row.type:ka[row.category]?row.category:'other',files:Array.isArray(row.files)?row.files:[],comments:Array.isArray(row.comments)?row.comments:[],timeline:Array.isArray(row.timeline)?row.timeline:[],photos:Array.isArray(row.photos)?row.photos:[]}))});
  }).catch(error=>{if(!controller.signal.aborted)setState({key,error:error.message});});
  return()=>controller.abort();
 },[key,enabled,valid,revision]);
 const current=state?.key===key?state:null;
 const list='/cases?'+new URLSearchParams({venue,workdayVenue:venue,workday:date,...query.has('status')?{status:query.get('status')}:{},...query.has('q')?{q:query.get('q')}:{},...query.has('sort')?{sort:query.get('sort')}:{}}).toString();
 return {enabled,date,cases:current?.cases||[],message:enabled?(!valid?'Некорректная ссылка на смену.':current?.error||(!current?'Загружаем происшествия смены…':'')):'',retry:()=>setRevision(n=>n+1),canRetry:valid&&!!current?.error,list,back:valid?'/shifts?'+new URLSearchParams({venue,workdayVenue:venue,workday:date,month:date.slice(0,7)}):'/shifts',detail:id=>'/cases/'+encodeURIComponent(id)+list.slice(list.indexOf('?'))};
}
function bdShiftCasesState({context}) {
 const [,navigate]=bt();
 const Shell=nt, Content=$e; return <Shell><Content><button type="button" onClick={()=>navigate(context.back)}>Назад к смене</button><h1>Происшествия смены</h1><p role="status">{context.message}</p>{context.canRetry&&<button type="button" onClick={context.retry}>Повторить</button>}</Content></Shell>;
}
