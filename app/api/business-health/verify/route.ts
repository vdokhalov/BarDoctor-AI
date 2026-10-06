import { authenticateReadOnlyRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { loadCanonicalHealthInputs } from "../../../../lib/bardoctor/canonical-health-inputs";

/** Read-only condition check. Opening a screen and accepting a save are never
 * resolution evidence. The existing domain operations remain the only writers. */
export async function GET(request: Request): Promise<Response> {
  const account = await authenticateReadOnlyRequest(request);
  if (!account) return unauthorized();
  const json = (value:unknown,status=200) => Response.json(value,{status,headers:{"Cache-Control":"private, no-store"}});
  if (!hasPermission(account,"analysis.run")) return json({success:false,code:"ACCESS_DENIED"},403);
  const id=new URL(request.url).searchParams.get("actionId");
  if (!id || id.length>1200 || !id.startsWith(`health:${account.venueId}:`)) return json({success:false,code:"INVALID_ACTION_CONTEXT"},404);
  const kind=id.slice(`health:${account.venueId}:`.length).split(":")[0];
  if (!['day','stock'].includes(kind)) return json({success:false,code:"UNSUPPORTED_ACTION"},400);
  const canonical=await loadCanonicalHealthInputs(account);
  if (!canonical) return unauthorized();
  if (canonical.restricted) return json({success:false,code:"ACCESS_DENIED"},403);
  const operations=canonical.snapshot.operationsInputs;
  const counter=operations.counters[kind==='day'?'unclosedShifts':'stockAnomalies'];
  const current=operations.issues?.find(item=>item.managementId===id);
  const fact=kind==='day'?operations.days.find(day=>day.managementId===id):operations.stockFacts?.find(stock=>stock.managementId===id);
  let result:'ACTIVE'|'CONDITION_CLEARED'|'CANNOT_VERIFY'|'NOT_APPLICABLE'='CANNOT_VERIFY';
  if (kind==='stock'&&fact&&'evidenceComplete' in fact) {
    if(fact.evidenceComplete)result=fact.active?'ACTIVE':'CONDITION_CLEARED';
  } else if (counter.availability==='AVAILABLE') {
    if (!fact) result='NOT_APPLICABLE';
    else if (kind==='day') result='status' in fact && fact.status==='COMPLETE'?'CONDITION_CLEARED': 'status' in fact && fact.status==='AWAITING_OPERATIONAL_DATA'?'ACTIVE':'CANNOT_VERIFY';
    else if ('evidenceComplete' in fact && fact.evidenceComplete) result=fact.active?'ACTIVE':'CONDITION_CLEARED';
  }
  const canAct=hasPermission(canonical.account,"inventory.manage")&&(kind==='stock'||hasPermission(canonical.account,"shifts.manage"));
  return json({success:true,verification:{actionId:id,kind,result,checkedAt:canonical.snapshot.generatedAt,inputRevision:canonical.snapshot.inputRevision,
    resolutionAuthority:"CANONICAL_SERVER_REREAD",causalClaim:"NONE",target:result==='ACTIVE'&&canAct?current?.target ?? null:null,
    context:kind==='day'&&fact&&'businessDate' in fact?{businessDate:fact.businessDate}:kind==='stock'&&fact&&'productKey' in fact?{productKey:fact.productKey,warehouseKey:fact.warehouseKey,unit:fact.unit}:null,
    message:result==='CONDITION_CLEARED'?"Проверено по текущим источникам: исходное условие проблемы устранено.":result==='ACTIVE'?"Проблема ещё существует. Открытие экрана или сохранение без изменения условия её не закрывает.":result==='NOT_APPLICABLE'?"Исходный объект больше не доступен для этой проверки. Исправление не подтверждено.":"Источников недостаточно для подтверждения исправления. Повторите проверку."},
    data:{businessHealthSnapshot:canonical.snapshot,intelligence:canonical.intelligence}});
}
