# BarDoctor database migration safety

## Canonical contract

`drizzle/meta/_journal.json` is the deployable schema ledger. Its last entry is the schema version embedded in the application release identity and `dist/release-manifest.json`. Every SQL file in `drizzle/` must have exactly one journal entry, and the latest version must have a Drizzle snapshot. `npm run test:migrations` enforces this contract.

Production-specific data operations are not schema migrations. They live under `ops/manual-migrations/` and are not copied into the deploy artifact. Historical unledgered schema fragments are retained under `ops/migration-history/unledgered/` as evidence only and must never be executed by deployment automation.

## Execution policy

1. Build and test the exact pushed commit.
2. Obtain a verified, restorable backup and record its identifier.
3. Run a read-only schema preflight against the target environment.
4. Compare actual tables, columns, indexes, migration ledger, and expected schema version.
5. Classify backward compatibility and application rollback before approval.
6. Obtain separate human approval for the exact migration plan and backup identifier.
7. Run schema migrations as a deployment operation, never from an application request.
8. Verify the migration ledger and application health before directing traffic to the new version.

Destructive SQL, table rebuilds, column removal, or irreversible data transforms require a separate reviewed migration and explicit human approval. They are not authorized by normal application deployment approval.

## Request-path controls

Application/auth requests contain no schema DDL. Migration-related mutation routes return 404 unless `BARDOCTOR_MIGRATION_OPERATIONS_ENABLED=true` is explicitly supplied to the runtime. Enabling the flag is not sufficient: routes also require an authenticated platform admin, same-origin intent headers, and their existing operation-specific proof or token. The flag must be absent during normal production operation.

## Existing production reconciliation (pending approval)

The release candidate expects canonical schema version `0021`. Audit evidence indicates that production may already contain the `avatar_id` column and `invoice_recognition_jobs` table while its migration ledger reports the earlier version. Do not execute `0021_release_schema_contract.sql` blindly: it would conflict with already-present objects.

Before deployment, a read-only production preflight must prove the exact object definitions. If they match the `0021` snapshot, prepare an environment-specific ledger-baseline operation that records `0021` as already satisfied without rerunning its DDL. That ledger write is a production DB change and remains pending separate user approval. If definitions differ, stop and prepare a reviewed forward-only reconciliation migration; do not repair schema from request code.

## Rollback compatibility

Schema `0021` is additive: it adds `accounts.avatar_id` and `invoice_recognition_jobs`. The previous application may run while these objects remain present, so application-only rollback is expected to be compatible. Dropping either object is not an approved rollback. Database recovery uses the separately verified disaster-recovery procedure, not reverse DDL.
