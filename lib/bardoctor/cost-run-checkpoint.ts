import type { CostScope } from './management-cost-contracts';
import { costRevision } from './management-cost-observation';

export const COST_RUN_VERSION = 'complete-cost-pass-v1';
export const costRunKey = (scope:CostScope)=>`__bd_p4a_cost_run_v1__:${scope.venueId}`;
export type CostRun = {version:string;scope:CostScope;runId:string;inputRevision:string;stateRevision:string;nextCursor:string|null;completedAt:string|null;lastCompletedAt:string|null};
// Include exact state and episode bytes, including additions/removals. Receipts are only an optimization.
const stateSql = `SELECT json_group_array(json_array(store_key,data_json)) AS value FROM (SELECT store_key,data_json FROM domain_data WHERE account_id=? AND ((store_key>=? AND store_key<?) OR (store_key>=? AND store_key<?)) ORDER BY store_key)`;
export async function costStateView(database:D1Database,scope:CostScope) {
 const state=`__bd_p4a_cost_state_v1__:${scope.venueId}:`,episode=`__bd_p4a_cost_episode_v1__:${scope.venueId}:`;
 const args=[scope.dataAccountId,state,state+'\uffff',episode,episode+'\uffff'];
 const row=await database.prepare(stateSql).bind(...args).first<{value:string}>();
 const raw=row?.value||'[]';
 if(new TextEncoder().encode(raw).length>2_000_000)throw Error('COST_RUN_STATE_CAPACITY');
 const rows=JSON.parse(raw) as [string,string][];
 if(rows.length>10000)throw Error('COST_RUN_STATE_CAPACITY');
 const revision=await costRevision(rows);
 return {revision,async after(updates:Map<string,string>){const all=new Map(rows);for(const [key,value] of updates)all.set(key,value);return costRevision([...all].sort(([a],[b])=>a<b?-1:a>b?1:0));},guard:database.prepare(`INSERT INTO domain_data(account_id,store_key,data_json) SELECT ?,'__bd_p4a_cost_guard_v1__',NULL WHERE (${stateSql}) IS NOT ?`).bind(scope.dataAccountId,...args,raw)};
}
