# Phase 3A.1 — Business Fact contracts and Evidence Resolver foundation

Baseline: Sites v470, `3f5b0ff585e77c51ef7a2c75f22bf0902c56363c`.

## Scope

Business Facts are typed read projections, never persisted rows. This change supplies contracts for `DAILY_REVENUE` and `CURRENT_MENU_SALE_PRICE`, stable scoped identity, source classification, separate finality/availability/evidence status, content revision, explicit timestamp/freshness basis and bounded references. It does not implement those domain projections or expose a facts endpoint. The period vocabulary is exported for future period-based contracts; neither pilot scalar type invents a period or midnight timestamp.

The closed resource vocabulary reserves the Phase 3A kinds. Five supported kinds use four canonical readers:

| Kind | Canonical reader | Existing permission |
| --- | --- | --- |
| SALE_EVENT | bd_sales_events_v1, optional embedded captured line | sales.view |
| CASH_SHIFT | bd_finance_revenue row with open/closed closingStatus | shifts.view |
| FINANCE_REVENUE | bd_finance_revenue row | shifts.view |
| MENU_ITEM | bd_assortment_v1.menuItems | inventory.view |
| MENU_INGESTION_DRAFT | bd_menu_ingestion_v1, optional embedded draft line | inventory.manage |

Finance revenue uses `shifts.view`, matching the existing canonical store read boundary. It does not grant access through `finance.view`. Private staging retains `inventory.manage`, even when the caller can read the published menu.

Other registered kinds return `unsupported`; they never select a store dynamically. No raw store, arbitrary store key, database query, file URL, R2 key or business payload is accepted inside a reference. Reserved kinds are vocabulary, not adapters or API permissions.

## Read-only API

`GET /api/evidence/resolve?ref=<URL-encoded JSON>&limit=20&offset=0`

Example reference (use the actual server-confirmed scope and canonical ID):

```json
{"contractVersion":1,"kind":"MENU_ITEM","id":"menu-item-id","venueId":1,"workspaceId":1}
```

Sale and ingestion draft references alone allow `partId`. A resolved reference includes `expectedRevision: "sha256:..."`; use that bound reference for later verification and pagination. `traceTarget` is a typed server-generated evidence target, not an arbitrary URL or an access capability. There is no new UI.

Responses always use `Cache-Control: private, no-store` and vary by cookie, session credentials and selected venue, including authentication/infrastructure failures. Successful transport returns typed outcomes at HTTP 200:

| Outcome | Meaning |
| --- | --- |
| resolved | Minimal current resource projection is available |
| partial | Record projection has missing metadata, source, related evidence or permitted relations |
| unavailable | Missing record, foreign scope/ownership, ambiguous ID, malformed stored collection or invalid nested ownership |
| restricted | Caller lacks the resource kind's existing permission; no record lookup occurred |
| changed | READ_MODEL_CHANGED: supplied content binding no longer matches |
| unsupported | UNSUPPORTED_REFERENCE_KIND: no adapter for this vocabulary |

Malformed reference/query or pagination: HTTP 400. Missing/expired session or invalid active membership context: HTTP 401. Infrastructure failure: existing sanitized HTTP 500 boundary. No raw exception is returned.

Unknown kinds with structurally valid references return `unsupported` only inside the authenticated selected scope; foreign references return the same `unavailable` envelope as missing records. Unknown fields, duplicate parameters, invalid IDs/scopes/revisions and arbitrary lookup selectors are rejected.

## Authorization and tenant isolation

1. Reuse `authenticateRequest` once for each request; never accept a client account ID.
2. SELECT the selected active venue, active workspace, active venue/workspace memberships, matching authenticated membership and actor, and matching venue dataAccountId.
3. Re-evaluate the current membership role and existing permissions.
4. Match reference venue/workspace against that server-derived context before resource lookup or resource permission outcomes.
5. Read only allowlisted canonical keys in the authenticated data-owner namespace. Actor and data owner may differ.
6. Validate explicit venue/workspace ownership inside records. Existing menu/finance records without explicit venue fields inherit the verified venue's unique data-owner namespace. Sale events and ingestion drafts require explicit matching venue ownership.
7. Resolve nested children only inside their authorized parent. Sale captured price and batch line must agree on line ID, menu item, batch parent ID and scope. Draft line must belong to the actual parent collection and its explicit item scope must agree.
8. Relations require the target's existing permission and scoped canonical ownership. Inaccessible relation IDs, counts, revisions and payloads are omitted. Re-resolving any target repeats the whole authorization flow.

The reference is not a token. Having or guessing an ID/revision never supplies permission. A same-kind denied lookup behaves identically for existing and nonexistent IDs. Foreign venue/workspace references do not disclose resource existence.

## Revisions and temporal honesty

Revisions are SHA-256 content bindings of the versioned scoped reference identity and canonical record. Object key order does not change them. They are not command fingerprints, authenticity proofs, historical snapshots or capability tokens. Child references bind the entire parent; unrelated records in the same store do not invalidate them.

For event-backed finance/cash rows, the binding also includes the scoped canonical events used to classify the row's source. Altering those inputs cannot silently change the source read model under an old binding. Insufficient downstream permissions may change that readable input basis too; no inaccessible source details are disclosed.

