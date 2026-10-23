function bdSupplierPaymentRecord(row){return !!row&&!!(row.sourceDocumentId||row.purchaseId)&&(['purchase_payment','purchase_document'].includes(row.source)||row.paymentKind==='supplier_payment');}
function bdSupplierPaymentPick(rows,id,venue){return Array.isArray(rows)?rows.find(row=>String(row?.id)===String(id)&&(!row.venueId||String(row.venueId)===String(venue))&&bdSupplierPaymentRecord(row)):null;}
function bdSupplierPaymentUrl(id,document=false){const url=new URL(window.location.href);id?url.searchParams.set('paymentId',id):url.searchParams.delete('paymentId');document?url.searchParams.set('paymentDocument','1'):url.searchParams.delete('paymentDocument');return url.pathname+url.search;}
function bdSupplierPaymentNavigate(url){if(window.location.pathname+window.location.search===url)return;window.history.pushState(null,"",url);window.dispatchEvent(new PopStateEvent("popstate"));}
function bdSupplierPaymentRoute(){
 const Sheet=bdProcSheetV168,Fact=bdProcFactV168,Document=bdDocumentDetailSheet;
 const location=ste(),[,navigate]=bt(),venueContext=bdUseProcVenueContextV168(),{isReady}=Ai(),query=new URLSearchParams(location),id=query.get('paymentId'),venue=String(venueContext.activeVenueId||''),account=String(Ot()||''),key=account+'|'+venue+'|'+id;
 const[state,setState]=S.useState(null),[retry,setRetry]=S.useState(0);
 S.useEffect(()=>{if(!id||!isReady)return;const controller=new AbortController();let active=true;setState({key,loading:true});
 const read=async store=>{const response=await fetch('/api/store/'+store,{headers:{'X-Venue-Id':venue},signal:controller.signal});if(!response.ok)throw Error('Не удалось загрузить платёж');const result=await response.json();return result.data;};
 Promise.all([read('bd_finance_expenses'),read('bd_purchase_documents').catch(()=>null)]).then(([rows,documents])=>{if(!active)return;const payment=bdSupplierPaymentPick(rows,id,venue),sourceId=payment?.sourceDocumentId||payment?.purchaseId,document=Array.isArray(documents)?documents.find(row=>String(row?.id)===String(sourceId)&&(!row.venueId||String(row.venueId)===venue)):null;setState({key,payment,document});}).catch(error=>{if(active)setState({key,error:true});});return()=>{active=false;controller.abort();};
 },[key,isReady,retry]);
 if(!id)return null;
 const close=()=>bdSupplierPaymentNavigate(bdSupplierPaymentUrl(null)),current=state?.key===key?state:null,p=current?.payment,doc=current?.document;
 if(p&&doc&&query.get('paymentDocument')==='1')return <Document document={doc} equipment={[]} onClose={()=>bdSupplierPaymentNavigate(bdSupplierPaymentUrl(id))}/>;
 const amount=p?.amount!=null&&p.amount!==''&&Number.isFinite(Number(p.amount))?Number(p.amount):null;
 const date=typeof p?.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&!Number.isNaN(Date.parse(p.date))?p.date.split('-').reverse().join('.'):'Не указана';
 return <Sheet title="Платёж поставщику" onClose={close} className="detail" footer={<button type="button" className="secondary" onClick={close}>Закрыть</button>}>
 {!current||current.loading?<p>Загрузка…</p>:current.error?<div><p>Не удалось загрузить платёж</p><button type="button" onClick={()=>setRetry(n=>n+1)}>Повторить</button></div>:!p?<p>Платёж недоступен</p>:<div className="bd-proc-detail-v168">
 <div className="bd-proc-facts-grid-v168"><Fact label="Сумма платежа" value={amount===null?'Не указана':p.currency?window.bdFormatAccountingMoney(amount,p.currency):String(amount)+' · валюта не указана'}/><Fact label="Дата" value={date}/><Fact label="Поставщик" value={p.supplierName||doc?.supplierName||'Не указан'}/><Fact label="Источник" value={p.moneySourceName||'Не указан'}/><Fact label="Способ оплаты" value={({cash:'Наличные',card:'Карта',transfer:'Перевод'})[p.paymentMethod]||'Не указан'}/><Fact label="Статус" value={p.reversedAt||['voided','reversed','cancelled'].includes(p.status)?'Отменён':p.status==='posted'?'Проведён':'Не указан'}/></div>
 {p.note&&<p>{p.note}</p>}
 {doc?<button type="button" className="secondary" onClick={()=>bdSupplierPaymentNavigate(bdSupplierPaymentUrl(id,true))}>Открыть закупку{doc.documentNumber?' № '+doc.documentNumber:''}</button>:<p>Связанная закупка недоступна</p>}
 </div>}
 </Sheet>;
}
