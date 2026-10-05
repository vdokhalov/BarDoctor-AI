type Row = Record<string, unknown>;
type Envelope = {success?:boolean;error?:string;data?:{businessHealthSnapshot?:{venueId:string;managementQueue?:Row[];managementTopActions?:Row[];managementCoverage?:Row}};verification?:{result:string;message:string;context:Row;target?:unknown}};
type Runtime = {headers:()=>HeadersInit;venue:()=>number;navigate:(path:string)=>void;commit:(value:Envelope)=>void};

export function managementActionContext(rawSearch:string,venue:number) {
  const params=new URLSearchParams(rawSearch),id=params.get('healthAction');
  return {id,active:!!id&&params.getAll('healthAction').length===1&&params.getAll('venueId').length===1&&id.startsWith('health:'+venue+':')&&Number(params.get('venueId'))===venue};
}

/** A presentation/navigation adapter over the existing canonical Health read model.
 * Opening a destination never verifies a condition or mutates its source. */
export function createManagementActionsClient(React:typeof import('react'),runtime:Runtime) {
  async function read(path:string,venue:number,signal?:AbortSignal):Promise<Envelope> {
    if(runtime.venue()!==venue)throw Error('Заведение изменилось.');
    const headers=new Headers(runtime.headers());headers.set('X-Venue-Id',String(venue));
    const response=await fetch(path,{headers,cache:'no-store',signal});const value=await response.json() as Envelope;
    if(runtime.venue()!==venue||Number(value.data?.businessHealthSnapshot?.venueId)!==venue)throw Error('Контекст заведения не подтверждён.');
    if(!response.ok||value.success===false)throw Error(value.error||'Проверка недоступна. Повторите.');
    runtime.commit(value);return value;
  }
  const verify=(venue:number,id:string,signal?:AbortSignal)=>read('/api/business-health/verify?actionId='+encodeURIComponent(id),venue,signal);
  function Queue({venue,onNavigate}:{venue:number;onNavigate:(path:string)=>void}) {
    const [state,setState]=React.useState<{venue:number;value:Envelope}|null>(null),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false);
    const epoch=React.useRef(0);
    React.useEffect(()=>{
      const epochHandle=epoch;const controller=new AbortController();setState(null);setError('');
      const refresh=async()=>{const stamp=++epoch.current;setBusy(true);try{
        const checked=new URLSearchParams(window.location.search).get('checkedAction');
        const value=checked?.startsWith('health:'+venue+':')?await verify(venue,checked,controller.signal):await read('/api/business-health',venue,controller.signal);
        if(stamp===epoch.current){setState({venue,value});setError('');}
      }catch(e){if(stamp===epoch.current&&!controller.signal.aborted)setError(e instanceof Error?e.message:'Проверка недоступна.');}finally{if(stamp===epoch.current)setBusy(false)}};
      void refresh();const listener=()=>void refresh();
      for(const event of ['bd:store-updated','bd:shift-closed','bd-cost-projection-updated','bd-cost-management-refresh','focus'])window.addEventListener(event,listener);
      return()=>{epochHandle.current++;controller.abort();for(const event of ['bd:store-updated','bd:shift-closed','bd-cost-projection-updated','bd-cost-management-refresh','focus'])window.removeEventListener(event,listener)};
    },[venue]);
    const value=state?.venue===venue?state.value:null,items=value?.data?.businessHealthSnapshot?.managementTopActions||[];
    return <section className="bd-cost-management bd-management-queue" aria-label="Приоритеты управления" data-management-venue={venue}>
      <h2>Что сделать первым</h2>{busy&&!value&&<p role="status">Обновляем управленческую очередь…</p>}
      {error&&<p role="alert">{error} Порядок пока не подтверждён.</p>}
      {value?.verification&&<p role="status" data-management-verification={value.verification.result}>{value.verification.message} Следующий приоритет — ниже.</p>}
      <ol>{items.map((item,index)=>{const target=item.target as {path:string;label:string}|null;return <li key={String(item.recommendationId)} data-management-id={String(item.managementId??item.recommendationId)} data-management-priority={String(item.priority)}>
        <strong>{index+1}. {String(item.title)}</strong><p>{String(item.managementPriorityReason??item.reason)}</p>
        <details open={index===0}><summary>Почему и что делать</summary><p>{String(item.fact||item.consequence||'Основание требует проверки.')}</p><p>Если отложить: {String(item.consequence||'Отклонение останется без подтверждённого результата.')}</p><p>{String(item.action||'Проверьте основание сигнала.')}</p><small>{String(item.whyNow||'Срок не назначен.')}</small></details>
        {target?<button type="button" onClick={()=>onNavigate(target.path)}>{target.label} →</button>:<p>Точное место исправления не подтверждено. Уточните основание сигнала.</p>}
      </li>})}</ol>
      {value&&!items.length&&<p>Подтверждённых действий в очереди нет. Проверьте доступность источников ниже.</p>}
      {value?.data?.businessHealthSnapshot?.managementCoverage?.tasks!=="AVAILABLE"&&value&&<small>Не все источники поручений доступны. Очередь может быть неполной.</small>}
      {value?.data?.businessHealthSnapshot?.managementCoverage?.cost==="PARTIAL"&&<small>Проверка себестоимости охватывает часть позиций.</small>}
    </section>;
  }
  function useContext({venue,ready,onOpen}:{venue:number;query:string;ready:boolean;onOpen:(context:Row)=>void}) {
    // The legacy router query is already decoded. Parse the raw URL once.
    const {id,active}=managementActionContext(window.location.search,venue);
    const [message,setMessage]=React.useState(''),[busy,setBusy]=React.useState(false),[retry,setRetry]=React.useState(0),epoch=React.useRef(0),open=React.useRef(onOpen);open.current=onOpen;
    const returnQueue=React.useCallback(()=>runtime.navigate('/health?venueId='+venue+'&checkedAction='+encodeURIComponent(id||'')),[venue,id]);
    React.useEffect(()=>{
      setMessage('');if(!active||!ready)return;
      const epochHandle=epoch;const controller=new AbortController();let opened=false;
      const check=async(afterSave=false)=>{const stamp=++epoch.current;setBusy(true);try{
        const value=await verify(venue,id!,controller.signal);if(stamp!==epoch.current||controller.signal.aborted)return;
        setMessage(value.verification?.message||'Проверка недоступна.');
        if(value.verification?.result==='ACTIVE'&&value.verification.target&&!opened){opened=true;open.current(value.verification.context);}
        if(afterSave&&value.verification?.result==='CONDITION_CLEARED')returnQueue();
      }catch(e){if(stamp===epoch.current&&!controller.signal.aborted)setMessage(e instanceof Error?e.message:'Проверка недоступна. Исправление не подтверждено.');}finally{if(stamp===epoch.current)setBusy(false)}};
      void check();const listener=()=>void check(true);
      for(const event of ['bd:store-updated','bd:shift-closed'])window.addEventListener(event,listener);
      return()=>{epochHandle.current++;controller.abort();for(const event of ['bd:store-updated','bd:shift-closed'])window.removeEventListener(event,listener)};
    // The editor callback is a ref: store refresh must not reopen the editor.
    },[venue,id,active,ready,retry,returnQueue]);
    const banner=id?<section className="bd-cost-management" data-management-context={id} aria-label="Возврат к приоритетам"><strong>Business Health → исправление</strong><p role="status">{active?message||'Проверяем текущую проблему…':'Контекст другого заведения. Откройте действие из его Business Health.'}</p><button type="button" disabled={busy||!active} onClick={returnQueue}>Вернуться и проверить</button><button type="button" disabled={busy||!active} onClick={()=>setRetry(v=>v+1)}>Повторить проверку</button></section>:null;
    return {active,banner};
  }
  return {Queue,useContext};
}
