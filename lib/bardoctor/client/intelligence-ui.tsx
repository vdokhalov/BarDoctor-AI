/* eslint-disable @next/next/no-img-element -- tiny static library icons in the prepared client */
import type { ReactNode } from 'react';
import type { BusinessHealthSnapshot } from '../business-health-snapshot';
import { homeFinancialResult } from './management-actions';

type Snapshot = BusinessHealthSnapshot & { managementCoverage?: Record<string,string> };
type Navigate = (path:string)=>void;

export function createIntelligenceIdentity(React:typeof import('react')) {
 function Marker({doctor=false}:{doctor?:boolean}) {return <span className="bd-intelligence-marker" aria-hidden="true"><img src={doctor?'/icons/intelligence-dialogue.svg':'/icons/intelligence-activity.svg'} alt=""/></span>;}
 function Identity({home=false,doctor=false,extra}:{home?:boolean;doctor?:boolean;extra?:ReactNode}) {const Title=home?'h2':'h1';return <header className={'bd-intelligence-identity'+(doctor?' is-doctor':'')}><Marker doctor={doctor}/><div><Title>{doctor?'AI Doctor':'Business Health'}</Title>{!doctor&&<p>Состояние вашего бизнеса</p>}</div>{extra}</header>;}
 return {Marker,Identity};
}

