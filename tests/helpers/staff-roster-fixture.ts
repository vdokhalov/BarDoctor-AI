import type {DatabaseSync} from 'node:sqlite';
// Synthetic roster setup only; access tests still use the real issuance service.
export function seedRosterEmployee(sqlite:DatabaseSync, dataAccountId:number, venueId:number, id:string, name=id, status='active') {
 const row=sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_employees'").get(dataAccountId);
 const employees=row?JSON.parse(row.data_json as string):[];
 employees.push({id,name,status,venueId});
 sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,'bd_employees',?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(dataAccountId,JSON.stringify(employees));
}
