import {getD1} from '../../../../db';
import {authenticateRequest,unauthorized} from '../../../../lib/bardoctor/auth';
import {hasPermission} from '../../../../lib/bardoctor/access-control';
import {journalPage} from '../../../../lib/bardoctor/stock-journal';
import {stockJournalMarker} from '../../../../lib/bardoctor/stock-storage';
import {StoreWriteConflictError} from '../../../../lib/bardoctor/store-cas';
/** Scoped keyset history. Clients keep the returned revision on every page. */
export async function GET(request:Request){
 const account=await authenticateRequest(request);if(!account)return unauthorized();
 if(!hasPermission(account,'inventory.view'))return Response.json({ok:false,code:'ACCESS_DENIED'},{status:403});
 const url=new URL(request.url),limit=Number(url.searchParams.get('limit')??100),cursor=url.searchParams.get('cursor'),revision=url.searchParams.get('revision');
 if(!Number.isSafeInteger(limit)||limit<1||limit>500||cursor!==null&&!Number.isSafeInteger(Number(cursor))||revision!==null&&!Number.isSafeInteger(Number(revision)))return Response.json({ok:false,code:'INVALID_PAGE'},{status:422});
 const db=getD1(),row=await db.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_stock_movements'").bind(account.id).first<{data_json:string}>();
 const value=row?JSON.parse(row.data_json):[];
 if(!stockJournalMarker(value))return Response.json({ok:false,code:'STOCK_JOURNAL_NOT_MIGRATED',legacyEndpoint:'/api/store/bd_stock_movements'},{status:409});
 if(cursor!==null&&revision===null)return Response.json({ok:false,code:'REVISION_REQUIRED'},{status:422});
 try{return Response.json({ok:true,venueId:account.venueId,...await journalPage(db,{accountId:account.id,venueId:account.venueId},cursor===null?null:Number(cursor),limit,revision===null?value.revision:Number(revision))},{headers:{'Cache-Control':'private, no-store'}});}
 catch(error){if(error instanceof StoreWriteConflictError)return Response.json({ok:false,code:'STOCK_JOURNAL_PAGE_CHANGED',restart:true},{status:409});throw error;}
}
