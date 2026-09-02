export type StoreAuditWrite = {
  action: string;
  entityId: string | null;
  entityLabel: string | null;
  monthKey: string | null;
  beforeJson: string | null;
  afterJson: string | null;
  changedFieldsJson: string;
  reason: string | null;
};

export async function persistStoreMutationAtomic(input: {
  database: D1Database;
  accountId: number;
  storeKey: string;
  dataJson: string;
  previousRevision: number | null;
  nextRevision: number;
  mutationId: string;
  updatedAt: string;
  actorName: string;
  actorRole: string;
  audits: StoreAuditWrite[];
}): Promise<boolean> {
  const mutation = input.previousRevision == null
    ? input.database.prepare(`
        INSERT INTO domain_data (
          account_id, store_key, data_json, revision, mutation_id, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(account_id, store_key) DO NOTHING
      `).bind(
        input.accountId,
        input.storeKey,
        input.dataJson,
        input.nextRevision,
        input.mutationId,
        input.updatedAt,
      )
    : input.database.prepare(`
        UPDATE domain_data
        SET data_json = ?, revision = ?, mutation_id = ?, updated_at = ?
        WHERE account_id = ? AND store_key = ? AND revision = ?
      `).bind(
        input.dataJson,
        input.nextRevision,
        input.mutationId,
        input.updatedAt,
        input.accountId,
        input.storeKey,
        input.previousRevision,
      );

  const audits = input.audits.map((audit) => input.database.prepare(`
    INSERT INTO audit_log (
      account_id, store_key, action, entity_id, entity_label, month_key,
      before_json, after_json, changed_fields_json, actor_name, actor_role,
      reason, created_at
    )
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE EXISTS (
      SELECT 1 FROM domain_data
      WHERE account_id = ? AND store_key = ? AND revision = ? AND mutation_id = ?
    )
  `).bind(
    input.accountId,
    input.storeKey,
    audit.action,
    audit.entityId,
    audit.entityLabel,
    audit.monthKey,
    audit.beforeJson,
    audit.afterJson,
    audit.changedFieldsJson,
    input.actorName,
    input.actorRole,
    audit.reason,
    input.updatedAt,
    input.accountId,
    input.storeKey,
    input.nextRevision,
    input.mutationId,
  ));

  // Cloudflare D1 batch is transactional: if an audit insert fails, the
  // preceding business mutation is rolled back with it.
  const results = await input.database.batch([mutation, ...audits]);
  return Number(results[0]?.meta.changes ?? 0) === 1;
}
