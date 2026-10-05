import {closingFixture} from './month-close-fixture';
import {HEALTH_OPERATIONS_KEYS} from '../../lib/bardoctor/health-operations-inputs';
import {VENUE_CONTEXT_SOURCES} from '../../lib/bardoctor/venue-context-access';
export type ManagementReply={data:{businessHealthSnapshot:{managementQueue:Record<string,unknown>[];managementTopActions:Record<string,unknown>[]}};verification:{result:string;target:{path:string};inputRevision:string;resolutionAuthority:string;causalClaim:string}};
export async function managementActionsFixture(extraRoutes:Record<string,string>={}) {
 const r=await closingFixture({writeoffs:'./app/api/write-offs/route',activeVenue:'./app/api/access/active-venue/route',days:'./app/api/operational-days/route',verifyAction:'./app/api/business-health/verify/route',doctor:'./lib/bardoctor/ai-handlers',closeReport:'./app/api/shifts/close/route',counts:'./app/api/inventory/counts/route',...extraRoutes});
 for(const key of new Set([...Object.values(VENUE_CONTEXT_SOURCES).flat(),...HEALTH_OPERATIONS_KEYS,'bd_tasks','bd_action_tasks','bd_decisions']))if(!r.sqlite.prepare('SELECT 1 FROM domain_data WHERE account_id=? AND store_key=?').get(r.account,key))r.seed(key,key==='bd_assortment_v1'?{menuItems:[],recipes:[],nomenclature:[],stockBalances:[]}:[]);
 r.seed('bd_finance_expenses',[{id:'qa-rent',venueId:r.venueId,date:'2026-09-02',amount:1000,category:'rent',currency:'MDL'}]);
 const preview=await(await r.get()).json();if(!preview.eligible)throw Error(JSON.stringify(preview));
 const closed=await r.post({previewRevision:preview.previewRevision});if(!closed.ok)throw Error(await closed.text());
 r.seed('bd_employees',[{id:'qa-barista',name:'QA Бариста',status:'active',venueId:r.venueId,payrollRuleId:'qa-shift-rule'}]);
 r.seed('bd_payroll_rules',[{id:'qa-shift-rule',name:'QA ставка смены',venueId:r.venueId,blocks:[{id:'qa-rate',enabled:true,type:'shift_rate',amount:20}]}]);
 r.seed('bd_cases',[{id:'qa-critical',venueId:r.venueId,title:'Проверить критическое происшествие',priority:'critical',status:'open'}]);
 r.seed('bd_tasks',[{id:'qa-overdue-task',issueKey:'safety',title:'Проверить безопасное состояние',priority:'critical',approvalStatus:'approved',status:'in_progress',deadline:'2026-10-02',updatedAt:'2026-10-01T12:00:00Z'}]);
 r.seed('bd_finance_revenue',[{id:'qa-cash',venueId:r.venueId,date:'2026-10-02',revenueSource:'sales_events_v1',closingStatus:'closed',revenue:200,receipts:4,currency:'MDL'}]);
 r.seed('bd_sales_events_v1',[{id:'qa-sale',venueId:r.venueId,businessDate:'2026-10-02',revenueRowId:'qa-cash',status:'POSTED',source:'POS_API',revenue:200,currency:'MDL',payments:[{method:'CASH',amount:200}]}]);r.seed('bd_stock_movements',[]);r.seed('bd_operational_reports_v1',[]);
 r.seed('bd_assortment_v1',{menuItems:[{id:'qa-water',name:'QA Вода',venueId:r.venueId,active:true,consumptionMode:'NONE',salePrice:50}],recipes:[],nomenclature:[{id:'qa-stock',productKey:'product:stock',key:'product:stock',kind:'stock',unitModelVersion:4,unit:'pcs',name:'QA Стаканы',active:true,venueId:r.venueId}],stockBalances:[{productKey:'product:stock',name:'QA Стаканы',unit:'pcs',current:2,minimum:5,openingDocumentId:'qa-opening',venueId:r.venueId}]});
 r.seed('bd_inventory_snapshots',[]);r.seed('bd_opening_stock_v1',[{id:'qa-opening',venueId:r.venueId,status:'confirmed',createdAt:'2026-10-01T12:00:00Z',anchorBoundary:{movements:[]},items:[{id:'qa-opening-line',productKey:'product:stock',unit:'pcs',quantity:2}]}]);
 const request=(path:string,method='GET',body?:unknown,user=r.user,venue=r.venueId)=>{const req=r.request(user,path,method,body);req.headers.set('X-Venue-Id',String(venue));return req};
 const read=async()=>{const response=await r.api.health.GET(request('/api/business-health'));if(!response.ok)throw Error(await response.text());return response.json() as Promise<ManagementReply>};
 const verify=async(id:string)=>{const response=await r.api.verifyAction.GET(request('/api/business-health/verify?actionId='+encodeURIComponent(id)));if(!response.ok)throw Error(await response.text());return response.json() as Promise<ManagementReply>};
 return {...r,requestAction:request,readHealth:read,verifyAction:verify};
}
