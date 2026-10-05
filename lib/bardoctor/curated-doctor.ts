import { authenticateReadOnlyRequest, unauthorized } from './auth';
import { canReadSavedDiagnosis, restrictedVenueContext } from './venue-context-access';
import { hasPermission } from './access-control';
import { loadCanonicalHealthInputs } from './canonical-health-inputs';
import { boundSource, SOURCE_SELECTORS } from './canonical-input-evidence';
import { observeCurrentCost, COST_SOURCE_KEYS, canonicalItemId, record } from './management-cost-observation';
import { COST_WHY } from './management-cost-contracts';
import { readFinanceInputs } from './finance-inputs';
import { venueDate, venueTimeFromJson } from './venue-time';
import { CURATED_QUESTIONS, isCuratedQuestion, type CuratedQuestionId, type CuratedAnswer, type CuratedAction, type CuratedFact } from './curated-doctor-contracts';

type Canonical = Extract<NonNullable<Awaited<ReturnType<typeof loadCanonicalHealthInputs>>>, { restricted: false }>;
const LABELS: Record<string, string> = { bd_tasks:'Задачи', bd_action_tasks:'Поручения', bd_cases:'Происшествия', bd_assortment_v1:'Меню, техкарты и остатки', bd_purchase_documents:'Подтверждённые закупки', bd_stock_movements:'Движения склада', bd_inventory_snapshots:'Инвентаризации', bd_opening_stock_v1:'Начальные остатки', bd_finance_revenue:'Смены и выручка', bd_operational_reports_v1:'Отчёты рабочих дней', bd_sales_events_v1:'События продаж', bd_sales_documents:'Документы продаж', bd_finance_expenses:'Зарегистрированные расходы', bd_payroll_entries:'Записи расчётов с сотрудниками' };
const DOMAIN_KEYS: Record<CuratedQuestionId, string[]> = {
 attention: [], next: [], cost: COST_SOURCE_KEYS,
 stock:['bd_assortment_v1','bd_inventory_snapshots','bd_opening_stock_v1','bd_stock_movements'],
 shifts:['bd_finance_revenue','bd_operational_reports_v1','bd_sales_events_v1','bd_sales_documents'],
 expenses:['bd_finance_revenue','bd_operational_reports_v1','bd_sales_events_v1','bd_sales_documents','bd_finance_expenses','bd_payroll_entries'],
 tasks:['bd_tasks','bd_action_tasks'],
};
/** Read projections only: no LLM, persistence, inferred causes or second ranking. */
export async function buildCuratedAnswer(c: Canonical, question: CuratedQuestionId): Promise<CuratedAnswer> {
 const scope=c.snapshot.inputManifest.scope, asOf=c.snapshot.generatedAt;
 const time=venueTimeFromJson(c.profileJson), today=venueDate(asOf,time.timezone);
 const source=(key:string)=>c.sources.find(value=>value.key===key);
 const usable=(key:string)=>{const s=source(key),declared=record(s?.data);if(Array.isArray(s?.data)){const ids=s.data.map(v=>record(v).id);if(ids.some(id=>id==null)||new Set(ids).size!==ids.length||s.data.some(v=>record(v).stale===true||record(v).sourceConflict===true))return false;}return s?.state==='AVAILABLE' && !['STALE','PARTIAL','UNAVAILABLE','CONFLICT'].includes(String(declared.sourceState)) && declared.stale!==true && declared.sourceConflict!==true;};
 const rows=(key:string)=>usable(key)&&Array.isArray(source(key)?.data)?source(key)!.data as Record<string,unknown>[]:[];
 const keys=DOMAIN_KEYS[question].length?DOMAIN_KEYS[question]:c.sources.map(s=>s.key);
 const refs=async(selected:string[])=>Promise.all(selected.filter(key=>usable(key)&&Object.hasOwn(SOURCE_SELECTORS,key)).slice(0,20).map(key=>boundSource(scope,key,source(key)!.data)));
 const queue=c.intelligence.managementQueue ?? [];
 const target=(item:Record<string,unknown>):CuratedAction|null=>{
  const t=record(item.target);if(typeof t.path!=='string'||!t.path.startsWith('/')||t.path.startsWith('//'))return null;
  const url=new URL(t.path,'https://venue.invalid');if(url.searchParams.has('venueId')&&url.searchParams.get('venueId')!==String(scope.venueId))return null;
  url.searchParams.set('venueId',String(scope.venueId));
  return {id:String(item.managementId??item.recommendationId??item.linkedTaskId??item.issueKey),label:String(t.label??'Открыть источник'),path:url.pathname+url.search,verification:'CANONICAL_SERVER_REREAD'};
 };
 const limitations=keys.filter(key=>!usable(key)).map(key=>`${LABELS[key]??'Источник данных'}: данные отсутствуют, неполны или требуют проверки.`);
 const fact=(id:string,label:string,value:number|string|null,detail:string,evidence:CuratedFact['evidence'],kind:CuratedFact['kind']=value===null?'UNKNOWN':'FACT'):CuratedFact=>({id,label,value,detail,evidence,kind});
 const queueFact=async(item:Record<string,unknown>):Promise<CuratedFact>=>{
  const relevant=item.linkedTaskId?['bd_tasks']:item.issueKey==='operational-blocker'?['bd_cases']:item.issueKey==='stock'?DOMAIN_KEYS.stock:item.issueKey==='unclosed-shifts'?DOMAIN_KEYS.shifts:item.issueKey==='recipes'?DOMAIN_KEYS.cost:item.issueKey==='profit'? [...DOMAIN_KEYS.expenses,'bd_month_closings']:keys;
  const complete=relevant.every(usable);
  return {...fact(String(item.managementId??item.recommendationId??item.linkedTaskId??item.issueKey),String(item.title??'Проверить сигнал'),complete?String(item.fact??item.reason??''):null,[item.reason,item.consequence,item.action,complete?'':'Источники этого вывода неполны; его достоверность ограничена.'].filter(Boolean).join(' '),await refs(relevant),complete?'DERIVED_FACT':'UNKNOWN'),priority:String(item.priority??'medium'),deadline:item.taskDeadlineDate?String(item.taskDeadlineDate):item.deadline?String(item.deadline):null,status:String(c.memory.tasks.find(task=>task.id===item.linkedTaskId)?.status??item.lifecycle??'active'),action:target(item)};
 };
 let facts:CuratedFact[]=[], total:number|null=0, answer='', period:CuratedAnswer['period']={startDate:null,endDate:today,label:'Текущее зарегистрированное состояние',timezone:time.timezone};
 if(question==='attention'||question==='next'){
  const selected=question==='attention'?queue.slice(0,3):queue.slice(0,1);
  facts=await Promise.all(selected.map(queueFact));total=queue.length;
  answer=selected.length?(question==='attention'?'Главные вопросы из общей управленческой очереди Business Health.':'Начните с первого приоритета общей очереди Business Health.'):'В текущей очереди нет подтверждённых приоритетов.';
  if(!queue.length)limitations.push('Пустая очередь не подтверждает, что все реальные проблемы бизнеса отсутствуют.');
  if(selected[0]&&!target(selected[0]))limitations.push('Точное место исправления этого приоритета не подтверждено. Проверьте основание сигнала в Business Health; адрес исправления не придуман.');
  if(c.snapshot.managementCoverage.cost==='PARTIAL')limitations.push('Не все текущие сигналы себестоимости попали в ограниченный снимок.');
 } else if(question==='cost'){
  const items=Array.isArray(record(source('bd_assortment_v1')?.data).menuItems)?(record(source('bd_assortment_v1')?.data).menuItems as unknown[]).map(record).filter(item=>item.active!==false&&item.consumptionMode==='RECIPE'):[];
  total=usable('bd_assortment_v1')?items.length:null;
  // Observe bounded items sequentially: each calculator parses retained stores.
  // Concurrent copies of large venue sources would exceed the Worker memory budget.
  for(const item of items.slice(0,25)){
   const result=await observeCurrentCost({scope,snapshots:c.sourceSnapshots,profileJson:c.profileJson,menuItemId:String(item.id),now:asOf});const o=result.observation;
   const signal=queue.find(q=>q.issueKey==='recipes'&&q.affectedEntity===item.id);
   const blockText=(o.blockingIngredients??[]).map(b=>`${b.name}: ${b.reason==='NOMENCLATURE_MISSING'?'нет номенклатуры':b.reason==='LINK_MISSING'?'связь ингредиента не подтверждена':b.reason==='PRICE_UNKNOWN'?'закупочная стоимость UNKNOWN':'единицы или количество требуют проверки'}.`).join(' ');
   const action=signal?target(signal):usable('bd_assortment_v1')&&canonicalItemId(item.id)&&!o.reasonCodes.includes('SOURCE_INVALID')?{id:String(item.id),label:'Найти позицию в техкартах',path:`/catalog?venueId=${scope.venueId}&tab=recipes&q=${encodeURIComponent(result.itemName)}`,verification:'EXISTING_DOMAIN_READ' as const}:null;
   facts.push({...fact(String(item.id),result.itemName,o.value,o.status==='UNKNOWN'?o.reasonCodes.map(code=>COST_WHY[code]).join(' ')+' '+blockText:'Текущая стоимость рассчитана по подтверждённой техкарте и авторитетным закупочным данным.',o.evidence,o.status==='UNKNOWN'?'UNKNOWN':'DERIVED_FACT'),status:o.status,reasonCodes:[...new Set([...o.reasonCodes,...(o.blockingIngredients??[]).map(b=>b.reason)])],currency:o.currency,unit:'за единицу позиции',action});
  }
  facts=[...facts.filter(f=>f.kind==='UNKNOWN'),...facts.filter(f=>f.kind!=='UNKNOWN')];
  answer=facts.some(f=>f.kind==='UNKNOWN')?'Есть позиции с UNKNOWN себестоимостью. Неизвестная стоимость не считается нулевой.':facts.length?'Текущая себестоимость показанных позиций подтверждена.':'Нет данных о текущих позициях с техкартами.';
  limitations.push('Это текущая себестоимость техкарт; историческая стоимость продаж и прибыль здесь не пересчитываются.');
 } else if(question==='stock'){
  const stock=c.snapshot.operationsInputs.stockFacts??[], complete=keys.every(usable)&&c.snapshot.operationsInputs.counters.stockAnomalies.availability==='AVAILABLE';total=complete?stock.length:null;
  facts=await Promise.all([...stock.filter(f=>f.active),...stock.filter(f=>!f.active)].slice(0,10).map(async item=>({...fact(item.managementId,item.name,complete&&item.evidenceComplete?item.quantity:null,complete&&item.evidenceComplete?`Подтверждённый остаток${item.minimum!==null?`; зарегистрированный минимум ${item.minimum} ${item.unit}`:''}.`:'Нет полной цепочки подтверждения остатка.',await refs(keys),'DERIVED_FACT'),kind:complete&&item.evidenceComplete?'DERIVED_FACT':'UNKNOWN',unit:item.unit,action:complete?target(record(c.snapshot.operationsInputs.issues?.find(issue=>issue.managementId===item.managementId))):null})));
  answer=complete?'Текущее состояние подтверждённых складских остатков.':'Недостаточно полных данных для достоверной картины склада.';
  limitations.push('Низкий остаток сам по себе не означает «нужно купить». Количество и необходимость закупки без подтверждённого правила пополнения не определяются.','Складские позиции показаны раздельно по товару, складу и единице.');
 } else if(question==='shifts'){
  const days=c.snapshot.operationsInputs.days, dayOrder=new Map(queue.filter(q=>q.issueKey==='unclosed-shifts').map((q,index)=>[String(q.managementId),index])), complete=keys.every(usable)&&c.snapshot.operationsInputs.counters.unclosedShifts.availability==='AVAILABLE';total=complete?days.length:null;
  const states:Record<string,string>={COMPLETE:'День заполнен',OPERATING:'Смена ещё работает',AWAITING_OPERATIONAL_DATA:'Операционный отчёт или данные дня неполны'};
  facts=await Promise.all([...days].sort((a,b)=>(dayOrder.get(String(a.managementId))??Infinity)-(dayOrder.get(String(b.managementId))??Infinity)||b.businessDate.localeCompare(a.businessDate)).slice(0,10).map(async day=>({...fact(day.businessDate,`Рабочий день ${day.businessDate}`,complete?day.status:null,complete?`${states[day.status]??day.status}. Отчёт ${day.reportSaved?'сохранён':'не сохранён'}. Кассовые смены: ${day.cashShiftStatuses.map(s=>s.toUpperCase()==='OPEN'?'открыта':s.toUpperCase()==='CLOSED'?'закрыта':s).join(', ')||'не зарегистрированы'}.`:'Источники рабочего дня неполны.',await refs(keys)),status:complete?day.status:'UNKNOWN',action:complete?target(record(c.snapshot.operationsInputs.issues?.find(issue=>issue.managementId===day.managementId))):null})));
  answer=complete?(days.some(d=>d.status==='AWAITING_OPERATIONAL_DATA')?'Есть рабочие дни с неполными операционными данными.':'Показаны зарегистрированные рабочие дни и состояния смен.'):'Недостаточно данных для проверки смен.';
  limitations.push('Работающая смена не считается нарушением. Неполный день не подтверждает окончательный результат дня.');
 } else if(question==='expenses'){
  const startDate=today.slice(0,7)+'-01';period={startDate,endDate:today,label:`Зарегистрировано за текущий учётный месяц: ${startDate} — ${today}`,timezone:time.timezone};
  const f=readFinanceInputs({...scope,currency:c.context.accountingCurrency,asOf,startDate,endDate:today,revenues:rows('bd_finance_revenue'),reports:rows('bd_operational_reports_v1'),events:rows('bd_sales_events_v1'),documents:rows('bd_sales_documents'),expenses:rows('bd_finance_expenses'),payrollEntries:rows('bd_payroll_entries'),expensesAvailable:usable('bd_finance_expenses'),payrollEntriesAvailable:usable('bd_payroll_entries')});
  const expenseDatesValid=rows('bd_finance_expenses').every(row=>/^\d{4}-\d{2}$/.test(String(row.accountingMonth??String(row.date).slice(0,7)))&&(!row.date||/^\d{4}-\d{2}-\d{2}$/.test(String(row.date))));
  if(!expenseDatesValid)limitations.push('Даты зарегистрированных расходов требуют проверки; сумма не подтверждена.');
  const operating=expenseDatesValid?f.operatingExpenses:null;
  const payrollAvailable=keys.every(usable);
  facts=[{...fact('registered-operating-expenses','Зарегистрированные расходы без ФОТ',operating,'Сумма активных записей Finance за учётный месяц; это не стоимость списанных ингредиентов.',await refs(['bd_finance_expenses']),'DERIVED_FACT'),kind:operating===null?'UNKNOWN':'DERIVED_FACT',currency:f.currency},
   {...fact('registered-payroll','Зарегистрированный начисленный ФОТ',payrollAvailable?f.payroll:null,'Сохранённый ФОТ рабочих дней и зарегистрированные бонусы. Выплаты сотрудникам показаны отдельно.',await refs(keys),'DERIVED_FACT'),kind:payrollAvailable&&f.payroll!==null?'DERIVED_FACT':'UNKNOWN',currency:f.currency},
   {...fact('registered-payroll-paid','Зарегистрированные выплаты сотрудникам',usable('bd_payroll_entries')?f.payrollPaid:null,'Записи выплаты не приравниваются к начисленному ФОТ и не прибавляются к нему повторно.',await refs(['bd_payroll_entries']),'DERIVED_FACT'),kind:usable('bd_payroll_entries')&&f.payrollPaid!==null?'DERIVED_FACT':'UNKNOWN',currency:f.currency}];total=3;
  answer='Показаны только зарегистрированные расходы и расчёты с сотрудниками, а не все реальные расходы заведения.';
  limitations.push('Полнота регистрации всех реальных расходов не подтверждена. Прибыль из этих сумм не выводится.','Расходы учитываются по учётному месяцу. Оплата поставщику не равна себестоимости продаж.');
  if(f.payroll===null||!payrollAvailable)limitations.push('Начисленный ФОТ неполон или неизвестен: отчёты дней и записи расчётов требуют проверки.');
  const go:CuratedAction={id:'registered-expenses',label:'Открыть зарегистрированные расходы',path:`/finance?venueId=${scope.venueId}&month=${today.slice(0,7)}`,verification:'EXISTING_DOMAIN_READ'};facts[0].action=go;
 } else {
  const selected=queue.filter(item=>item.linkedTaskId&&(item.priority==='critical'||item.lifecycle==='overdue'||String(item.taskDeadlineDate??'9999')<asOf.slice(0,10)));
  total=usable('bd_tasks')?selected.length:null;facts=await Promise.all(selected.slice(0,10).map(queueFact));
  answer=usable('bd_tasks')?(selected.length?'Просроченные или критичные задачи в порядке общей очереди Business Health.':'В текущей управленческой очереди нет просроченных или критичных задач.'):'Недостаточно данных о задачах.';
  limitations.push('Показаны задачи из общей управленческой очереди; черновики и ожидающие согласования в неё не входят. Закрытие задачи само по себе не доказывает устранение исходной проблемы.','Сроки задач в канонической очереди определяются существующей политикой Phase 4B (дата UTC).');
 }
 if(total===null||total===0)limitations.push('Отсутствие записей или недоступный источник не означает отсутствие реальной деятельности.');
 if(total!==null&&total>facts.length)limitations.push(`Показано ${facts.length} из ${total}; остальное доступно в исходном разделе.`);
 if(!time.timezoneConfigured)limitations.push('Часовой пояс заведения не настроен; даты этого ответа используют UTC.');
 const nextActions=facts.map(f=>f.action).filter((a):a is CuratedAction=>Boolean(a)).slice(0,3);
 if((question==='attention'||question==='next')&&facts.length&&!nextActions.length)nextActions.push({id:'canonical-evidence',label:'Проверить основание в Business Health',path:`/health?venueId=${scope.venueId}`,verification:'CANONICAL_SERVER_REREAD'});
 return {version:'curated-doctor-v1',question:{id:question,label:CURATED_QUESTIONS.find(q=>q.id===question)!.label},authority:'DETERMINISTIC_CANONICAL_SERVER',causalClaim:'NONE',scope,asOf,inputRevision:c.snapshot.inputRevision,answer,facts,limitations:[...new Set(limitations)],nextActions,period,coverage:{shown:facts.length,total,complete:total!==null&&total===facts.length&&keys.every(usable)},sources:keys.map(key=>{const s=source(key);return {label:LABELS[key]??'Данные Business Health',key,state:usable(key)?'AVAILABLE':s?.state==='AVAILABLE'?'PARTIAL':s?.state??'UNAVAILABLE',updatedAt:s?.updatedAt??null,revision:s?.revision??null};}),availability:keys.every(usable)&&facts.every(f=>f.kind!=='UNKNOWN')?'AVAILABLE':facts.length?'PARTIAL':'UNAVAILABLE',canonicalPriorityIds:queue.slice(0,3).map(item=>String(item.managementId??item.recommendationId??item.linkedTaskId??item.issueKey)),suggestedQuestion:question};
}
export async function curatedDoctorRequest(request:Request):Promise<Response>{
 const finish=(r:Response)=>{r.headers.set('Cache-Control','private, no-store, max-age=0');r.headers.set('Pragma','no-cache');return r;};
 const account=await authenticateReadOnlyRequest(request);if(!account)return finish(unauthorized());
 const params=new URL(request.url).searchParams, question=params.get('question');
 if(!isCuratedQuestion(question)||[...params.keys()].some(k=>!['question','venueId'].includes(k)||params.getAll(k).length!==1))return finish(Response.json({success:false,error:'Неизвестный вопрос или недопустимый контекст'},{status:400}));
 if(params.has('venueId')&&params.get('venueId')!==String(account.venueId))return finish(Response.json({success:false,error:'Заведение недоступно'},{status:404}));
 if(!hasPermission(account,'analysis.run')||!canReadSavedDiagnosis(account))return finish(restrictedVenueContext());
 const canonical=await loadCanonicalHealthInputs(account);if(!canonical)return finish(unauthorized());if(canonical.restricted||!canReadSavedDiagnosis(canonical.account))return finish(restrictedVenueContext());
 return finish(Response.json({success:true,data:await buildCuratedAnswer(canonical,question)}));
}
