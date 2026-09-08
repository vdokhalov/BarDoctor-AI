# Phase 4 prerequisite: historical purchase conversion guard

Scope: the separately authorized historical-conversion blocker only. This is
not completion of Phase 4 and does not change production or the ledger's
existing ml/g/pcs representation.

## Confirmed defect

At Phase 3 baseline 59d46a17ba32e464cf359a5310e474f05d8c69de, an isolated
persisted Jameson receipt of 4200 ml / 1200 currency units became 6000 ml when
the current balance's packageSize changed from 0.7 l to 1 l and repair ran.
The confirmed line only retained six pieces and had no historical bottle
content. The repair inferred bottle count from price and volume from mutable
stock metadata. No production request was used to reproduce this.

## Protection

- Historical reconciliation no longer takes package content from current
  stock metadata, package options, product IDs, or financial ratios.
- A pure preflight identifies unproven/contradictory historical conversions,
  including incompatible receipt dimensions, missing package content and
  name-based synthetic quantity heuristics.
- Such input returns NEEDS_REVIEW with document/line diagnostics. The repair
  returns the original assortment and movements unchanged; no receipt
  restoration or partial balance repair is performed.
- The HTTP repair command returns 422 before consolidation or database
  writes. A second guard protects against ambiguity after in-memory
  consolidation. Review does not automatically authorize correction.
- Existing repairs based on explicit, compatible confirmed invoice quantities
  remain covered by their original regression assertions. Five tests that
  previously required unproven automatic corrections now assert full input,
  balance and movement immutability and a controlled review result.

## Validation

179 focused tests passed locally with Node's TypeScript transformation,
covering the API's no-write behavior, save/reload, repeated repair, mutable
packaging, costing, purchases, inventory/counts, write-offs, sales and Phase 3.
The known Windows/Miniflare browser limitation was not retried. Full build,
typecheck, lint, regression and mobile/desktop browser QA remain the normal
GitHub CI gate. No CI assertions or workflow protections are disabled.

## Remaining Phase 4 work

Canonical l/kg/pcs conversion, normalized purchase snapshots, optional package
templates, simplified purchase/nomenclature UX and the complete Phase 4
acceptance matrix are not implemented by this prerequisite.
No production legacy conflict count is claimed; the diagnostic is data-driven
and no production audit/repair/cleanup was executed.