`expectedRevision` mismatch returns only `changed / READ_MODEL_CHANGED` and `NO_HISTORICAL_SNAPSHOT`. It does not return the current monetary value, current projection or replacement revision as proof of the old state. Unbound reads explicitly say `CURRENT_RECORD`; bound reads say `EXPECTED_REVISION`.

Direct relations are current references, not historical copies. A sale belongs to its finance revenue row; an event-backed row has `derived_from` sale relations; confirmed ingestion has `confirmed_for` menu relations. `confirmed_for` means participation in confirmation, including unchanged accepted rows. It does not assert that today's mutable menu value originated in that draft. No graph walk, warehouse graph, recipe snapshot DTO or full provenance chain is added.

The response contains at most 20 relations. Only the requested page is hashed and returned; offsets are bounded at 10,000. Pages should use the bound parent reference. Relation completeness is never represented by a fabricated `COMPLETE` status: these foundation adapters explicitly report `evidenceStatus: PARTIAL` for the broader provenance graph. The `resolved` outcome only certifies availability of the selected minimal projection.

Finality does not reuse record lifecycle: POSTED/REVERSED, OPEN/CLOSED and DRAFT/VALIDATED/CONFIRMED/CANCELLED remain separate typed fields. Open cash/finance rows are provisional; explicit manual summaries follow existing finality. Other values remain UNKNOWN rather than reproducing a full Operational Day finality projection in this substage. Operational Day behavior is unchanged.

Freshness supplies an explicit record timestamp, or a labeled STORE_FALLBACK timestamp, or UNKNOWN. `asOf` is assessment time, not source observation. Without a defined policy, assessment is UNKNOWN. Business date and historical age do not invent freshness; no generic confidence/data-quality percentage is introduced.

## Legacy, persistence and risk boundary

No schema, migration, fact/evidence database, ledger, historical backfill, synthetic evidence, data deletion or canonical writer changes are introduced. Test/legacy records without stable identity are unavailable; incomplete metadata/source produces partial projections or unavailable collections. There is no historical recovery requirement.

Resolver domain operations are SELECT-only and do not call command handlers, validation/confirmation commands or lazy domain writers. Tests compare exact canonical data_json bytes, updated_at values, audit rows and fixture object storage before/after every resolve, including failure/security outcomes. The compiled native D1 test additionally blocks INSERT/UPDATE/DELETE on domain_data with test-only triggers.

Existing authentication's schema readiness/owner reconciliation behavior is reused without modification or expanded scope. Those existing authentication metadata side effects are outside the resolver's canonical business-read guarantee. This change does not claim to solve or remove the known owner reconciliation risk.

PRIMARY D1 FAILURE ROOT CAUSE: **UNKNOWN — NOT REPRODUCED**. No root-cause work or production repair belongs to this change.

One real release-check dependency was found in existing security QA: `/D1/i` matched `d1` inside a random request UUID (`bc4e09aa-e2d1-4705-897e-f1e2b37bad42`), failing an otherwise sanitized response. The two affected unit/native-runtime assertions now validate the opaque UUID separately and scan all other body fields for diagnostics. Canary and payload privacy checks are retained. This is a test-only correction, not a D1 application/root-cause change.

## Release checks

- Actual-handler isolated SQLite security suite: valid/foreign scopes, guessed IDs, actor/data-owner namespaces, revoked permissions/memberships/session, malformed/unsupported references, private staging, changed record and input bindings, nested ownership, bounded pagination, safe fields and canonical byte equality.
- Compiled Worker route with isolated native D1: authentication, correct projection, revision binding, foreign scope, malformed reference, no outbound service and canonical mutation guards.
- Evidence API browser HTTP checks at 390 and 1280 px; actual session and adapter handlers, including revoked staging permission.
- Existing Operational Day, Sales/POS, Menu/Recipes, Warehouse and Phase 2 regression suites; no UI changes.
- Build, typecheck, lint, full npm test and all three mandatory GitHub jobs (`verify`, `sales-navigation`, `sales-scroll-layout`).
- Only after exact-head GREEN CI: push the identical source commit to Sites and save an archive-backed version. Production deployment requires the user's final confirmation.

Local evidence: targeted security suite 12/12, existing focused regression 29/29, native Worker/correlation suites and evidence API 390/1280 px PASS. Existing Phase 2 browser QA passes all nine profiles; Menu/Recipes consumption QA passes desktop/iPhone/Android; POS passes desktop/mobile/tablet. Operational Day fresh and cached profiles pass mobile/desktop. One initial fresh-profile run concurrent with artifact preparation observed `Unexpected end of JSON input`; the unchanged suite passed on recheck, and no error filter or assertion was weakened. Its transient cause was not established. The existing five-case Operational Day CI matrix remains mandatory. Full npm regression passes all 1,360 TypeScript tests and artifact/posttest suites; final-source build/typecheck/lint and CI evidence are required at release time.

Revenue/Operational Day projections and full revenue trace, warehouse/menu provenance graphs, Finance metrics, Business Health/AI evidence, reviews, payroll, integrations and user-facing source UI remain subsequent substages.
