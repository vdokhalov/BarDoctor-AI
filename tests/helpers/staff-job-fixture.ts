import type { DatabaseSync } from "node:sqlite";

export function seedMemberJob(sqlite: DatabaseSync, accountId: number, venueId: number, title: string | null) {
  sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json")
    .run(accountId, "__bd_staff_job_v1__:" + venueId, JSON.stringify(title));
}
export function readMemberJob(sqlite: DatabaseSync, accountId: number, venueId: number) {
  const row = sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?").get(accountId, "__bd_staff_job_v1__:" + venueId);
  return row ? JSON.parse(String(row.data_json)) : null;
}
