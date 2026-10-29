import {getD1} from '../../db';
/** Read only: never treat a missing legacy calendar as proof of source cancellation. */
export async function holidaySourceHeld(venueId:number,sourceId:string|null):Promise<boolean>{
 const prefix=`venue:${venueId}:`;if(!sourceId?.startsWith(prefix))return false;
 const row=await getD1().prepare("SELECT c.data_json FROM domain_data c JOIN venues v ON v.data_account_id=c.account_id WHERE v.id=? AND c.store_key='bd_opportunity_calendar_v1'").bind(venueId).first<{data_json:string}>();
 try{const calendar=JSON.parse(row?.data_json??'null');return calendar?.events?.some((event:{id:string;sourceMissing?:boolean;sourceScheduleChanged?:boolean})=>event.id===sourceId.slice(prefix.length)&&(event.sourceMissing===true||event.sourceScheduleChanged===true))===true;}catch{return false;}
}
/** Included in the same CAS transaction as the calendar change. In-flight/provider jobs stay untouched. */
export function cancelUnsentHolidayStatements(venueId:number,eventIds:string[],now:string){
 const db=getD1();return eventIds.flatMap(id=>{
  const source=`venue:${venueId}:${id}`;
  const predicate="venue_id=? AND source_type='opportunity' AND source_id=? AND status IN ('queued','failed') AND provider_message_id IS NULL";
  return [db.prepare(`INSERT INTO notification_job_events(job_id,from_status,to_status,detail,created_at) SELECT id,status,'cancelled','Дата больше не подтверждается источником',? FROM notification_jobs WHERE ${predicate}`).bind(now,venueId,source),db.prepare(`UPDATE notification_jobs SET status='cancelled',leased_at=NULL,last_error=NULL,updated_at=? WHERE ${predicate}`).bind(now,venueId,source)];
 });
}
