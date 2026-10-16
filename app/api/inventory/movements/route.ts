import {getD1} from '../../../../db';
import {authenticateReadOnlyRequest,unauthorized} from '../../../../lib/bardoctor/auth';
import {hasPermission} from '../../../../lib/bardoctor/access-control';
import {journalPage} from '../../../../lib/bardoctor/stock-journal';
import {stockJournalMarker} from '../../../../lib/bardoctor/stock-storage';
import {StoreWriteConflictError} from '../../../../lib/bardoctor/store-cas';
/** Scoped keyset history. Clients keep the returned revision on every page. */
export async function GET(request:Request){
 const account=await authenticateReadOnlyRequest(request);if(!account)return unauthorized();
 if(!hasPermission(account,'inventory.view'))return Response.json({ok:false,code:'ACCESS_DENIED'},{status:403});
 const url=new URL(request.url),limit=Number(url.searchParams.get('limit')??100),cursor=url.searchParams.get('cursor'),revision=url.searchParams.get('revision'),documentId=url.searchParams.get('sourceDocumentId');
 if(documentId!==null&&(!documentId.trim()||documentId.length>240||url.searchParams.getAll('sourceDocumentId').length!==1))return Response.json({ok:false,code:'INVALID_DOCUMENT'},{status:422});
 if(!Number.isSafeInteger(limit)||limit<1||limit>500||cursor!==null&&!Number.isSafeInteger(Number(cursor)))return Response.json({ok:false,code:'INVALID_PAGE'},{status:422});
 const db=getD1(),row=await db.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_stock_movements'").bind(account.id).first<{data_json:string}>();
 const value=row?JSON.parse(row.data_json):[];
 if(!stockJournalMarker(value)){
  if(documentId===null)return Response.json({ok:false,code:'STOCK_JOURNAL_NOT_MIGRATED',legacyEndpoint:'/api/store/bd_stock_movements'},{status:409});
  if(!Array.isArray(value)||value.some(item=>!item||typeof item!=='object'||Array.isArray(item)))return Response.json({ok:false,code:'STOCK_HISTORY_INVALID'},{status:409});
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(row?.data_json??'[]'));
  const current='legacy:'+Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  if(cursor!==null&&revision===null)return Response.json({ok:false,code:'REVISION_REQUIRED'},{status:422});
  if(revision!==null&&revision!==current)return Response.json({ok:false,code:'STOCK_JOURNAL_PAGE_CHANGED',restart:true},{status:409});
  const matches=value.map((item,position)=>({item,position})).filter(({item,position})=>(cursor===null||position>Number(cursor))&&(item.venueId==null||item.venueId===account.venueId)&&(item.sourceDocumentId===documentId||item.salesBatchId===documentId)).slice(0,limit+1);
  return Response.json({ok:true,venueId:account.venueId,sourceDocumentId:documentId,revision:current,items:matches.slice(0,limit).map(x=>x.item),next:matches.length>limit?matches[limit-1].position:null},{headers:{'Cache-Control':'private, no-store'}});
 }
 if(revision!==null&&!Number.isSafeInteger(Number(revision)))return Response.json({ok:false,code:'INVALID_PAGE'},{status:422});
 if(cursor!==null&&revision===null)return Response.json({ok:false,code:'REVISION_REQUIRED'},{status:422});
 try{return Response.json({ok:true,venueId:account.venueId,sourceDocumentId:documentId,...await journalPage(db,{accountId:account.id,venueId:account.venueId},cursor===null?null:Number(cursor),limit,revision===null?value.revision:Number(revision),documentId??undefined)},{headers:{'Cache-Control':'private, no-store'}});}
 catch(error){if(error instanceof StoreWriteConflictError)return Response.json({ok:false,code:'STOCK_JOURNAL_PAGE_CHANGED',restart:true},{status:409});throw error;}
}
