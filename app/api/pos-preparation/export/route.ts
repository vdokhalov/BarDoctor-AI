import { authenticateRequest, unauthorized } from '../../../../lib/bardoctor/auth';
import { hasPermission, canManagePosPrivilegedAction } from '../../../../lib/bardoctor/access-control';
import { getD1 } from '../../../../db';
import { readStoreSnapshots } from '../../../../lib/bardoctor/store-cas';
import { parsePosOrders, POS_ORDER_STORE_KEY } from '../../../../lib/bardoctor/pos-orders';
/** Stage-one explicit export. Never claims delivery or updates the original tickets. */
export async function GET(request:Request){
 const account=await authenticateRequest(request);if(!account)return unauthorized();
 if(!hasPermission(account,'sales.create')||!canManagePosPrivilegedAction(account))return Response.json({ok:false,code:'ACCESS_DENIED'},{status:403});
 const orderId=new URL(request.url).searchParams.get('orderId');
 if(!orderId||orderId.length>120)return Response.json({ok:false,code:'ORDER_REQUIRED'},{status:400});
 const snapshots=await readStoreSnapshots(getD1(),account.id,[POS_ORDER_STORE_KEY]);
 try{
  const orders=parsePosOrders(JSON.parse(snapshots[0].dataJson??'[]'));
  const order=orders.find(o=>o.venueId===account.venueId&&o.id===orderId);
  if(!order)return Response.json({ok:false,code:'ORDER_NOT_FOUND'},{status:404});
  const tickets=(order.preparationTickets??[]).map(t=>({id:t.id,venueId:t.venueId,orderId:t.orderId,tableNumber:t.tableNumber,sectionId:t.sectionId,sectionName:t.sectionName,printerId:t.printerId,routeRevision:t.routeRevision,kind:t.kind??'PREPARATION',originalTicketId:t.originalTicketId??null,reason:t.reason??null,createdAt:t.createdAt,lines:t.lines.map(l=>({name:l.name,quantity:l.quantity}))}));
  return Response.json({version:1,venueId:account.venueId,tickets},{headers:{'Cache-Control':'private, no-store','Content-Disposition':'attachment; filename="bardoctor-tickets.json"'}});
 }catch{return Response.json({ok:false,code:'PREPARATION_NEEDS_REVIEW'},{status:409})}
}
