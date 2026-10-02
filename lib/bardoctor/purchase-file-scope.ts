import { getD1 } from '../../db';
import { businessRecord } from './business-day-rows';
import type { EvidenceScope } from './evidence-contracts';
/** Files remain in the existing account bucket. New staged files carry their
 * live venue scope; legacy files need a real, scoped purchase parent. */
export async function purchaseFileVisible(scope: EvidenceScope & { dataAccountId: number }, id: string, metadata?: Record<string,string>, documentId?: string): Promise<boolean> {
  for (const [field, expected] of Object.entries(scope)) if (metadata?.[field] != null && Number(metadata[field]) !== expected) return false;
  const captured = ['venueId','workspaceId','dataAccountId'].every(field=>metadata?.[field] != null);
  if (captured && !documentId) return true;
  const records = await getD1().prepare(`SELECT j.value AS record_json FROM domain_data d, json_each(CASE WHEN json_valid(d.data_json) THEN d.data_json ELSE '[]' END) j
    WHERE d.account_id=? AND d.store_key='bd_purchase_documents' AND j.type='object'
    AND (? IS NULL OR json_extract(j.value,'$.id')=?)
    AND (json_extract(j.value,'$.sourceFileId')=? OR EXISTS (SELECT 1 FROM json_each(j.value,'$.sourceFileIds') f WHERE f.value=?)) LIMIT 21`)
    .bind(scope.dataAccountId, documentId ?? null, documentId ?? null, id, id).all<{record_json:string}>();
  if (!records.results.length || records.results.length > 20) return false;
  return records.results.every(value=>{const row=businessRecord(JSON.parse(value.record_json));return Object.entries(scope).every(([field,expected])=>row[field]==null || Number(row[field])===expected);});
}
