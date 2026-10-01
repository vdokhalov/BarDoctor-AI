# Phase 3A.2 — Revenue Trace

Baseline: production Sites v471, `a3dae593e5be2b73470208aba3421e67ab79c0ef`.

## Confirmed source contract

`bd_finance_revenue` is the existing Finance projection. `bd_sales_events_v1` contains immutable accepted sales, captured prices and reversal state; `bd_sales_documents` retains confirmed legacy/import/integration reports. `operationalDay()` is the existing canonical daily read logic used by `/api/operational-days` and Finance/Shifts. No writer or amount formula changes.

Canonical event-backed revenue selects the venue/businessDate and `POSTED` events. `REVERSED` events retain source provenance but do not contribute money or eligible sale references. Finance reconciliation and canonical Operational Day consistency remain authoritative. The new reader calls `operationalDay()` for the day and each event-backed parent; aggregate or per-parent MISMATCH blocks the fact with `unavailable / EVIDENCE_UNAVAILABLE` and `REVENUE_READ_MODEL_MISMATCH`. Compensating errors between shifts cannot produce a certified proof. Missing inputs/ambiguous IDs/corrupt collections cannot be certified as complete. Nothing repairs or writes a mismatch.

Source vocabulary remains `BARDOC_POS`, `MANUAL_SUMMARY`, `IMPORT`, `INTEGRATION`, `LEGACY_UNKNOWN`. Native `POS_API`/`MANUAL_GRID`, explicit manual close provenance, import/integration event or linked confirmed-document provenance, conflicting families and legacy ambiguity keep the Phase 1 meaning. Source classification and finality on Finance/cash evidence now use the same canonical daily function, including document input content binding.

Cash `OPEN/CLOSED` remains distinct from Operational Day `OPERATING/AWAITING_OPERATIONAL_DATA/COMPLETE`. Open cash makes day revenue `PROVISIONAL`; closing finalizes without changing amount. A final monetary value does not complete operational data. With several cash sessions, each cash reference retains its own finality while the day reflects any open session. Standalone historical sales do not receive invented cash shifts.

The Sales command assigns businessDate from the selected shift, including an overnight shift. Without a shift it uses the venue timezone. The fact reads that stored businessDate; it never derives a UTC date or invented midnight/effective timestamp.

## API and Business Fact

`GET /api/evidence/facts/daily-revenue?businessDate=YYYY-MM-DD`

Optional `expectedRevision=sha256:...` binds a subsequent fact read. Only these two query parameters are accepted, once each. Authentication and infrastructure failures preserve `private, no-store` and the session/venue Vary header. The handler has the Phase 3A.1 infrastructure error boundary. There is no arbitrary fact query, client account/dataAccount selector or new UI.

Success returns the existing versioned Business Fact contract plus `outcome`, `code`, `asOf`, `binding`, `diagnostics` and the reference `page`. DAILY_REVENUE includes stable `fact:v1:<workspace>:<venue>:DAILY_REVENUE:<businessDate>`, scope, value, MONEY unit, actual currency (null with a diagnostic when missing/inconsistent), canonical source/finality, separate availability/evidenceStatus, content revision, bounded evidenceRefs, sourceRef, traceTarget and freshness. Only existing valid source timestamps are emitted. Store timestamp fallback is labeled STORE_FALLBACK. Freshness assessment stays UNKNOWN, with no threshold or confidence percentage. No period/midnight timestamp is manufactured.

Availability is separate from completeness: a readable manual/legacy total can be AVAILABLE with PARTIAL evidence. COMPLETE on this fact means that the bounded direct POS proof can be fully traversed, not that warehouse/menu provenance is complete. It requires canonical MATCH, unambiguous scoped identities, consistent money/currency metadata, actual cash linkage and current sales permission. Pagination alone does not make the full traversable proof incomplete. Missing usable references use the existing NONE vocabulary. Every resolver resource retains Phase 3A.1's conservative PARTIAL graph evidenceStatus.

## Existing resolver extension

`DAILY_REVENUE` is one additional closed resource kind, with ID equal to the validated businessDate. It is a read projection, not a store or persisted record. The existing `/api/evidence/resolve?ref=...&limit=...&offset=...` handles the root and supplies bound paginated relations:

`DAILY_REVENUE -> FINANCE_REVENUE -> CASH_SHIFT -> SALE_EVENT`

Root relations contain real Finance row references, maximum 20 per page. When singular, sourceRef identifies the Finance row; with multiple rows, sourceRef is null and traceTarget points to the bound daily root. Native cash-backed Finance additionally relates to the real CASH_SHIFT with the same canonical row identity. Existing direct Finance-to-sale relations are preserved for Phase 3A.1 compatibility; they and the cash relations must not be counted as separate sales. Only distinct posted event IDs contribute to the proof. At most 20 relations are returned per resolver page, with bound parents and existing offset limits. No sale payload, captured price array, full sales list, warehouse graph or new evidence architecture is embedded in the fact.

