# BarDoctor production disaster recovery

Status: **production restore proof blocked by provider access**. Last verified: 2026-09-02. This runbook must not be marked verified until an authorized operator restores a real production-class recovery source into an isolated database and records the evidence.

## Incident

Declare a database recovery incident for confirmed data loss or corruption, an unsafe migration, widespread cross-venue inconsistency, or loss of the D1 database. Stop deployments and nonessential writes. Do not run repair SQL before preserving evidence and selecting a recovery point.

## Detection

Record the incident start in UTC, the first failing request or integrity signal, affected venues/accounts, last known-good application release, expected schema version, and earliest suspected bad write. Preserve worker logs, audit events, release identity, and provider status evidence.

## Decision authority

A named incident commander selects the recovery path. A separate authorized approver must approve any in-place production restore, traffic switch, destructive action, or production resource deletion. Ordinary application deployment approval is insufficient.

Current assignment:

- Primary recovery operator: **UNASSIGNED**
- Approver: **UNASSIGNED**

## Provider and current evidence

Production uses Sites-managed Cloudflare D1 through binding `DB`. The 2026-09-02 read-only Sites inspection confirmed 37 user tables and column-name parity with canonical schema `0021`. It did not expose production types, constraints, indexes, foreign keys, triggers, migration ledger, backend version, bookmarks, Time Travel state, export, clone, retention tier, or restore operations.

Consequently backup availability, encryption custody, operator access, actual retention, RPO, and RTO are **UNKNOWN**. General provider documentation is not accepted as evidence for this database.

## Backup selection

1. Obtain provider evidence for the exact production D1 database and record the database identifier without credentials.
2. List actual available recovery points/bookmarks and their UTC timestamps.
3. Select the newest recovery point preceding the earliest suspected bad write.
4. Record recovery-point identity, timestamp, consistency method, retention evidence, and expected data loss.
5. Reject partial table exports, application JSON downloads, and synthetic fixtures as production-class backups.
6. Preserve the current damaged state as a separate forensic export when safe and technically available.

## Restore target

Create a new isolated D1 database/environment that cannot receive production traffic. Do not reuse the production binding, production domain, or real user passwords. Record target identifier, region/provider state where available, creation time, and access policy. Do not delete the target until the incident owner accepts the evidence and separately authorizes cleanup.

## Restore procedure

1. Freeze releases and nonessential production writes.
2. Obtain the selected production-class recovery source.
3. Start the RTO timer.
4. Restore/import the recovery source only into the isolated target.
5. Record provider operation ID, start/end timestamps, source timestamp, target identifier, and any warnings.
6. Stop on partial import, checksum mismatch, unknown schema state, or any request to overwrite production.
7. Keep production untouched throughout the drill.

## Schema validation

Against the isolated target, collect table definitions, columns, types, nullability, defaults, primary keys, unique indexes, indexes, foreign keys, triggers, internal migration ledger, and checksums where available. Compare with `db/schema.ts`, migrations `0000–0021`, `drizzle/meta/_journal.json`, and `0021_snapshot.json`. Classify every object as MATCH, MISSING, EXTRA, DIFFERENT, or UNKNOWN. A matching table/column list alone is not PASS.

## Integrity validation

Run read-only integrity and FK checks. Validate orphan and duplicate conditions across accounts, workspaces, venues, memberships, domain data, purchases, purchase lines, suppliers, inventory, counts, write-offs, tech cards, ingredients, menu/sales, employees, shifts, finance, integrations, and audit records. Record row counts and violations without copying secrets or unnecessary personal data into the incident record.

## Application smoke

Connect a temporary, non-production BarDoctor instance to the isolated target. Use test principals or an approved non-password authentication path. Perform read-only smoke for auth/bootstrap, venue loading, nomenclature, purchases, warehouse, tech cards, finance, employees, and Business Health. Do not create or modify business documents.

## Venue isolation

With safe test principals, prove that Principal A / Venue A cannot read Venue B across nomenclature, purchases, inventory, tech cards, employees, finance, and integrations. Record request/response evidence without real passwords or secret tokens.

## Traffic switch procedure

Traffic must not be switched during a drill. In a real incident, switch only after schema, ledger, integrity, application smoke, and venue isolation all pass and the decision authority approves the exact target. Record previous and new bindings, release identity, switch time, and health evidence.

## Rollback

If validation fails before traffic switch, abandon the candidate target and keep production unchanged. If a real incident switch fails, return traffic to the previously recorded target only when it remains consistent and safe. Preserve the pre-restore recovery point and all forensic exports. Never drop additive schema objects as an application rollback.

## Communication

Notify the owner, recovery operator, approver, and affected operational leads. Communicate confirmed impact, observed RPO, current RTO, data window at risk, read/write availability, next decision time, and final recovery status. Do not include secrets or raw customer data.

## Post-incident checks

Verify release and health endpoints, authentication, active venue selection, critical read paths, critical writes only after explicit reopening, notification/integration queues, audit continuity, row-count deltas, and delayed jobs. Reconcile the affected accounting period and document root cause, corrective action, and the next restore drill date.

## Recovery objectives

- Target RPO: 15 minutes or less.
- Observed RPO: **UNKNOWN** until the newest actual recovery point is evidenced.
- Target RTO: 4 hours or less.
- Observed RTO: **UNKNOWN** until a production-class isolated restore is timed.
- Long-term retention target: daily encrypted export for 35 days plus monthly export for 12 months.
- Actual retention: **UNKNOWN / NOT EVIDENCED**.

## Current access blocker

The available Sites database reader exposes bounded user-table metadata and rows only. STEP 1.2 requires:

- read-only production schema and internal migration-ledger inspection;
- read-only D1 recovery-point/bookmark and retention inspection;
- a consistent export or provider recovery source;
- permission to create and import into one isolated non-production D1 database;
- a temporary non-production application binding for read-only smoke.

No production migration, restore, deployment, data mutation, secret change, or production resource deletion is authorized.

## Synthetic drill

`npm run test:restore-drill` validates the repository migration chain and local SQLite restore tooling with synthetic data. It does not contain production data and does not close P0-05.
