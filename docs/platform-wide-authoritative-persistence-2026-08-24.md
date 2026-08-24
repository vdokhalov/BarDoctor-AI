# Platform-wide authoritative persistence · 2026-08-24

Scope: every server-visible BarDoctor account, workspace and venue. Mode:
read-only audit. Production writes and reconciliation operations: **0**.

## Live server inventory before this release

The Sites D1 read-only viewer returned:

- 14 accounts, including 12 human user accounts and 2 venue-data accounts;
- 11 workspaces/tenants;
- 13 active venues;
- 14 venue memberships;
- no rows in integration mappings, entity links or sync items.

The bounded viewer exposed 60 `domain_data` rows. Large JSON values were
truncated by the viewer, so item-level duplicate/orphan/cost counts are not
inferred from that output. The release adds a server-side summary endpoint
which computes those counts inside the application without returning secrets
or mutating data.

## Persistence classification from observable core stores

Before deployment of the new-account guard:

| Status | Venues | Evidence |
| --- | ---: | --- |
| `FULLY_SERVER_AUTHORITATIVE` | 0 | No venue has all five core stores. |
| `PARTIALLY_SERVER_AUTHORITATIVE` | 0 | Every observed partial core boundary already contains history without the complete identity/ledger chain. |
| `LEGACY_CLIENT_HELD` | 0 | Server inspection cannot prove a client-held payload until a read-only candidate is supplied. |
| `MIXED_SPLIT_BRAIN` | 3 | Server snapshots and/or purchases exist while authoritative assortment and stock movements are absent. |
| `INCOMPLETE_UNKNOWN` | 10 | No observable core server store; empty-new and client-held cannot be distinguished safely. |

Observed authoritative venue counts by critical domain:

| Domain | Server-authoritative venues |
| --- | ---: |
| Assortment / nomenclature | 0 |
| Stock movements | 0 |
| Purchases | 2 |
| Inventory snapshots | 3 |
| Supplier directory | 1 |
| Supplier mappings | 0 |
| Tech cards and ingredient mappings | 0 |
| Cost basis / valuation | 0 |

## Contract added by this release

- New owner accounts and newly created secondary venues receive five isolated,
  empty D1 stores only at the moment their new venue is created.
- Existing venues are never auto-initialized: absence remains an explicit
  incomplete/legacy signal and cannot be overwritten by an empty collection.
- `GET /api/admin/data-integrity` is platform-admin only and returns an
  all-venue persistence summary with per-domain lineage, status, checksums,
  dry-run counts, migration class and rollback contract.
- `GET /api/admin/data-integrity?venueId=<id>` returns one isolated immutable
  venue export. `mode=bundle` returns separate exports for every venue.
- `POST /api/admin/data-integrity` accepts optional legacy candidates for
  in-memory read-only discovery. It never imports, reconciles or persists them.
- Every export carries the exact build commit injected during the build and a
  SHA-256 checksum over the stable snapshot.
- Invalid JSON in an existing core store is blocking and is not interpreted as
  an empty dataset.

## Production safety and migration boundary

This release contains no production backfill, canonical merge, FK repoint,
stock rewrite, ledger reconstruction, cost rebuild, snapshot rewrite or data
deletion. Every incomplete export keeps `reconciliationAllowed=false`.

Any future migration requires a separate approval and must persist an
`operationId`, the immutable `exportId`, exact affected IDs, before/after
state, stock/value impact and tested rollback steps.
