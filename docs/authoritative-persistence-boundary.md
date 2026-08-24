# BarDoctor authoritative persistence boundary

Platform-wide classification, new-account initialization and the admin export
surface are documented in
`docs/platform-wide-authoritative-persistence-2026-08-24.md`.

## Authoritative source

Durable venue data lives only in D1 `domain_data`, isolated by the active venue's
`data_account_id`. Browser/local storage is a cache and may be submitted only as
a `legacy_client_candidate` to the read-only export preview. Candidate data is
never imported or reconciled automatically.

| Entity | Authoritative store |
| --- | --- |
| Canonical nomenclature, balances, cost basis | `bd_assortment_v1` |
| Supplier/source mappings and aliases | `bd_assortment_v1` |
| Tech cards and canonical ingredient links | `bd_assortment_v1` |
| Immutable stock ledger and reversals | `bd_stock_movements` |
| Purchase documents and lines | `bd_purchase_documents` |
| Historical inventory snapshots | `bd_inventory_snapshots` |
| Suppliers | `bd_suppliers` |

## Root cause and safety gate

The legacy bootstrap list omitted `bd_assortment_v1` and
`bd_stock_movements`. Bulk store GET then treated an absent assortment as `{}`
and persisted automatic inventory repair, which could turn missing data into an
empty authoritative record. Bulk GET is now read-only. Creating an assortment
when dependent purchase/snapshot/movement history already exists is blocked and
requires a separately approved import plan.

The owner-only export endpoint (`GET /api/data-integrity/export`) returns an
immutable per-venue snapshot with store provenance, deterministic counts,
invariants, dry-run impact, rollback scope, and SHA-256 checksum. `POST` accepts
optional legacy candidates for analysis only and always reports zero writes and
approval required.

Reconciliation is blocked whenever an authoritative store is missing or a
blocking invariant fails. Before any separately approved operation, retain the
export, allocate an operation id, record exact before/after key maps, and make
rollback restore the five exact store payloads.
