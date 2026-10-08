import type { CostEpisodeV1, CostObservationV1, CostVerificationV1 } from '../management-cost-contracts';
import type { EvidenceReference } from '../evidence-contracts';
import { readCanonicalJson } from './canonical-read';

type Episode = CostEpisodeV1 & { menuItemName?:string; why: string[]; effect: string; targets: {health:string;techCard:string;purchase?:string} };
type Payload = {ok:boolean;error?:string;code?:string;items?:Episode[];episode?:Episode;currentObservation?:CostObservationV1;itemName?:string;coverage?:string;nextCursor?:string|null;evaluationCursor?:string|null};
type Runtime = {headers:()=>HeadersInit;venue:()=>number;navigate:(path:string)=>void;enabled:()=>boolean};
/** React is supplied by the prepared client; keep its existing renderer/hooks. */
export function createCostManagementClient(React: typeof import('react'), runtime: Runtime) {
  const disabled=new Set<number>();const pending=new Map<number,Promise<Payload>>(),covered=new Map<number,Set<string>>();
  const checkScope=(venue:number)=>{if(runtime.venue()!==venue)throw new Error('Заведение изменилось. Откройте сигнал в нужном заведении.');};
  async function request(path:string,venue:number,body?:object,signal?:AbortSignal):Promise<Payload> {
    checkScope(venue);
    const headers=new Headers(runtime.headers());headers.set('X-Venue-Id',String(venue));if(body)headers.set('Content-Type','application/json');
    const {response,value}=await readCanonicalJson<Payload>(path,headers,signal,{method:body?'POST':'GET',body:body?JSON.stringify(body):undefined});
    checkScope(venue);if(value.code==='FEATURE_DISABLED'){disabled.add(venue);covered.delete(venue);window.dispatchEvent(new CustomEvent('bd-cost-projection-updated'));}
    if(!response.ok||value.ok===false)throw new Error(value.error||'Проверка пока недоступна. Повторите.');
    if(value.episode&&value.episode.scope.venueId!==venue)throw new Error('Не удалось подтвердить заведение сигнала.');
    return value;
  }
  async function load(venue:number,evaluationCursor?:string):Promise<Payload> {
    if(pending.has(venue))return pending.get(venue)!;
    const promise=(async()=>{
      let page=await request('/api/management/cost-signals/evaluate',venue,evaluationCursor?{cursor:evaluationCursor}:{});
      let continuation=page.nextCursor;
      // At most two bounded commands per refresh, including tracked deletions.
      if(continuation&&JSON.parse(continuation).phase==='tracked'){page=await request('/api/management/cost-signals/evaluate',venue,{cursor:continuation});continuation=page.nextCursor;}
      page=await request('/api/management/cost-signals?state=all',venue);
      const all=page.items||[];
      const active=all.filter(e=>e.condition==='ACTIVE');const nextCovered=new Set(active.map(e=>e.menuItemId));if([...nextCovered].sort().join("\0")!==[...(covered.get(venue)||[])].sort().join("\0")){covered.set(venue,nextCovered);window.dispatchEvent(new CustomEvent("bd-cost-projection-updated"));}
      return {...page,items:all,evaluationCursor:continuation};
    })();pending.set(venue,promise);try{return await promise}finally{pending.delete(venue)}
  }
  const notify=()=>window.dispatchEvent(new CustomEvent('bd-cost-management-refresh'));
  const format=(value:CostVerificationV1['after'])=>value.status==='UNKNOWN'?'Не рассчитана (UNKNOWN)':`${new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(value.value!)} ${value.currency||''}`;
  function Result({result}:{result:CostVerificationV1}) {return <section className="bd-cost-result" aria-label="Контроль результата" data-verification-id={result.verificationId}><h3>Проверено: себестоимость рассчитана</h3><p>Было: {format(result.before)}</p><p>Стало: <strong>{format(result.after)}</strong></p><small>Проверено {new Date(result.checkedAt).toLocaleString('ru-RU')}</small><p>Проверка текущей техкарты. Влияние действия на прибыль не доказано.</p></section>}
  function Evidence({reference,venue}:{reference:EvidenceReference;venue:number}) {
    const [status,setStatus]=React.useState(''),[busy,setBusy]=React.useState(false);
    return <div><button type="button" disabled={busy} onClick={async()=>{setBusy(true);try{checkScope(venue);const response=await fetch('/api/evidence/resolve?ref='+encodeURIComponent(JSON.stringify(reference)),{headers:{...runtime.headers(),'X-Venue-Id':String(venue)},cache:'no-store'});const value=await response.json() as {outcome?:string};checkScope(venue);setStatus(response.ok&&value.outcome==='resolved'?'Источник проверен; запись соответствует основанию расчёта.':value.outcome==='changed'?'Источник изменился. Обновите проверку.':'Источник сейчас не удалось подтвердить.')}catch{setStatus('Источник сейчас не удалось подтвердить.')}finally{setBusy(false)}}}>Проверить источник: {reference.partId||reference.id}</button>{status&&<p role="status">{status}</p>}</div>
  }
  function Center({venue,surface,onNavigate,signalId}:{venue:number;surface:'home'|'health';onNavigate:(path:string)=>void;signalId?:string|null}) {
    const [state,setState]=React.useState<{venue:number;data:Payload}|null>(null),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false),[history,setHistory]=React.useState<Episode[]>([]),[historyCursor,setHistoryCursor]=React.useState<string|null>(null),[names,setNames]=React.useState<Record<string,string>>({});
    const epoch=React.useRef(0);const invalidate=React.useCallback(()=>{epoch.current++},[]);const selected=signalId||null;
    const refresh=React.useCallback(async(evaluationCursor?:string)=>{const stamp=++epoch.current;setBusy(true);setError('');try{
      const data=await load(venue,evaluationCursor);if(selected){const detail=await request('/api/management/cost-signals/'+encodeURIComponent(selected),venue);if(detail.episode&&!data.items?.some(e=>e.signalId===selected))data.items=[detail.episode,...data.items||[]];if(detail.itemName)setNames(old=>({...old,[selected]:detail.itemName!}));}
      if(stamp===epoch.current)setState({venue,data});
    }catch(value){if(stamp===epoch.current)setError(value instanceof Error?value.message:'Проверка недоступна.')}finally{if(stamp===epoch.current)setBusy(false)}},[venue,selected]);
    React.useEffect(()=>{setState(null);setHistory([]);setHistoryCursor(null);setNames({});if(runtime.enabled()&&venue>0)void refresh();const listener=()=>void refresh();window.addEventListener('bd-cost-management-refresh',listener);return()=>{window.removeEventListener('bd-cost-management-refresh',listener);invalidate();}},[venue,refresh,invalidate]);
    if(!runtime.enabled()||disabled.has(venue)||!venue)return null;
    const data=state?.venue===venue?state.data:null;
    const all=data?.items||[],active=all.filter(e=>e.condition==='ACTIVE').sort((a,b)=>a.detectedAt.localeCompare(b.detectedAt)||a.menuItemId.localeCompare(b.menuItemId));
    const recent=all.filter(e=>e.condition==='VERIFIED_RESOLVED').sort((a,b)=>b.verificationResult!.checkedAt.localeCompare(a.verificationResult!.checkedAt));
    const detail=selected?all.find(e=>e.signalId===selected):null;
    async function verify(e:Episode){const stamp=++epoch.current;setBusy(true);setError('');try{await request('/api/management/cost-signals/'+encodeURIComponent(e.signalId)+'/verify',venue,{trigger:'OWNER_CHECK'});if(stamp===epoch.current)await refresh()}catch(value){if(stamp===epoch.current){setError(value instanceof Error?value.message:'Проверка недоступна');setBusy(false)}}}
    const remember=(e:Episode)=>sessionStorage.setItem('bd-cost-origin:'+venue+':'+e.signalId,JSON.stringify({surface,scroll:window.scrollY,returnLocation:e.targets.health}));
    const go=(e:Episode)=>{remember(e);onNavigate(e.targets.health)};
    const correct=(e:Episode)=>{remember(e);onNavigate(e.targets.techCard)};
    const purchase=(e:Episode)=>{if(e.targets.purchase){if(surface==='home')remember(e);onNavigate(e.targets.purchase)}};
    if(surface==='home'){
      const partial=!!data?.evaluationCursor||!!data?.nextCursor;
      const state=error?'ERROR':busy&&!data?'LOADING':data?.coverage!=='AVAILABLE'||partial&&!active.length?'INSUFFICIENT_STALE':active.length?'ATTENTION':'STABLE';
      const top=active[0];
      return <section id="management" className="bd-cost-management bd-cost-home-priority" data-cost-venue={venue} data-cost-surface="home" data-cost-state={state} aria-label="Сигналы себестоимости">
        <p className={'bd-cost-home-status is-'+state.toLowerCase()} data-cost-count role="status">{state==='LOADING'?'Проверяем себестоимость…':state==='ERROR'?'Проверка себестоимости недоступна':state==='INSUFFICIENT_STALE'&&!top?'Недостаточно данных для проверки себестоимости':top?'Требует внимания: '+(partial?'≥':'')+active.length+' · Себестоимость':recent.length?'Исправление себестоимости проверено':'Себестоимость: подтверждённых вопросов нет'}</p>
        {partial&&<small className="bd-cost-home-coverage">Проверка охватывает часть позиций. Остальные — в полном Business Health.</small>}
        {error&&<p role="alert">{error} Сигнал не закрыт.</p>}
        {data?.coverage==='UNAVAILABLE'&&<p role="status">Не все источники доступны. Подтверждать исправление пока нельзя.</p>}
        {top&&<article className="bd-cost-home-top" data-top-signal={top.signalId}>
          <button type="button" className="bd-cost-signal bd-cost-home-signal" data-signal-id={top.signalId} onClick={()=>go(top)}>
            <strong>Себестоимость не рассчитана</strong><span className="bd-cost-item-name" title={top.menuItemName||top.menuItemId}>{top.menuItemName||top.menuItemId}</span>
            <span data-cost-why>Почему: {top.why[0]}</span>
            <span className="bd-cost-home-source" data-cost-source>Источник: {top.targets.purchase?'техкарта и закупочная стоимость':'меню и техкарта'} · {new Date(top.latest.asOf).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}. {top.latest.quality.availability==='UNAVAILABLE'?'Данные неполные. ':''}UNKNOWN ≠ 0.</span>
          </button>
          <p className="bd-cost-home-limit" data-cost-limitation>Маржу этой позиции пока нельзя подтвердить.</p>
          <p className="bd-cost-home-next">{top.targets.purchase?`${top.latest.blockingIngredients?.find(row=>row.reason==='PRICE_UNKNOWN')?.name}: подтвердите закупочную стоимость.`:top.latest.reasonCodes.includes('RECIPE_MISSING')?'Создайте техкарту для этой позиции.':top.latest.reasonCodes.includes('RECIPE_EMPTY')?'Добавьте ингредиенты в техкарту.':top.latest.reasonCodes.includes('RECIPE_UNAPPROVED')?'Проверьте и подтвердите техкарту.':'Проверьте техкарту и данные расчёта.'}</p>
          <button type="button" className="bd-cost-home-cta" data-cost-primary-action onClick={()=>top.targets.purchase?purchase(top):correct(top)}>{top.targets.purchase?'Добавить закупку':'Исправить техкарту'} <span aria-hidden="true">→</span></button>
        </article>}
        {!top&&recent.slice(0,1).map(e=><button type="button" className="bd-cost-signal verified" data-signal-id={e.signalId} key={e.signalId} onClick={()=>go(e)}><strong>Проверено: себестоимость рассчитана</strong><span>{e.menuItemName||e.menuItemId} · Было: UNKNOWN · Стало: {format(e.verificationResult!.after)}</span><small>Проверка и история →</small></button>)}
        {error&&<button type="button" disabled={busy} onClick={()=>void refresh()}>Повторить проверку</button>}
      </section>
    }
    return <section id="management" className="bd-cost-management" data-cost-venue={venue} data-cost-surface="health" aria-label="Себестоимость: управление сигналами">
      <header><h2>Себестоимость — проверка и результат</h2><button type="button" disabled={busy} onClick={()=>void refresh()}>Обновить</button></header>
      {busy&&<p role="status">Проверяем данные на сервере…</p>}{error&&<p role="alert">{error} Сигнал не закрыт.</p>}
      {data?.coverage==='UNAVAILABLE'&&<p role="status">Не все источники доступны. Подтверждать исправление пока нельзя.</p>}
      {!busy&&!error&&data?.coverage==='AVAILABLE'&&!active.length&&!recent.length&&!selected&&<p>Нет подтверждённых проблем с обязательной техкартой. Другие проверки доступны ниже.</p>}
      {detail?<article data-signal-id={detail.signalId}>
        <small>{detail.condition==='VERIFIED_RESOLVED'?'Проверено':detail.condition==='NOT_APPLICABLE'?'Больше не применимо':'Нужна проверка'} · эпизод {detail.generation}</small><h3>{names[detail.signalId]||detail.menuItemId}</h3>
        {detail.condition==='VERIFIED_RESOLVED'&&detail.verificationResult?<Result result={detail.verificationResult}/>:detail.condition==='NOT_APPLICABLE'?<p>Позиция больше не требует этой проверки. Это не подтверждение рассчитанной себестоимости.</p>:<p>Себестоимость не рассчитана (UNKNOWN).</p>}
        <details open><summary>{detail.condition==='VERIFIED_RESOLVED'?'Почему требовалась проверка':'Почему BarDoctor показывает это'}</summary>{detail.why.map(reason=><p key={reason}>{detail.condition==='VERIFIED_RESOLVED'?'До проверки: ':''}{reason}</p>)}<p>{detail.effect}</p><p>Проверено {new Date(detail.latest.asOf).toLocaleString('ru-RU')}. {detail.latest.quality.availability==='UNAVAILABLE'?'Данные неполные.':'По сохранённым данным BarDoctor.'}</p></details>
        <details><summary>Данные и источники</summary><p>Текущая техкарта: {detail.latest.recipeId||'отсутствует'}, версия {detail.latest.recipeVersion??'—'}.</p>{detail.latest.evidence.map(ref=><Evidence key={ref.id+':'+ref.partId} reference={ref} venue={venue}/>)}{detail.latest.sourceManifest.map(source=><p key={source.sourceKey}>{({'bd_assortment_v1':'Меню и техкарты','bd_purchase_documents':'Подтверждённые закупки','bd_stock_movements':'Складские движения'} as Record<string,string>)[source.sourceKey]}: {source.present?'источник доступен':'источник отсутствует'}. {source.updatedAt&&'Сохранён '+new Date(source.updatedAt).toLocaleString('ru-RU')}</p>)}</details>
        {detail.condition==='ACTIVE'&&<>
          {!!detail.latest.blockingIngredients?.length&&<section className="bd-cost-ingredients" aria-label="Что мешает расчёту">{detail.latest.blockingIngredients.map((row,index)=><p data-cost-ingredient={row.nomenclatureItemId||row.ingredientId} key={row.ingredientId||index}><strong>{row.name} — {row.reason==='PRICE_UNKNOWN'?'стоимость неизвестна':row.reason==='NOMENCLATURE_MISSING'?'номенклатура не найдена':row.reason==='LINK_MISSING'?'ингредиент не связан с номенклатурой':'требует проверки единицы или количества'}.</strong><br/>{row.reason==='PRICE_UNKNOWN'?'Для расчёта себестоимости нужна подтверждённая закупочная стоимость. Справочная цена и оценка начальных остатков её не заменяют.':row.reason==='NOMENCLATURE_MISSING'||row.reason==='LINK_MISSING'?'Найдите позицию в техкарте или используйте «Создать и добавить».':'Проверьте связь, единицы и количество в техкарте.'}</p>)}{(detail.latest.blockingIngredientsTotal||0)>detail.latest.blockingIngredients.length&&<p>Показаны первые {detail.latest.blockingIngredients.length} из {detail.latest.blockingIngredientsTotal} ингредиентов. Полный состав — в техкарте.</p>}</section>}
          {detail.targets.purchase&&<button type="button" className="primary" data-cost-purchase-action onClick={()=>purchase(detail)}>Добавить закупку</button>}
          <button type="button" className={detail.targets.purchase?'':'primary'} onClick={()=>onNavigate(detail.targets.techCard)}>Открыть техкарту</button><button type="button" disabled={busy} onClick={()=>void verify(detail)}>{busy?'Проверяем…':'Проверить результат'}</button>{detail.verificationStatus==='CANNOT_VERIFY'&&<p role="status">Себестоимость пока не удалось подтвердить. Сигнал остаётся открытым.</p>}
          {sessionStorage.getItem('bd-cost-verification-notice:'+venue+':'+detail.signalId)&&<p role="status">Закупка сохранена. Предыдущая проверка результата была недоступна; повторите проверку.</p>}
        </>}
        <button type="button" onClick={async()=>{const stamp=epoch.current;try{const value=await request('/api/management/cost-signals?state=all&menuItemId='+encodeURIComponent(detail.menuItemId),venue);if(stamp===epoch.current){setHistory(value.items||[]);setHistoryCursor(value.nextCursor||null)}}catch(value){if(stamp===epoch.current)setError((value as Error).message)}}}>История проверки</button>
        {history.map(e=><div key={e.signalId} data-history-signal={e.signalId}><p>Эпизод {e.generation} · {e.condition==='VERIFIED_RESOLVED'?'Проверено':e.condition==='ACTIVE'?'Нужна проверка':'Больше не применимо'}</p>{e.verificationResult&&<Result result={e.verificationResult}/>}</div>)}
        {historyCursor&&<button type="button" onClick={async()=>{const stamp=epoch.current;try{const value=await request('/api/management/cost-signals?state=all&menuItemId='+encodeURIComponent(detail.menuItemId)+'&cursor='+encodeURIComponent(historyCursor),venue);if(stamp===epoch.current){setHistory(old=>[...old,...value.items||[]]);setHistoryCursor(value.nextCursor||null)}}catch(value){if(stamp===epoch.current)setError((value as Error).message)}}}>Предыдущие проверки</button>}
        <button type="button" onClick={()=>onNavigate('/health?venueId='+venue+'&section=management')}>Все сигналы себестоимости</button><button type="button" onClick={()=>{const raw=sessionStorage.getItem('bd-cost-origin:'+venue+':'+detail.signalId);let origin:{surface?:string;scroll?:number}={};try{origin=JSON.parse(raw||'{}')}catch{}onNavigate(origin.surface==='home'?'/home':'/health');if(origin.surface==='home')window.setTimeout(()=>window.scrollTo(0,Number(origin.scroll)||0),100)}}>Назад к обзору</button>
      </article>:<><div>{active.map(e=><button type="button" className="bd-cost-signal" data-signal-id={e.signalId} key={e.signalId} onClick={()=>go(e)}><strong>Себестоимость не рассчитана</strong><span>{e.menuItemName||e.menuItemId} · Нужна проверка</span><span>{e.why[0]}</span></button>)}</div>{recent.slice(0,3).map(e=><button type="button" className="bd-cost-signal verified" data-signal-id={e.signalId} key={e.signalId} onClick={()=>go(e)}><strong>Проверено: себестоимость рассчитана</strong><span>{e.menuItemName||e.menuItemId} · Было: UNKNOWN · Стало: {format(e.verificationResult!.after)}</span><small>Последний проверенный результат: {new Date(e.verificationResult!.checkedAt).toLocaleString('ru-RU')}</small></button>)}</>}
      {data?.evaluationCursor&&<button type="button" disabled={busy} onClick={()=>void refresh(data.evaluationCursor!)}>Проверить следующие позиции</button>}
      {data?.nextCursor&&<button type="button" disabled={busy} onClick={async()=>{try{const more=await request('/api/management/cost-signals?state=all&cursor='+encodeURIComponent(data.nextCursor!),venue);setState({venue,data:{...data,items:[...data.items||[],...more.items||[]],nextCursor:more.nextCursor}})}catch(value){setError((value as Error).message)}}}>Показать ещё сигналы</button>}
    </section>
  }
  /** Context adapter around the existing purchase editor/handlers; no parallel transaction flow. */
  function usePurchaseContext({venue,ready,canManage,onOpen,onClear}:{venue:number;ready:boolean;canManage:boolean;onOpen:()=>void;onClear:()=>void}) {
    const params=new URLSearchParams(window.location.search),active=params.get('costCorrection')==='1',signal=params.get('signalId'),menuId=params.get('menuItemId'),productKey=params.get('productKey'),requestedVenue=Number(params.get('venueId'));
    type Context = {venue:number;signal:string;episode:Episode;ingredient:NonNullable<CostObservationV1['blockingIngredients']>[number]};
    const [state,setState]=React.useState<Context|null>(null),[error,setError]=React.useState(''),[checking,setChecking]=React.useState(false);
    const callbacks=React.useRef({onOpen,onClear});callbacks.current={onOpen,onClear};
    React.useEffect(()=>{let live=true;setState(null);setError('');if(!active)return;callbacks.current.onClear();
      if(!ready)return;
      if(!canManage||requestedVenue!==venue||!signal||!/^cost-v1:[a-f0-9]{64}:[1-9]\d{0,11}$/.test(signal)||!menuId||!productKey){setError('Не удалось подтвердить контекст закупки. Откройте сигнал в исходном заведении.');return;}
      request('/api/management/cost-signals/'+encodeURIComponent(signal),venue).then(data=>{
        if(!live)return;
        const observation=data.currentObservation,ingredient=observation?.blockingIngredients?.find(row=>row.productKey===productKey&&row.reason==='PRICE_UNKNOWN'&&row.nomenclatureItemId&&row.unit);
        if(data.episode?.scope.venueId!==venue||data.episode.menuItemId!==menuId||data.episode.condition!=='ACTIVE'||!ingredient||observation?.quality.freshness!=='CURRENT_READ'||observation.quality.availability==='UNAVAILABLE'){setError('Причина изменилась или стоимость уже доступна. Вернитесь к сигналу и проверьте результат.');return;}
        setState({venue,signal,episode:data.episode,ingredient});callbacks.current.onOpen();
        window.dispatchEvent(new CustomEvent('bd-cost-purchase-context-ready'));
      }).catch(value=>{if(live)setError(value.message)});
      return()=>{live=false};
    },[active,signal,menuId,productKey,requestedVenue,venue,ready,canManage]);
    const assertScope=()=>{checkScope(venue);if(active&&(!state||state.venue!==venue||requestedVenue!==venue))throw new Error('Контекст закупки недоступен. Вернитесь к сигналу.');};
    const target=signal&&requestedVenue===venue?'/health?venueId='+venue+'&signalId='+encodeURIComponent(signal)+'&section=management':'/health?venueId='+venue;
    function returnToSignal(){checkScope(venue);runtime.navigate(target)}
    function prefillDraft(draft:Record<string,unknown>){if(!active)return draft;assertScope();const row=state!.ingredient,items=draft.items as Record<string,unknown>[];return {...draft,venueId:venue,items:[{...items[0],name:row.name,nomenclatureId:row.nomenclatureItemId,nomenclatureItemId:row.nomenclatureItemId,nomenclatureName:row.name,purchaseProductKey:row.productKey,matchedBaseUnit:row.unit,unit:row.unit==='pcs'?'шт.':row.unit,packageSize:row.unit==='pcs'?'1 шт.':row.unit==='kg'?'1 кг':'1 л',unitPrice:'',lineTotal:'',costStatus:'UNKNOWN',requiresReview:false,mappingSource:'manual'}]};}
    function assertSave(draft:Record<string,unknown>){if(active){assertScope();if(Number(draft.venueId)!==venue)throw new Error('Закупка относится к другому заведению.');}}
    function acceptsResponse(savedVenue:number){return !active||runtime.venue()===savedVenue&&savedVenue===venue;}
    async function afterSave(savedVenue:number,document:Record<string,unknown>){if(!active)return false;if(!acceptsResponse(savedVenue))return true;assertScope();setChecking(true);
      try{if(document.status==='confirmed')await request('/api/management/cost-signals/'+encodeURIComponent(state!.signal)+'/verify',venue,{trigger:'OWNER_CHECK'});sessionStorage.removeItem('bd-cost-verification-notice:'+venue+':'+state!.signal)}
      catch{if(runtime.venue()===venue)sessionStorage.setItem('bd-cost-verification-notice:'+venue+':'+state!.signal,'cannot-verify')}
      finally{if(runtime.venue()===venue){setChecking(false);notify();returnToSignal()}}
      return true;
    }
    const scoped=state?.venue===venue&&state.signal===signal?state:null;
    const message=checking?'Закупка сохранена. Проверяем себестоимость на сервере…':error|| (scoped?`${scoped.ingredient.name}: внесите фактическую закупку. Цена остаётся неизвестной до подтверждения и серверной проверки.`:'Проверяем ингредиент и контекст сигнала…');
    const banner=active?<aside className="bd-cost-return" data-cost-purchase-context={signal} role="status"><p>{message}</p><button type="button" onClick={returnToSignal}>Вернуться к сигналу</button></aside>:null;
    return {active,banner,prefillDraft,assertSave,acceptsResponse,afterSave,returnToSignal};
  }
  function useCatalogContext({venue,item,onTarget,canOpen}:{venue:number;item:Record<string,unknown>|undefined;onTarget:(item:Record<string,unknown>)=>void;canOpen:boolean}) {
    const params=new URLSearchParams(window.location.search),signal=params.get('signalId'),menuId=params.get('menuItemId'),requestedVenue=Number(params.get('venueId'));
    const [state,setState]=React.useState<{venue:number;signal:string;episode:Episode;error?:string}|null>(null),[error,setError]=React.useState('');const opened=React.useRef('');
    React.useEffect(()=>{let active=true;setState(null);setError('');opened.current='';if(signal&&menuId&&runtime.enabled()){
      if(requestedVenue!==venue){setError('Выбрано другое заведение. Вернитесь к сигналу в исходном заведении.');return}
      request('/api/management/cost-signals/'+encodeURIComponent(signal),venue).then(data=>{if(active&&data.episode?.menuItemId===menuId)setState({venue,signal,episode:data.episode});else if(active)setError('Позиция не соответствует сигналу.')}).catch(value=>{if(active)setError(value.message)});
    }return()=>{active=false}},[signal,menuId,venue,requestedVenue]);
    React.useEffect(()=>{const listener=(event:Event)=>{const detail=(event as CustomEvent<{venue:number;signal:string;message:string}>).detail;if(detail?.venue===venue&&detail.signal===signal)setError(detail.message)};window.addEventListener('bd-cost-save-verification',listener);return()=>window.removeEventListener('bd-cost-save-verification',listener)},[venue,signal]);
    React.useEffect(()=>{if(state?.venue===venue&&state.signal===signal&&item&&String(item.id)===menuId&&(item.venueId==null||item.venueId==='primary'||Number(item.venueId)===venue)&&canOpen&&opened.current!==signal){opened.current=signal||'';onTarget(item)}},[state,venue,signal,menuId,item,canOpen,onTarget]);
    if(!signal||!menuId||!runtime.enabled()||disabled.has(venue))return null;
    return <aside className="bd-cost-return" aria-label="Возврат к сигналу"><p>{error||state?.error||'Исправьте техкарту и проверьте результат в Business Health.'}</p><button type="button" onClick={()=>runtime.navigate('/health?venueId='+venue+'&signalId='+encodeURIComponent(signal)+'&section=management')}>Вернуться к сигналу</button></aside>
  }
  async function afterSave(venue:number,itemId:string,status:string){const params=new URLSearchParams(window.location.search),id=params.get('signalId');if(status!=='confirmed'||!id||params.get('menuItemId')!==itemId||Number(params.get('venueId'))!==venue||!runtime.enabled())return;
    try{const result=await request('/api/management/cost-signals/'+encodeURIComponent(id)+'/verify',venue,{trigger:'ACCEPTED_SAVE'});window.dispatchEvent(new CustomEvent('bd-cost-save-verification',{detail:{venue,signal:id,message:result.episode?.condition==='VERIFIED_RESOLVED'?'Проверено: себестоимость рассчитана. Результат сохранён.':'Техкарта сохранена; себестоимость пока не удалось подтвердить. Вернитесь к сигналу для проверки.'}}));notify()}catch{if(runtime.venue()===venue)window.dispatchEvent(new CustomEvent('bd-cost-save-verification',{detail:{venue,signal:id,message:'Техкарта сохранена. Проверка результата недоступна; сигнал остаётся открытым. Вернитесь к сигналу и повторите проверку.'}}));notify()}}
  return {Center,Result,useCatalogContext,usePurchaseContext,afterSave,covered:(venue:number)=>runtime.enabled()&&!disabled.has(venue)?covered.get(venue)||new Set<string>():new Set<string>()};
}
