import { managementActionsFixture } from './management-actions-fixture';
import type { CuratedAnswer, CuratedQuestionId } from '../../lib/bardoctor/curated-doctor-contracts';
export async function curatedDoctorFixture(extraRoutes:Record<string,string>={}){
 const r=await managementActionsFixture({curated:'./app/api/ai/[action]/route',evaluateCost:'./app/api/management/cost-signals/evaluate/route',costs:'./app/api/management/cost-signals/route',detail:'./app/api/management/cost-signals/[id]/route',verifyCost:'./app/api/management/cost-signals/[id]/verify/route',...extraRoutes});
 const profile=JSON.parse(String(r.sqlite.prepare('SELECT restaurant_json FROM accounts WHERE id=?').get(r.account)?.restaurant_json??'{}'));
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({...profile,name:'QA Phase 4C — работающая кофейня',businessType:'cafe',country:'Test',city:'Isolated'}),r.account);
 const read=(key:string)=>JSON.parse(String(r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(r.account,key)?.data_json??'null'));
 const a=read('bd_assortment_v1');
 a.menuItems.push({id:'qa-tea',name:'QA Чай',venueId:r.venueId,active:true,consumptionMode:'RECIPE',type:'composite',currency:'MDL',salePrice:40});
 a.recipes.push({id:'qa-tea-recipe',menuItemId:'qa-tea',ownerId:'qa-tea',ownerType:'menu_item',venueId:r.venueId,status:'confirmed',reviewStatus:'approved',current:true,version:1,ingredients:[{id:'qa-tea-ingredient',name:'QA Чайный лист',quantity:1,unit:'pcs',purchaseProductKey:'product:tea',nomenclatureItemId:'qa-tea-leaf',linkSource:'manual',linkConfirmedByUser:true,linkStatus:'linked',venueId:r.venueId}]});
 a.nomenclature.push({id:'qa-tea-leaf',key:'product:tea',productKey:'product:tea',name:'QA Чайный лист',unit:'pcs',unitModelVersion:4,active:true,venueId:r.venueId});
 r.seed('bd_assortment_v1',a);r.seed('bd_purchase_documents',[]);
 r.seed('bd_finance_expenses',[{id:'qa-current-rent',venueId:r.venueId,date:'2026-10-01',amount:30,category:'rent',currency:'MDL'},{id:'qa-current-utilities',venueId:r.venueId,date:'2026-10-02',amount:12,category:'utilities',currency:'MDL'}]);
 r.seed('bd_payroll_entries',[{id:'qa-current-paid',venueId:r.venueId,date:'2026-10-02',amount:25,type:'payment',currency:'MDL'}]);
 const approved=JSON.parse(JSON.stringify(a));a.recipes[0].status='draft';a.recipes[0].reviewStatus='requires_review';r.seed('bd_assortment_v1',a);
 const evaluated=await r.api.evaluateCost.POST(r.requestAction('/api/management/cost-signals/evaluate','POST',{menuItemId:'qa-tea'}));if(!evaluated.ok)throw Error(await evaluated.text());r.seed('bd_assortment_v1',approved);
 const ask=async(question:CuratedQuestionId)=>{
  const response=await r.api.curated.GET(r.requestAction(`/api/ai/curated?question=${question}&venueId=${r.venueId}`),{params:Promise.resolve({action:'curated'})} as never);
  if(!response.ok)throw Error(await response.text());return (await response.json() as {data:CuratedAnswer}).data;
 };
 return {...r,read,ask};
}
