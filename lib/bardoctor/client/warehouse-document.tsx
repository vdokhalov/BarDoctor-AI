import {readCanonicalJson} from './canonical-read';
type Item=Record<string,unknown>;
type Page={ok:boolean;venueId:number;sourceDocumentId:string;revision:number|string;items:Item[];next:number|null;code?:string};
type Runtime={headers:()=>HeadersInit;venue:()=>number;identity:()=>string};
export function createWarehouseDocumentClient(React:typeof import('react'),runtime:Runtime){
 async function read(documentId:string,venue:number,identity:string,cursor:number|null,revision:number|string|null,signal:AbortSignal){
  const current=()=>runtime.venue()===venue&&runtime.identity()===identity;
  if(!current())throw Error('Контекст заведения изменился.');
  const params=new URLSearchParams({sourceDocumentId:documentId,limit:'100'});
  if(cursor!==null){params.set('cursor',String(cursor));params.set('revision',String(revision));}
  const headers=new Headers(runtime.headers());headers.set('X-Venue-Id',String(venue));
  const {response,value}=await readCanonicalJson<Page>('/api/inventory/movements?'+params,headers,signal);
  if(!current())throw Error('Контекст заведения изменился.');
  if(!response.ok||!value.ok)throw Error(value.code==='STOCK_JOURNAL_PAGE_CHANGED'?'История изменилась. Обновите движения документа.':'Не удалось загрузить движения документа.');
  if(value.venueId!==venue||value.sourceDocumentId!==documentId||!Array.isArray(value.items)||value.items.some(item=>!item||typeof item!=='object'||Array.isArray(item)||(item.sourceDocumentId!==documentId&&item.salesBatchId!==documentId)||(item.venueId!=null&&item.venueId!==venue))||(typeof value.revision!=='number'&&typeof value.revision!=='string')||value.next!==null&&!Number.isSafeInteger(value.next)||cursor!==null&&(value.revision!==revision||value.next!==null&&value.next<=cursor))throw Error('Контекст ответа склада не подтверждён.');
  return value;
 }
 function useDocument({documentId,venue,ready}:{documentId:string|null;venue:number;ready:boolean}){
  const identity=runtime.identity(),key=JSON.stringify([documentId,venue,identity]);
  const [request,setRequest]=React.useState<{key:string;cursor:number|null;revision:number|string|null;attempt:number}>({key:'',cursor:null,revision:null,attempt:0});
  const [state,setState]=React.useState<{key:string;status:'loading'|'ready'|'error';items:Item[];next:number|null;revision:number|string|null;error:string}>({key:'',status:'loading',items:[],next:null,revision:null,error:''});
  const cursor=request.key===key?request.cursor:null,revision=request.key===key?request.revision:null;
  React.useEffect(()=>{
   if(!documentId)return;const controller=new AbortController();let disposed=false;
   setState(previous=>({key,status:'loading',items:cursor!==null&&previous.key===key?previous.items:[],next:null,revision:null,error:''}));
   if(!ready)return()=>controller.abort();
   read(documentId,venue,identity,cursor,revision,controller.signal).then(page=>{if(!disposed)setState(previous=>({key,status:'ready',items:[...(cursor!==null&&previous.key===key?previous.items:[]),...page.items],next:page.next,revision:page.revision,error:''}));}).catch(error=>{if(!disposed)setState({key,status:'error',items:[],next:null,revision:null,error:error instanceof Error?error.message:'Не удалось загрузить движения.'});});
   return()=>{disposed=true;controller.abort();};
  },[key,documentId,venue,identity,ready,cursor,revision,request.attempt]);
  const value=state.key===key?state:{key,status:'loading' as const,items:[],next:null,revision:null,error:''};
  const retry=()=>setRequest(previous=>({key,cursor:null,revision:null,attempt:previous.attempt+1}));
  const more=()=>{if(value.status==='ready'&&value.next!==null)setRequest(previous=>({key,cursor:value.next,revision:value.revision,attempt:previous.attempt+1}));};
  const notice=!documentId?null:<div aria-live="polite" data-warehouse-document-status={value.status}>
   {value.status==='loading'?<p role="status">Загружаем движения документа…</p>:value.status==='error'?<><p role="alert">{value.error} Пустой склад не подтверждён.</p><button type="button" onClick={retry}>Повторить загрузку</button></>:<><p>{value.items.length===0?'Для этого документа движений не найдено.':`Загружено движений: ${value.items.length}${value.next!==null?' · есть ещё':''}`}</p><button type="button" onClick={retry}>Обновить движения</button>{value.next!==null&&<button type="button" onClick={more}>Показать ещё движения</button>}</>}
  </div>;
  return {active:documentId!==null,items:value.status==='error'?[]:value.items,notice};
 }
 return {useDocument,read};
}