Manual, imported, integrated and unknown data expose actual Finance rows and only existing sale evidence. Confirmed legacy document provenance participates in source classification/content binding; the reserved SALES_DOCUMENT adapter remains unsupported. This intentionally leaves document-led trace PARTIAL. LEGACY_UNKNOWN never receives a fabricated source, shift, sale or evidence record. Historical backfill is unnecessary.

## Revision and security

The fact/root revision binds the scope, date, relevant canonical revenues, events, documents and sales visibility. asOf and unrelated dates/store rows do not invalidate it. Old fact/root bindings detect sale addition/reversal, closing, monetary changes, same-amount captured-content edits, source edits and deletion. A mismatch returns `changed / READ_MODEL_CHANGED` with NO_HISTORICAL_SNAPSHOT and no replacement value/fact/evidence. Parent Finance/cash refs use the same shared content-binding function as the existing resolver; sale refs retain their full canonical parent binding. No historical snapshot is created.

Each request reuses `authenticatedEvidenceContext`: active venue/workspace, both active memberships, authenticated actor/membership, data-owner isolation and current existing RBAC. Daily facts/root use `shifts.view`, matching the existing canonical daily read boundary. Internal daily amount/source reads include canonical events as Operational Day already does; sale payloads, child IDs and relations still require `sales.view`. Revocation makes the fact evidence partial and removes inaccessible downstream IDs/counts/payloads; an old readable-basis binding changes. Foreign scope is unavailable before lookup. Contradictory explicit workspace ownership within the selected venue/date fails closed with RECORD_NEEDS_REVIEW, rather than silently filtering a different canonical total; no foreign monetary data or IDs are returned. Actor/data-owner namespaces and identical IDs in other venues cannot cross the boundary. References are not permission tokens. No RBAC expansion.

Nested captured-sale children retain the resolver's parent ID, venue/workspace and line/menu relationship checks. No new warehouse traversal is introduced.

## Read-only and regression evidence

Revenue projection reads three canonical stores in one SELECT snapshot; resolver adapters stay SELECT-only and never invoke business commands. Actual-handler tests compare exact domain_data JSON bytes and timestamps, all business stores (including Finance and Warehouse), audit rows and fixture object storage before/after every read and security failure. SQLite triggers forbid new canonical rows, updates and deletes. Existing authentication may issue INSERT OR IGNORE for already initialized stores; that no-op is accounted for by the isolated trigger and byte comparison without changing auth. The compiled native D1 fixture blocks INSERT/UPDATE/DELETE outright and exercises real emitted Worker routes.

Targeted cases cover open/closed, independent multiple sales/idempotent retries, reversal, empty/multiple sessions, timezone/local midnight/overnight, every source family, content/source/document edits/deletion, bound pagination over 25 sales and 21 real shifts, parent-level offsetting mismatches, malformed data, query injection, foreign scopes/data owners, guessed IDs, revoked/denied permissions/membership/session, nested ownership and canonical read-only content. Proof helpers resolve the actual IDs through every hop and assert `Fact = canonical Finance/Operational Day = eligible posted evidence total`.

Browser HTTP QA at 390 and 1280 px verifies the three-sale 90 MDL proof, actual authenticated transport, all existing adapters, foreign/anonymous/revoked cases, no browser errors and unchanged canonical content. The compiled native Worker proves 60 MDL from three events against Finance and Operational Day under mutation guards. Existing UI remains unchanged. Mandatory GitHub verify, sales-navigation and sales-scroll-layout jobs retain all existing Operational Day/POS/Menu/Recipes/Warehouse/Phase 2 coverage and add targeted Revenue Trace coverage.

Release workflow: review, targeted/security/domain regressions, build/typecheck/lint, one full npm test and relevant browser QA; commit/push; wait for all required exact-head CI; synchronize the identical commit to Sites and save an archive-backed version. No production deployment without the user's final confirmation. Do not proceed to Phase 3A.3.

No ledger, facts/evidence table, schema change, migration, backfill, production business-data mutation or UI/Business Health/AI redesign. Known authentication owner-reconciliation risk is unchanged. PRIMARY D1 FAILURE ROOT CAUSE remains **UNKNOWN — NOT REPRODUCED**.

Local release evidence: targeted Revenue Trace 12/12; existing Evidence security 12/12; focused Operational Day/Finance/Sales/POS/RBAC regression passed; compiled native D1 and evidence/revenue browser 390/1280 PASS. One full local npm test passed 1,371 TypeScript tests and all artifact/posttest suites before the final explicit-workspace corruption guard; that guard receives targeted verification and the complete exact-commit GitHub regression gate. Build/typecheck/lint are rerun for final source. Lint retains two baseline warnings, no errors. Operational Day mobile/desktop UI PASS on unchanged retry after artifact preparation completed. Initial concurrent run observed the already documented Unexpected end of JSON input; its cause is not established, and no assertion/filter was weakened.
