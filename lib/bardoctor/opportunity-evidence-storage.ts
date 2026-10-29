import {getD1} from '../../db';
import type {AuthenticatedAccount} from './auth';
import {hasPermission} from './access-control';
import {readStoreSnapshots} from './store-cas';
import {readSalesEvents} from './sales-event-storage';
import {operationalDays} from './operational-day';
import {accountingCurrencyFromRestaurantJson} from './currency';
import {canonicalVenueTimezone,venueClock,venueDate} from './venue-time';
import type {OpportunityVenueContext} from './opportunity-baseline';
type Day=ReturnType<typeof operationalDays>[number];
export async function loadOpportunityEvidenceDays(account:AuthenticatedAccount):Promise<Day[]|null>{
 if(!hasPermission(account,'shifts.view')||!hasPermission(account,'finance.view'))return null;
 try{
  const keys=['bd_finance_revenue','bd_sales_events_v1','bd_sales_documents','bd_operational_reports_v1'];
  const snapshots=await readStoreSnapshots(getD1(),account.id,keys);
  const events=await readSalesEvents(getD1(),account.id,snapshots.find(s=>s.key===keys[1])?.dataJson,undefined,{rows:10000,bytes:2000000});
  const read=(key:string)=>{const value=key===keys[1]?events:JSON.parse(snapshots.find(s=>s.key===key)?.dataJson??'[]');if(!Array.isArray(value)||value.length>10000)throw Error('HISTORY_UNAVAILABLE');return value.filter(row=>row&&typeof row==='object'&&row.venueId===account.venueId&&(row.dataAccountId==null||row.dataAccountId===account.id));};
  return operationalDays({venueId:account.venueId,dataAccountId:account.id,currency:accountingCurrencyFromRestaurantJson(account.restaurantJson),asOf:new Date().toISOString(),revenues:read(keys[0]),events:read(keys[1]),documents:read(keys[2]),reports:read(keys[3])});
 }catch{return null;}
}
