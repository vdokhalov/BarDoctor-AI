function BdPurchasePricePreview({draft}) {
 const scope=Pt(Wm),[snapshot,setSnapshot]=S.useState(null),[error,setError]=S.useState(''),[retry,setRetry]=S.useState(0);
 S.useEffect(()=>{const controller=new AbortController(),venue=localStorage.getItem("bd_active_venue_id");setSnapshot(null);setError('');
  fetch('/api/assortment/overview',{headers:ca(Ot()),credentials:'include',cache:'no-store',signal:controller.signal}).then(async response=>{const result=await response.json();if(!response.ok||!result.ok||!result.analytics||String(result.venueId)!==String(venue))throw Error('Предыдущая цена и влияние пока недоступны.');if(!controller.signal.aborted)setSnapshot({scope,id:draft.id,analytics:result.analytics});}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message)});
  return()=>controller.abort();
 },[scope,draft.id,retry]);
 const ready=snapshot?.scope===scope&&snapshot?.id===draft.id,result=ready?bdPurchasePricePreviewDomain.purchasePricePreview({...draft,items:draft.items.map(line=>({...line,packageContent:bdPurchaseContentV421(line)||undefined}))},snapshot.analytics):null;
 const amount=(value,currency,unit)=>value==null?'Пока неизвестно':window.bdFormatAccountingMoney(value,currency)+(unit?' / '+({kg:'кг',l:'л',pcs:'шт.'}[unit]||unit):'');
 const date=value=>{const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return match?match[3]+'.'+match[2]+'.'+match[1]:'';};
 const explanation=row=>{
  if(row.reason.includes('Валют'))return 'Цены в разных валютах — сравнить их пока нельзя.';
  if(row.reason.includes('раньше'))return 'Для этой даты нельзя надёжно сравнить цены.';
  if(row.reason.includes('Несколько'))return 'У этого товара разные цены в строках закупки. Уточните их.';
  if(row.reason.includes('единиц')||row.reason.includes('Единиц')||row.reason.includes('Проверьте'))return 'Укажите количество, цену и размер упаковки, чтобы сравнить цены.';
  return 'Нет предыдущей закупки с подтверждённой ценой.';
 };
 const change=row=>!row.known?'Пока не с чем сравнить':row.delta===0?'Цена не изменилась':(row.delta>0?'Цена выросла':'Цена снизилась')+(row.percent!=null?' на '+Math.abs(row.percent).toLocaleString('ru',{maximumFractionDigits:1})+'%':' на '+amount(Math.abs(row.delta),row.currency,row.unit));
 return <section data-purchase-price-preview className="bd-price-preview" aria-live="polite">
 <style>{`.bd-price-preview{margin:16px 0;padding:18px;border:1px solid #dfe3ec;border-radius:16px;background:#f8f9fc;color:#202536;font-size:16px;line-height:1.5}.bd-price-preview h3{font-size:18px;margin:0 0 14px;font-weight:650}.bd-price-preview p{margin:6px 0}.bd-price-preview .bd-price-item{padding:12px 0;border-top:1px solid #e0e4ec}.bd-price-preview .bd-price-name{font-weight:600;overflow-wrap:anywhere}.bd-price-preview .bd-price-change{font-size:18px;font-weight:650}.bd-price-preview .bd-price-change.is-up{color:#b42318}.bd-price-preview .bd-price-change.is-down{color:#16713b}.bd-price-preview .bd-price-values{display:flex;flex-wrap:wrap;gap:4px 12px}.bd-price-preview .bd-price-note{font-size:14px;color:#596274}.bd-price-preview .bd-price-dishes{margin-top:16px;padding-top:16px;border-top:1px solid #dfe3ec}.bd-price-preview .bd-price-dishes h4{font-size:16px;margin:0 0 10px}.bd-price-preview .bd-price-dish{margin:10px 0}.bd-price-preview footer{font-size:14px;color:#596274;margin-top:16px;padding-top:12px;border-top:1px solid #dfe3ec}`}</style>
 <h3>Что меняется в цене</h3>
 {!ready?<p>{error?'Не удалось загрузить предыдущие цены. Попробуйте ещё раз.':'Загружаем предыдущие цены…'}</p>:<>
 {result.prices.map(row=><div className="bd-price-item" key={row.id}><p className="bd-price-name">{row.name}</p><p className={"bd-price-change "+(row.known&&row.delta>0?"is-up":row.known&&row.delta<0?"is-down":"")}>{change(row)}</p><div className="bd-price-values"><span>Было: {amount(row.previous,row.currency,row.unit)}</span><span>→ Стало: {amount(row.next,row.currency,row.unit)}</span></div>{row.known?date(row.previousDate)&&<p className="bd-price-note">Предыдущая закупка: {date(row.previousDate)}</p>:<p className="bd-price-note">{explanation(row)}</p>}</div>)}
 <div className="bd-price-dishes"><h4>Как изменится себестоимость блюд</h4>{result.dishes.length?result.dishes.map(row=><div className="bd-price-dish" key={row.id}><p className="bd-price-name">{row.name}</p>{row.known?<p>{amount(row.previous,row.currency)} → {amount(row.next,row.currency)} за одну продажу</p>:<p className="bd-price-note">Пока неизвестно: не хватает подтверждённых цен или данных техкарты.</p>}</div>):<p className="bd-price-note">Пока неизвестно: для этих товаров не найдены связанные блюда.</p>}</div>
 </>}
 {error&&<button type="button" onClick={()=>setRetry(n=>n+1)}>Попробовать ещё раз</button>}
 <footer>Это предварительный расчёт. Изменения ещё не проведены.</footer>
 </section>;
}
