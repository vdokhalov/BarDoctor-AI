(function(root){
 'use strict';
 const validAmount=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
 function rows(orders,venue){const out=[];
 for(const order of Array.isArray(orders)?orders:[]){if(order.venueId!==venue)continue;
 const operations=Array.isArray(order.operations)?order.operations:[],tickets=Array.isArray(order.preparationTickets)?order.preparationTickets:[],seen=new Set();
 for(const ticket of tickets){if(ticket.kind!=='CANCELLATION'||ticket.venueId!==venue||ticket.orderId!==order.id||seen.has(ticket.id))continue;seen.add(ticket.id);
 const matches=operations.filter(op=>op.action==='cancel_item'&&op.id===ticket.batchId),op=matches.length===1?matches[0]:null,snapshot=op?.details?.cancelledLine;
 const lines=(ticket.lines||[]).map(line=>{const captured=snapshot&&snapshot.id===line.lineId&&snapshot.menuItemId===line.menuItemId&&snapshot.quantity===line.quantity&&!snapshot.pricingUnavailable;return {...line,total:captured&&validAmount(snapshot.total)?snapshot.total:null,currency:captured?snapshot.currency:null};});
 const currencies=new Set(lines.map(line=>line.currency));const known=lines.length>0&&lines.every(line=>validAmount(line.total)&&line.currency&&!line.pricingUnavailable)&&currencies.size===1;
 out.push({id:order.id+'::'+ticket.id,orderId:order.id,tableNumber:order.tableNumber,kind:'item',lines,amount:known?Math.round(lines.reduce((sum,line)=>sum+line.total,0)*100)/100:null,currency:known?lines[0].currency:null,cancelledAt:ticket.createdAt,fact:{details:{reason:ticket.reason},actor:ticket.createdBy},stockDecision:ticket.stockDecision||op?.details?.stockDecision||null});
 }
 if(order.status==='CANCELLED'&&!order.salesEventId&&!order.paidAt&&((order.lines||[]).length||!seen.size)){
 const lines=order.lines||[],ops=operations.filter(op=>op.action==='cancel_order'),currencies=new Set(lines.map(line=>line.currency)),known=lines.length>0&&lines.every(line=>validAmount(line.total)&&line.currency&&!line.pricingUnavailable)&&currencies.size===1;
 out.push({id:order.id,orderId:order.id,tableNumber:order.tableNumber,kind:'order',lines,amount:known?(validAmount(order.totals?.netAmount)?order.totals.netAmount:Math.round(lines.reduce((sum,line)=>sum+line.total,0)*100)/100):null,currency:known?lines[0].currency:null,cancelledAt:order.cancelledAt,fact:ops.length===1?ops[0]:null,stockDecision:null});
 }
 }
 return out.sort((a,b)=>(Date.parse(b.cancelledAt)||0)-(Date.parse(a.cancelledAt)||0)||a.id.localeCompare(b.id));
 }
 root.bdPosCancellationHistory=rows;
})(typeof window==='undefined'?globalThis:window);
