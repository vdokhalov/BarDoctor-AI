import type { DatabaseSync } from 'node:sqlite';
import { venueDate } from '../../lib/bardoctor/venue-time';
/** Explicit prerequisite for isolated POS scenarios, never installed globally. */
export function openWorkdayFixture(venueId:number,date=venueDate(new Date().toISOString(),'UTC')) {
 return {id:`operational-report:${venueId}:${date}`,venueId,date,workdayStatus:'OPEN',staffing:[{employeeId:'fixture-team',hours:8}]};
}
export function seedOpenWorkday(sqlite:DatabaseSync,accountId:number,venueId:number,date?:string) {
 const key='bd_operational_reports_v1';
 const rows=JSON.parse(String(sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(accountId,key)?.data_json??'[]')) as Record<string,unknown>[];
 const next=[...rows.filter(row=>row.venueId!==venueId),openWorkdayFixture(venueId,date)];
 sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').run(accountId,key,JSON.stringify(next),new Date().toISOString());
}