/** Presentation only: status, score, freshness and queue stay server-owned. */
export function createIntelligenceUI(React:typeof import('react')) {
 const {Marker,Identity}=createIntelligenceIdentity(React);
 function Score({snapshot,loading=false,home=false,onNavigate,onRefresh}:{snapshot:Snapshot|null;loading?:boolean;home?:boolean;onNavigate:Navigate;onRefresh?:()=>void}) {
  const score=snapshot?.score??null,status=snapshot?.status??'insufficient_data';
  const freshness=snapshot?.dataFreshness,stale=!!freshness?.stale,partial=!!snapshot&&(snapshot.factorScores.some(f=>f.availability==='unavailable')||Object.values(snapshot.managementCoverage??{}).some(v=>v==='PARTIAL'||v==='UNAVAILABLE'));
  const [shown,setShown]=React.useState(false);
  React.useEffect(()=>{const frame=requestAnimationFrame(()=>setShown(true));return()=>cancelAnimationFrame(frame);},[]);
  return <section className="bd-intelligence-score" data-bd-home-health-index={home?(snapshot?'business-health-snapshot-v334':loading?'business-health-v344-loading':'business-health-v334-unavailable'):undefined} data-bd-health-snapshot-id={snapshot?.snapshotId} data-score-category={status} data-score-freshness={!freshness?'UNKNOWN':stale?'STALE':'CURRENT'} aria-label="Общая оценка Business Health">
   <div className="bd-score-ring" style={{'--bd-score-offset':100-(score??0)} as import('react').CSSProperties} data-score-known={score!==null} data-score-shown={shown} role="img" aria-label={score===null?'Индекс не рассчитан':`Индекс ${score} из 100. ${snapshot?.statusLabel}`}>
    <svg viewBox="0 0 120 120" aria-hidden="true"><circle className="bd-score-track" cx="60" cy="60" r="54"/>{score!==null&&<circle className="bd-score-fill" cx="60" cy="60" r="54" pathLength="100" strokeDasharray="100 100"/>}</svg>
    <div><strong>{score??'—'}</strong><span>{score===null?'Не рассчитан':'из 100'}</span></div>
   </div>
   <div className="bd-score-copy"><h2>{home?'Общая оценка':snapshot?.statusLabel??'Оценка недоступна'}</h2>
    {loading&&!snapshot?<p role="status">Обновляем сводку…</p>:!snapshot?<p>Нет подтверждённой оценки</p>:<>{home&&(stale||!freshness)&&<p>{snapshot.statusLabel}</p>}<p className={stale?'bd-status-warning':''}>{!freshness?'Свежесть данных неизвестна':stale?'Данные устарели':home?snapshot.statusLabel:'По доступным данным'}</p>{partial&&<span className="bd-status bd-status-warning" data-quality="PARTIAL">Частичные данные</span>}<p className="bd-intelligence-meta">{snapshot.period.startDate??'Начало периода неизвестно'} — {snapshot.period.endDate??'Конец периода неизвестен'}{snapshot.confidenceLevel!=='high'?' · предварительно':''}</p>{partial&&<p className="bd-intelligence-meta">Общий вывод ограничен</p>}</>}
    {!snapshot&&!loading&&<button type="button" className="bd-intelligence-link" onClick={()=>onRefresh?onRefresh():onNavigate('/health')}>Повторить проверку</button>}
   </div>
  </section>;
 }
 function DoctorEntry({venue,onNavigate,home=false}:{venue:number;onNavigate:Navigate;home?:boolean}) {return <button type="button" className="bd-intelligence-secondary bd-doctor-entry" onClick={()=>onNavigate(`/analysis?venueId=${venue}&returnTo=${home?'home':'health'}`)}><Marker doctor/>Спросить AI Doctor</button>;}
 function Home({snapshot,loading,venue,queue,cost,today,report,ready,money,onNavigate,extras,finance}:{snapshot:Snapshot|null;loading:boolean;venue:number;queue:ReactNode;cost:ReactNode;today:Record<string,string>;report:Record<string,unknown>;ready:boolean;money:(value:number)=>string;onNavigate:Navigate;extras:ReactNode;finance:ReactNode}) {
  const result=homeFinancialResult(report);
  return <div className="bd-reference-home" data-reference-slice="home"><div className="bd-reference-page-heading"><p className="bd-intelligence-meta">{new Date().toLocaleDateString('ru-RU',{day:'numeric',month:'long',weekday:'long'})}</p><h1>Главная</h1></div>
   <div className="bd-reference-home-grid"><section className="bd-home-management-phase4a" data-bd-home-management="business-health" aria-label="Business Health"><Identity home extra={<button type="button" className="bd-intelligence-link" onClick={()=>onNavigate(`/health?venueId=${venue}`)}>Подробнее →</button>}/><Score snapshot={snapshot} loading={loading} home onNavigate={onNavigate}/>{queue}</section>
    <aside className="bd-reference-today"><DoctorEntry venue={venue} onNavigate={onNavigate} home/><section data-bd-home-today="v151"><h2>Сегодня</h2><button type="button" className="bd-operational-row" onClick={()=>onNavigate(today.actionHref)}><span>Смена</span><span>{today.shiftStatus}</span><span aria-hidden="true">›</span></button><button type="button" className="bd-operational-row" data-bd-home-money="result-v151" onClick={()=>onNavigate('/reports')}><span>Финансовый результат</span><span>{!ready?'Сверяем данные с сервером':result.value===null?'Не рассчитан':money(result.value)}</span><span aria-hidden="true">›</span></button><details><summary>Рабочий контекст</summary><dl>{[['График работы',today.schedule],['Статус заведения',today.venueStatus],['Отчёт за смену',today.reportStatus]].map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></details></section></aside>
   </div><details className="bd-reference-home-details"><summary>Себестоимость — основания и проверка</summary>{cost}</details><details className="bd-home-financial-details"><summary>Финансовый результат — детали</summary>{finance}</details><details className="bd-reference-home-extras"><summary>Отзывы и контекст</summary>{extras}</details>
  </div>;
 }
 function Health({snapshot,loading,venue,queue,cost,zones,onNavigate,returnContext,onRefresh}:{snapshot:Snapshot|null;loading:boolean;venue:number;queue:ReactNode;cost:ReactNode;zones:ReactNode;onNavigate:Navigate;returnContext:ReactNode;onRefresh:()=>void}) {return <div className="bd-reference-health" data-reference-slice="health"><button type="button" className="bd-intelligence-link bd-reference-back" onClick={()=>onNavigate('/home')}>← Главная</button><Identity/>{returnContext}<div className="bd-reference-health-summary"><Score snapshot={snapshot} loading={loading} onNavigate={onNavigate} onRefresh={onRefresh}/><DoctorEntry venue={venue} onNavigate={onNavigate}/></div>
   {queue}<div className="bd-health-doctor-secondary"><DoctorEntry venue={venue} onNavigate={onNavigate}/></div><div className="bd-reference-health-support"><section><h2>Основания и свежесть</h2>{!snapshot?<p role="status">{loading?'Проверяем источники…':'Актуальный server snapshot недоступен. Старое локальное значение не используется.'}</p>:<><p className="bd-intelligence-meta">Обновлено {new Date(snapshot.generatedAt).toLocaleString('ru-RU')}</p><p>{snapshot.dataQuality?.label??'Качество данных неизвестно'}</p>{snapshot.dataFreshness?<p>Источники: свежих {snapshot.dataFreshness.fresh}; устаревших {snapshot.dataFreshness.stale}; отсутствуют {snapshot.dataFreshness.missing}.</p>:<p>Свежесть источников неизвестна</p>}<details><summary>Зоны Business Health и данные</summary>{zones}{(snapshot.dataQuality?.gaps??[]).map(g=><p key={g}>{g}</p>)}<button type="button" className="bd-intelligence-link" onClick={()=>onNavigate('/data-control')}>Проверить данные</button></details>{snapshot.historyWarning&&<p>{snapshot.historyWarning}</p>}</>}</section><section className="bd-reference-health-history"><h2>Проверка и история себестоимости</h2>{cost}</section></div>
  </div>;}
 return {Marker,Identity,Score,DoctorEntry,Home,Health};
}
