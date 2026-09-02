# BarDoctor — STEP 1.2 PRODUCTION SAFETY VERIFICATION

Audit timestamp: 2026-09-02T11:49:00Z
Execution mode: strictly read-only against production. No deployment, migration, restore over production, secret change, or production data mutation was performed.

## A. Executive summary

Status: **BLOCKED BY ACCESS**
Score: **74/100**
P0 before: **2**
P0 after: **2**

The canonical release candidate remains GitHub SHA `9f48337be90008d63467a2abe52b05498c52d7bc`. Its Git tree `8d2fc6f365582b53f0a5824256eb0ff1ae29fd85` exactly matches the inspected local checkout. Version `0.1.0`, build `8`, expected schema `0021`, and artifact SHA-256 `a7f1f3ac59b651bcc011734880d8230bb1b108a11b3c785d27026dc6864bce11` match the release manifest.

The available Sites production reader confirmed the `DB` binding, 37 table names, and all 37 column-name sets. It does not expose production types, nullability, defaults, keys, indexes, foreign keys, triggers, internal migration ledger, D1 recovery points, exports, or restore operations. Therefore neither remaining P0 can be closed honestly.

## B. Production schema

Expected: canonical schema `0021`; migrations `0000–0021`; 22 ordered journal entries; 37 user tables.
Actual: 37 production user tables; all table names and column-name sets match the canonical migration result.
Ledger: **UNKNOWN** — provider-managed migration table is not exposed by the available read-only surface.
Drift: no table-name or column-name drift detected; full schema drift remains **UNKNOWN**.

## C. Schema comparison

| Object | Expected | Production | Status | Risk |
|---|---|---|---|---|
| accounts/users | `accounts` schema 0021 | Table and 21 column names present | UNKNOWN | Types, defaults, PK, unique index and ledger unavailable |
| venues | `venues` schema 0021 | Table and 7 column names present | UNKNOWN | FK/index definitions unavailable |
| venue/workspace access | membership and invite tables | All expected tables/columns present | UNKNOWN | Enforcement definitions unavailable |
| nomenclature/taxonomy | logical accounting payload in `domain_data` / legacy account payload | Reader cannot return complete JSON | UNKNOWN | Canonical item/taxonomy integrity not provable |
| purchases/purchase lines/suppliers | logical stores | `bd_purchase_documents` and `bd_suppliers` observed | UNKNOWN | Purchase JSON is truncated |
| inventory/counts/write-offs | logical stores | Some inventory snapshot evidence present | UNKNOWN | Full payload and relationships unavailable |
| tech cards/ingredients | logical assortment payload | Complete payload unavailable | UNKNOWN | Ingredient links cannot be checked |
| menu/sales | logical venue payload | Complete payload unavailable | UNKNOWN | Sales/menu relationships cannot be checked |
| employees/shifts | logical stores | Employee rows observed; payload incomplete | UNKNOWN | Shift relationships cannot be checked |
| finance/expenses | logical stores | Finance store keys observed | UNKNOWN | Some JSON values are truncated |
| integrations | `integration_*` physical tables | All expected tables/columns present | UNKNOWN | FK/index enforcement unavailable |
| audit/data integrity | `audit_log`, `domain_data` | Tables/columns present | UNKNOWN | PRAGMA checks and complete payload unavailable |

The complete 37-object machine-readable classification is in `docs/evidence/step-1.2/schema-diff.json`.

## D. Integrity

FK violations: **UNKNOWN** globally. The available row surface allowed 27 explicit account/venue/workspace/integration reference checks; observed violations: **0**.
Orphans: **0 observed** in the checked references and `domain_data.account_id`; global result **UNKNOWN**.
Critical inconsistencies: none detected in exposed metadata. Critical accounting JSON was partially truncated, so absence of inconsistencies is not proven.

Observed non-secret counts include 20 accounts, 17 venues, 20 venue memberships, 15 workspaces, 18 workspace memberships, 1 integration connection, 5 integration ingress tokens, 10 venue migration exports, and 60 `domain_data` rows. No production row values are stored in audit evidence.

## E. Backup

Provider: Sites-managed Cloudflare D1.
Backup mechanism: **UNKNOWN** from actual provider state.
Latest recovery point: **UNKNOWN**.
Oldest recovery point: **UNKNOWN**.
Retention: **UNKNOWN**.
PITR: **UNKNOWN**.

Documentation or theoretical D1 capability was not accepted as production evidence.

## F. Restore drill

Recovery source: **NOT OBTAINED** — no provider export/snapshot/bookmark capability is exposed.
Restore target: **NOT CREATED** — creating an empty target without a production-class source would not prove recovery.
Restore result: **NOT RUN**.
Schema: **UNKNOWN**.
Integrity: **UNKNOWN**.
Venue isolation: **NOT RUN**.
Application smoke: **NOT RUN**.

The prior synthetic SQLite drill remains PASS but is explicitly excluded from P0-05 evidence.

## G. RPO / RTO

Observed RPO: **UNKNOWN**.
Guaranteed RPO: **UNKNOWN**.
Evidence: the latest actual recovery-point timestamp is unavailable.

Observed RTO: **UNKNOWN**.
DB restore time: **NOT MEASURED**.
Integrity verification time: **NOT MEASURED**.
Application recovery time: **NOT MEASURED**.
Estimated production RTO: **UNKNOWN**; no evidence-based estimate is issued.

## H. P0-04

**UNKNOWN**

Evidence: production table names and column-name sets match all 37 canonical objects. Production object definitions, internal migration ledger, checksums, integrity pragmas, indexes, FKs, and triggers are unavailable. Matching columns alone is not sufficient to close the blocker.

Required access: read-only schema metadata and internal migration ledger for the exact Sites-managed D1 database, including `sqlite_schema`/equivalent, table/index/FK/trigger metadata, and read-only integrity queries. No production write privilege is required for this part.

## I. P0-05

**UNKNOWN**

Evidence: no actual backup, snapshot, bookmark, export, or recovery-point timestamp could be obtained. No production-class restore was possible.

Required access: provider-authorized capability to read D1 backup/Time Travel/bookmark state, export one consistent recovery source, create a separate non-production D1 target, import/restore only into that target, and connect a temporary non-production BarDoctor instance for read-only smoke. No permission to restore over production is requested.

## J. Remaining P0

Count: **2**

1. P0-04 — production schema and migration ledger not fully verified.
2. P0-05 — production-class backup and isolated restore not proven.

## K. Remaining P1

1. GitHub `main` branch protection/ruleset remains unproven.
2. Named disaster-recovery operator and approver are not recorded.
3. Long-term independent backup cadence and retention are not evidenced.

## L. Release infrastructure score

**74/100**

Increase from 71 reflects verified production table/column surface and partial relational integrity evidence. The score is capped because both production safety P0 blockers remain open.

## M. Verdict

❌ NO-GO

## N. STEP №2 gate

**НЕЛЬЗЯ** переходить к STEP №2 — CORE ACCOUNTING INTEGRITY AUDIT.

## Access blocker handoff

To resume STEP 1.2, provide an authorized Cloudflare/Sites operator connection that can perform only the read-only metadata/export actions above plus creation/import of an isolated non-production D1 target. Do not provide passwords, API tokens, or secrets in chat. Production migration, production restore, production deployment, and production data mutation remain outside this authorization.
