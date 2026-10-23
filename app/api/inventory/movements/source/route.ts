import {getD1} from '../../../../../db';
import {authenticatedEvidenceContext} from '../../../../../lib/bardoctor/evidence-resolver';
import {hasPermission} from '../../../../../lib/bardoctor/access-control';
import {derivedInputBelongs} from '../../../../../lib/bardoctor/derived-input-scope';
import {stockJournalMarker} from '../../../../../lib/bardoctor/stock-storage';
import {journalSelect} from '../../../../../lib/bardoctor/stock-journal';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
/** Navigation evidence only: never post, recost, or infer a document from date/product. */
export async function GET(request:Request){
 const c=await authenticatedEvidenceContext(request);if(!c)return reply({ok:false},401);
 if(!hasPermission(c.account,'inventory.view'))return reply({ok:false},403);
 const id=new URL(request.url).searchParams.get('movementId');if(!id||id.length>240)return reply({ok:false},422);
 try{
 const db=getD1(),scope={venueId:c.venueId,workspaceId:c.workspaceId,dataAccountId:c.account.id};
 const exact=async(key:string,value:string)=>{
  const rows=await db.prepare("SELECT j.value payload FROM domain_data d,json_each(CASE WHEN json_valid(d.data_json) THEN d.data_json ELSE '[]' END) j WHERE d.account_id=? AND d.store_key=? AND j.type='object' AND json_extract(j.value,'$.id')=? LIMIT 2").bind(c.account.id,key,value).all<{payload:string}>();
  return rows.results.map(x=>JSON.parse(x.payload));
 };
 const marker=await db.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_stock_movements'").bind(c.account.id).first<{data_json:string}>();
 const movements=stockJournalMarker(JSON.parse(marker?.data_json??'[]'))?await journalSelect(db,{accountId:c.account.id,venueId:c.venueId},'id',id,2):await exact('bd_stock_movements',id);
 const m=movements[0];if(movements.length!==1||!derivedInputBelongs(m,scope)||!['receipt','inventory_adjustment'].includes(m.type)||typeof m.sourceDocumentId!=='string'||!m.sourceDocumentId)return reply({ok:false,code:'SOURCE_UNAVAILABLE'},404);
 const purchase=m.type==='receipt',docs=await exact(purchase?'bd_purchase_documents':'bd_inventory_snapshots',m.sourceDocumentId),doc=docs[0];
 if(docs.length!==1||!derivedInputBelongs(doc,scope)||(purchase?doc.status!=='confirmed'||doc.documentType==='price_list':!['completed','confirmed'].includes(doc.status)))return reply({ok:false,code:'SOURCE_UNAVAILABLE'},404);
 const params=new URLSearchParams({venue:String(c.venueId),...(purchase?{documentId:doc.id}:{tab:'counts',inventory:doc.id})});
 return reply({ok:true,venueId:c.venueId,movementId:id,documentId:doc.id,href:(purchase?'/suppliers?':'/warehouse?')+params});
 }catch{return reply({ok:false,code:'SOURCE_UNAVAILABLE'},409);}
}
