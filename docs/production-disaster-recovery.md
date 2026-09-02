# BarDoctor production disaster recovery

Status: **production restore proof pending**. This runbook must not be marked verified until an authorized operator restores a real production-class export into an isolated database and records the evidence.

## Incident criteria

Declare a database recovery incident for confirmed data loss/corruption, an unsafe migration, widespread cross-venue inconsistency, or loss of the D1 database. Stop deployments and data repair activity. Record the incident start, last known-good application release, schema version, and the earliest suspected bad write.

## Provider and current evidence

The production binding is Sites-managed Cloudflare D1 (`DB`). The Sites read-only control plane confirms the database and expected table inventory, but it does not expose D1 backend version, bookmarks, export, clone, retention tier, or restore operations. Therefore backup availability, operator access, encryption custody, actual retention, RPO, and RTO remain **UNKNOWN**.

Cloudflare documents Time Travel as always enabled for D1 production-backend databases, with minute-level restore points and 7-day retention on Workers Free or 30 days on Workers Paid. It also documents that Time Travel restore overwrites the database in place and that cloning/forking from Time Travel is not currently available. These provider capabilities are not proof that the Sites-managed BarDoctor database is eligible or that the project operator can execute them.

## Recovery objectives

- Target RPO: 15 minutes or less. Actual: **UNKNOWN** until the current bookmark and retention tier are evidenced.
- Target RTO: 4 hours or less. Actual: **UNKNOWN** until a production-class drill is timed.
- Long-term backup retention target: daily encrypted export for 35 days plus monthly export for 12 months. Actual: **NOT IMPLEMENTED / UNKNOWN**.

## Recovery procedure

1. Freeze releases and nonessential writes; preserve logs and the currently deployed release identity.
2. Obtain separate human authorization for any in-place production restore. Ordinary deployment approval is insufficient.
3. Through the authorized Sites/Cloudflare operator, confirm D1 backend version and retrieve the current bookmark. Record outputs without credentials.
4. Identify the last known-good UTC timestamp from audit evidence. Resolve it to a D1 bookmark and record the proposed RPO.
5. Before overwriting anything, export the current damaged state when technically possible and retain its digest for forensics.
6. Preferred validation path: export the chosen recovery point and import it into a newly created isolated D1 database. Never bind the production application to it during validation.
7. Validate the isolated restore:
   - SQLite/D1 integrity and foreign-key checks;
   - exact schema and migration-ledger version;
   - table and critical row counts;
   - account/workspace/venue membership consistency;
   - no cross-venue references in business stores;
   - purchase, stock, sales, write-off, finance, and audit invariants;
   - application health and authenticated read-only smoke tests using the exact rollback-compatible release.
8. Record backup/bookmark identity, digest where available, source and target database IDs, validation results, operator, approver, elapsed time, achieved RPO, and achieved RTO.
9. If isolated validation passes, schedule the provider-supported production restore with explicit approval. D1 Time Travel restore is destructive and cancels in-flight queries.
10. After restore, verify `/api/healthz`, `/api/release`, authentication, active venue selection, critical read paths, and data-integrity checks before reopening writes.
11. Preserve the pre-restore bookmark returned by the provider so the restore itself can be undone if validation fails.

## Isolated local drill

Run `npm run test:restore-drill`. It creates a temporary SQLite database, applies the complete canonical migration ledger, inserts synthetic tenant/accounting evidence, copies a closed database as a backup, deletes only the temporary source, restores to another temporary file, and verifies digest, integrity, foreign keys, schema, and critical rows. Temporary files are removed afterward.

This drill proves that the repository schema can be backed up and restored in isolation. It deliberately contains no production data and does **not** close the production restore P0.

## Drill cadence and ownership

Assign one named primary operator and one approver before public release. Run a production-class isolated restore drill before initial release and quarterly thereafter, plus after any provider/storage change. Attach sanitized command output and validation evidence to the release record. A backup without a successful restore drill remains unverified.
