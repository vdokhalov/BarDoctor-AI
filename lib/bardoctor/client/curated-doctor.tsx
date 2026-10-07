import { createIntelligenceIdentity } from './intelligence-ui';
import { CURATED_QUESTIONS, isCuratedQuestion, type CuratedQuestionId, type CuratedAnswer, type CuratedAction } from '../curated-doctor-contracts';
type Runtime={headers:()=>HeadersInit;venue:()=>number;navigate:(path:string)=>void};
export function curatedQuestionContext(search:string,venue:number):CuratedQuestionId|null{
 const params=new URLSearchParams(search),q=params.get('doctorQuestion');
 return isCuratedQuestion(q)&&params.getAll('doctorQuestion').length===1&&params.getAll('venueId').length===1&&params.get('venueId')===String(venue)?q:null;
}
export function createCuratedDoctorClient(React:typeof import('react'),runtime:Runtime){
 const {Identity}=createIntelligenceIdentity(React);
 const actor=()=>new Headers(runtime.headers()).get('X-Session-Email')??'';
 const storageKey='bd_curated_return_phase4c';
 const storedQuestion=(venue:number):CuratedQuestionId|null=>{try{const s=JSON.parse(sessionStorage.getItem(storageKey)??'null');return s?.venue===venue&&s.actor===actor()&&s.expires>Date.now()&&isCuratedQuestion(s.question)?s.question:null;}catch{return null;}};
 const origin=()=>new URLSearchParams(location.search).get('returnTo')==='home'?'home':'health';
 const questionPath=(venue:number,q:CuratedQuestionId)=>{let from='health';try{const s=JSON.parse(sessionStorage.getItem(storageKey)??'null');if(s?.venue===venue&&s.actor===actor()&&s.expires>Date.now()&&s.from==='home')from='home';}catch{}return `/analysis?venueId=${venue}&doctorQuestion=${q}&returnTo=${from}`;};
 const remember=(venue:number,q:CuratedQuestionId)=>{sessionStorage.setItem(storageKey,JSON.stringify({venue,actor:actor(),question:q,from:origin(),expires:Date.now()+600000}));};
 const returnPath=(path:string)=>{if(!path.startsWith('/health?'))return path;const u=new URL(path,location.origin),venue=Number(u.searchParams.get('venueId')),q=storedQuestion(venue);if(q&&venue===runtime.venue())u.searchParams.set('doctorQuestion',q);return u.pathname+u.search;};
 function Return({venue,onlyAction=false}:{venue:number;onlyAction?:boolean}){
  const direct=curatedQuestionContext(location.search,venue);
  const q=direct??storedQuestion(venue);
  if(onlyAction&&(!direct||['/analysis','/health'].includes(location.pathname)||storedQuestion(venue)!==direct))return null;
  if(!q||runtime.venue()!==venue)return null;
  return <button type="button" className="bd-curated-return" data-curated-dock={onlyAction||undefined} onClick={()=>runtime.navigate(questionPath(venue,q))}>Вернуться к вопросу Doctor →</button>;
 }
 function Suggestion({venue,snapshot,onNavigate}:{venue:number;snapshot:unknown;onNavigate:(path:string)=>void}){
  const s=snapshot as {managementTopActions?:Record<string,unknown>[]},top=s?.managementTopActions?.[0];
  const q:CuratedQuestionId=top?.linkedTaskId?'tasks':top?.issueKey==='recipes'?'cost':top?.issueKey==='stock'?'stock':top?.issueKey==='unclosed-shifts'?'shifts':'attention';
  return <aside className="bd-curated-suggestion"><Return venue={venue}/><button type="button" className="bd-intelligence-secondary" onClick={()=>onNavigate(`/analysis?venueId=${venue}&doctorQuestion=${q}&returnTo=health`)}>Спросить AI Doctor</button></aside>;
 }
 function Panel({venue,ready}:{venue:number;ready:boolean}){
  const [q,setQ]=React.useState<CuratedQuestionId>(()=>curatedQuestionContext(location.search,venue)??'attention');
  const [saved,setSaved]=React.useState<{venue:number;actor:string;question:CuratedQuestionId;value:CuratedAnswer}|null>(null),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false),[refresh,setRefresh]=React.useState(0);
  const [answerView,setAnswerView]=React.useState(()=>!!curatedQuestionContext(location.search,venue));
  const heading=React.useRef<HTMLDivElement>(null);
  const [wide,setWide]=React.useState(()=>window.matchMedia('(min-width:820px)').matches);
  React.useEffect(()=>{const media=window.matchMedia('(min-width:820px)'),change=()=>setWide(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
  React.useEffect(()=>{if(!answerView)return;const frame=requestAnimationFrame(()=>{heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start',behavior:'instant'});});return()=>cancelAnimationFrame(frame);},[answerView,q]);
  const epoch=React.useRef(0),currentActor=actor();
  React.useEffect(()=>{setQ(curatedQuestionContext(location.search,venue)??'attention');setAnswerView(!!curatedQuestionContext(location.search,venue));},[venue,currentActor]);
  React.useEffect(()=>{
   setSaved(null);setError('');if(!ready||!Number.isSafeInteger(venue)||venue<1)return;
   const ref=epoch,controller=new AbortController();
   const read=async()=>{const stamp=++epoch.current;setBusy(true);try{
    const headers=new Headers(runtime.headers());headers.set('X-Venue-Id',String(venue));
    const response=await fetch(`/api/ai/curated?question=${q}&venueId=${venue}`,{headers,cache:'no-store',signal:controller.signal});
    const envelope=await response.json() as {success:boolean;error?:string;data?:CuratedAnswer};
    if(!response.ok||!envelope.success)throw Error(envelope.error??'Ответ пока недоступен.');
    const value=envelope.data;if(!value||value.scope.venueId!==venue||value.question.id!==q||value.authority!=='DETERMINISTIC_CANONICAL_SERVER')throw Error('Контекст ответа не подтверждён.');
    if(stamp===epoch.current&&runtime.venue()===venue&&actor()===currentActor){setSaved({venue,actor:currentActor,question:q,value});setError('');}
   }catch(e){if(stamp===epoch.current&&!controller.signal.aborted)setError(e instanceof Error?e.message:'Ответ недоступен.');}finally{if(stamp===epoch.current)setBusy(false)}};
   void read();const listener=()=>void read();for(const e of ['bd:store-updated','bd:shift-closed','bd-cost-projection-updated','bd-cost-management-refresh','focus'])window.addEventListener(e,listener);
   return()=>{ref.current++;controller.abort();for(const e of ['bd:store-updated','bd:shift-closed','bd-cost-projection-updated','bd-cost-management-refresh','focus'])window.removeEventListener(e,listener)};
  },[venue,currentActor,q,ready,refresh]);
  const value=saved?.venue===venue&&saved.actor===currentActor&&saved.question===q&&runtime.venue()===venue?saved.value:null;
  const choose=(id:CuratedQuestionId)=>{const params=new URLSearchParams(location.search);params.set('doctorQuestion',id);params.set('venueId',String(venue));params.set('returnTo',origin());history.replaceState(history.state,'',location.pathname+'?'+params);setQ(id);setAnswerView(true);};
  const another=()=>{const params=new URLSearchParams(location.search);params.delete('doctorQuestion');history.replaceState(history.state,'',location.pathname+'?'+params);setAnswerView(false);};
  const act=(action:CuratedAction)=>{if(!value||value.scope.venueId!==runtime.venue())return;const u=new URL(action.path,location.origin);if(u.origin!==location.origin||!action.path.startsWith('/')||action.path.startsWith('//')||u.searchParams.get('venueId')!==String(venue))return;remember(venue,q);u.searchParams.set('doctorQuestion',q);runtime.navigate(u.pathname+u.search);};
  const stamp=(v:string|null)=>v?new Date(v).toLocaleString('ru-RU',{timeZone:value?.period.timezone??'UTC'}):'время обновления не известно';
  return <section className="bd-curated-doctor bd-reference-doctor" aria-label="Управленческие вопросы" data-reference-slice="doctor" data-curated-venue={venue} data-doctor-view={answerView?'answer':'questions'}>
   {!answerView&&<button type="button" className="bd-intelligence-link bd-reference-back" onClick={()=>runtime.navigate(`/${origin()}?venueId=${venue}`)}>← {origin()==='home'?'Главная':'Business Health'}</button>}
   <div ref={heading} tabIndex={-1} className="bd-doctor-heading"><Identity doctor extra={answerView?<button type="button" className="bd-intelligence-link" onClick={another}>Другой вопрос</button>:undefined}/></div>
   {!answerView&&error&&<p role="alert">{error} Факты сейчас не подтверждены.</p>}
   {!answerView?<><p className="bd-doctor-description">Ответ — по данным BarDoctor.</p><div className="bd-doctor-question-groups">{['Сейчас','Операции'].map(group=><section className="bd-curated-group" key={group}><h2>{group}</h2><div className="bd-curated-questions">{CURATED_QUESTIONS.filter(item=>item.group===group).map(item=><button type="button" key={item.id} data-curated-question={item.id} onClick={()=>choose(item.id)}>{item.label}<span aria-hidden="true">›</span></button>)}</div></section>)}</div><p className="bd-doctor-before-limitation">Ответ объясняет данные, но не подтверждает физическое состояние заведения.</p></>:<>
   <p className="bd-doctor-selected-question">{CURATED_QUESTIONS.find(item=>item.id===q)!.label}</p>
   {busy&&!value&&<p role="status">Проверяем источники…</p>}{error&&<p role="alert">{error} Факты сейчас не подтверждены.</p>}
   {value&&<article aria-label="Ответ Doctor" data-curated-answer={q} data-curated-revision={value.inputRevision}>
    <div className="bd-doctor-answer-status"><span className="bd-status bd-status-neutral">Ответ получен</span>{value.availability!=='AVAILABLE'&&<span className="bd-status bd-status-warning">{value.availability==='PARTIAL'?'Частичные данные':'Данные недоступны'}</span>}</div>
    <div className="bd-doctor-answer-grid"><div className="bd-doctor-answer-main"><h2 className="bd-doctor-conclusion">{value.answer}</h2>
    <div className="bd-curated-actions bd-doctor-business-actions">{value.nextActions.length?value.nextActions.map((action,index)=><button type="button" className={index===0?'bd-intelligence-primary':'bd-intelligence-secondary'} key={action.id} data-curated-action={action.id} onClick={()=>act(action)}>{action.label} →</button>):<p className="bd-doctor-no-action">Действие пока не подтверждено.</p>}</div>
    <h3>На чём основан ответ</h3><ol className="bd-doctor-facts">{value.facts.map(f=><li key={f.id} data-curated-fact={f.id} data-curated-kind={f.kind} data-curated-priority={f.priority}>
     <div className="bd-doctor-fact-head"><strong>{f.label}</strong><span className="bd-curated-kind">{f.kind==='UNKNOWN'?'Неизвестно':f.kind==='DERIVED_FACT'?'Расчёт по данным':'Факт'}</span></div>
     <p>{f.kind==='UNKNOWN'?'UNKNOWN — нет подтверждённого значения':typeof f.value==='number'?`${f.value} ${f.currency??f.unit??''}`:f.value}</p><p>{f.detail}</p>
     {f.priority&&<small>Приоритет: {({critical:'критический',high:'важный',medium:'обычный',low:'информационный'} as Record<string,string>)[f.priority]??f.priority}{f.deadline?`; срок: ${f.deadline}`:''}{f.status?`; статус: ${({in_progress:'в работе',pending:'ожидает',approved:'согласована',completed:'выполнена',accepted:'принята',overdue:'просрочена'} as Record<string,string>)[f.status]??f.status}`:''}</small>}
    </li>)}</ol>{!value.facts.length&&<p>Недостаточно записей для подробного ответа.</p>}
    {value.limitations.length>0&&<><h3>Важное ограничение</h3><p className="bd-doctor-important-limitation">{value.limitations[0]}</p><details><summary>Все ограничения</summary><ul>{value.limitations.map(l=><li key={l}>{l}</li>)}</ul></details></>}
    </div><details className="bd-doctor-sources" open={wide}><summary>Источники и свежесть<span className="bd-intelligence-meta">Проверено {stamp(value.asOf)} ({value.period.timezone})</span></summary><p>{value.period.label}</p><ul>{value.sources.map(s=><li key={s.key}><strong>{s.label}</strong><span>{s.state==='AVAILABLE'?'Доступны':s.state==='UNKNOWN'?'Неизвестно (UNKNOWN)':s.state==='PARTIAL'?'Частичные данные (PARTIAL)':'Неполны или недоступны'} · {stamp(s.updatedAt)}</span></li>)}</ul><p>Это чтение зарегистрированного состояния, а не подтверждение физического состояния заведения.</p></details></div>
   </article>}
   <div className="bd-curated-actions bd-doctor-return-actions"><button type="button" className="bd-intelligence-secondary" onClick={()=>runtime.navigate(`/${origin()}?venueId=${venue}`)}>{origin()==='home'?'На главную':'К управленческой очереди'}</button><button type="button" className="bd-intelligence-link" disabled={busy||!ready} onClick={()=>setRefresh(n=>n+1)}>Обновить ответ</button></div>
   </>}
  </section>;
 }
 return {Panel,Suggestion,Return,returnPath};
}
