function BdPurchasePricePreview({draft}) {
 const scope=Pt(Wm),[snapshot,setSnapshot]=S.useState(null),[error,setError]=S.useState(''),[retry,setRetry]=S.useState(0);
 S.useEffect(()=>{const controller=new AbortController(),venue=localStorage.getItem("bd_active_venue_id");setSnapshot(null);setError('');
  fetch('/api/assortment/overview',{headers:ca(Ot()),credentials:'include',cache:'no-store',signal:controller.signal}).then(async response=>{const result=await response.json();if(!response.ok||!result.ok||!result.analytics||String(result.venueId)!==String(venue))throw Error('Предыдущая цена и влияние пока недоступны.');if(!controller.signal.aborted)setSnapshot({scope,id:draft.id,analytics:result.analytics});}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message)});
  return()=>controller.abort();
 },[scope,draft.id,retry]);
 const ready=snapshot?.scope===scope&&snapshot?.id===draft.id,result=ready?bdPurchasePricePreviewDomain.purchasePricePreview({...draft,items:draft.items.map(line=>({...line,packageContent:bdPurchaseContentV421(line)||undefined}))},snapshot.analytics):null;
 const amount=(value,currency,unit)=>value==null?'Неизвестно':value.toLocaleString('ru',{maximumFractionDigits:4})+' '+currency+(unit?' / '+({kg:'кг',l:'л',pcs:'шт.'}[unit]||unit):'');
 return <section data-purchase-price-preview className="bd-procurement-review-note" aria-live="polite"><strong>Цена и влияние до проведения</strong><p>Предварительный расчёт по последним подтверждённым закупкам. Остатки и история не меняются.</p>
 {!ready?<p>{error||'Загружаем текущие цены…'}</p>:<><ul>{result.prices.map(row=><li key={row.id}><b>{row.name}</b>: {amount(row.previous,row.currency,row.unit)} → {amount(row.next,row.currency,row.unit)}{row.known?<span> · {row.delta>0?'+':''}{amount(row.delta,row.currency,row.unit)}{row.percent!=null?' ('+(row.percent>0?'+':'')+row.percent.toFixed(1)+'%)':''} · предыдущая цена от {row.previousDate}</span>:<p>{row.reason}</p>}</li>)}</ul>
 <details open><summary>Влияние на связанные блюда</summary>{result.dishes.length?<ul>{result.dishes.map(row=><li key={row.id}><b>{row.name}</b>: {row.known?<span>{amount(row.previous,row.currency)} → {amount(row.next,row.currency)} за продажу</span>:<span>Неизвестно. {row.reason}</span>}</li>)}</ul>:<p>Подтверждённые связи с блюдами не найдены. Влияние неизвестно.</p>}</details></>}
 {error&&<button type="button" onClick={()=>setRetry(n=>n+1)}>Повторить расчёт</button>}
 </section>;
}
