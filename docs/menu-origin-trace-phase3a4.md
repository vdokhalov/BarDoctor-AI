# Phase 3A.4 — Menu & Ingestion Trace

Production baseline: Sites v473, `6d4b5c13b988190e790698ba422b4654b12d33f5`.

## Existing canonical source contract

Manual, Scan and Import converge on `POST /api/menu/ingestion`: create → review/update → validate → confirm. `bd_menu_ingestion_v1` contains version-1 drafts scoped to the venue: source MANUAL/SCAN/IMPORT, stable draft ID, row IDs `${draftId}:${index}`, revision, lifecycle DRAFT/VALIDATED/CONFIRMED/CANCELLED, reviewed/decision fields, target ID and existing-item base. New canonical IDs are `menu:${draftId}:${index}`. Validation binds rows, current assortment and accounting currency; edits increment revision and clear validation. Confirm applies the existing business logic through CAS, retains validation hash, confirmedAt and resultIds, and creates the existing `audit_log` before/after Menu record for that exact operation. Confirm retry with the same revision/hash returns the existing identity without writes. A create hash proves retry equivalence but cannot reconstruct the original submitted values.

Diff outcomes remain ADDED, CHANGED, UNCHANGED, INVALID, CONFLICT and SKIPPED (excluded). Applied UNCHANGED rows participate in confirm but do not create or rewrite a Menu item. SKIPPED and CANCELLED rows never prove successful origin. A post-confirm preview is recalculated against current Menu and may be stale/conflicting; it is not historical confirmation evidence.

`/api/catalog/import` preprocesses existing CSV/XLSX inputs and uses the current recognition/normalization contract. The original upload is retained at `catalog/${serverDataAccountId}/${fileId}` with originalName, uploadedAt, MIME, size and R2 ETag. Draft provenance retains sourceFileIds when supplied, but neither the original recognition result nor per-file source-row mapping is retained in canonical ingestion history. Recognition provider job diagnostics are transient/private and are not evidence. Review edits replace draft values. No original value, upload SHA-256 or historical recipe snapshot is invented.

Recipe lifecycle remains Phase 2: RECIPE creates `recipe:${rowId}`, restores an eligible inactive recipe or selects an existing active recipe; other consumption modes retain existing lifecycle rules. Current taxonomy is resolved by `canonicalTaxonomyForAssortment`: explicit stored trees (including renamed, archived or empty trees) are authoritative; only absent structure permits the existing fallback.

## Read projection and resolver

`GET /api/evidence/facts/menu-origin?menuItemId=...` selects one canonical Menu item. Optional expectedRevision binds its content. Client account/dataAccount/workspace identity and arbitrary query keys are rejected. Scope comes from the existing authenticated Evidence context. Responses remain private/no-store.

MENU_ORIGIN is a stable Business Fact identity scoped by workspace, venue and canonical Menu ID. It exposes bounded scalar current Menu fields, creation origin when provable, origin draft/row, creation outcome, latest proven confirmation participation, currentMatchesConfirmed, real record timestamps, content revision, bounded references and honest limitations. Source types are MANUAL, SCAN, IMPORT and LEGACY_UNKNOWN. Missing historical source states make overall provenance PARTIAL; legacy/no-proof items stay LEGACY_UNKNOWN without a synthetic draft or Manual attribution. FINAL means a proven confirmed creation, not complete historical provenance. No freshness threshold or confidence percentage is invented.

New separately bound evidence kinds:

- MENU_ORIGIN → current MENU_ITEM, actual MENU_CONFIRMATION, current MENU_RECIPE and MENU_TAXONOMY.
- MENU_CONFIRMATION → MENU_REVIEWED_INPUT and existing MENU_INGESTION_DRAFT; outcome and applied values come from the unique existing confirm audit scoped by dataAccount, operation ID, source reason and confirmedAt. Nested row, reviewed/apply decision, result ID, base and applied values must agree. Current Menu state is explicitly separate.
- MENU_REVIEWED_INPUT → stored reviewed values, decision/review/lifecycle/validation state, confirm-audit outcome when available, otherwise clearly marked current validation preview. Original sourceValues are null because they were not retained.
- MENU_SOURCE → actual source classification and existing draft; safe MENU_SOURCE_FILE references only when a provenance file exists in this server-derived R2 namespace.
- MENU_SOURCE_FILE → bounded existing name/MIME/size/uploadedAt and R2_ETAG binding, with the existing authenticated download path. No binary, arbitrary source URL, provider prompt, credential or provider diagnostics.
- MENU_RECIPE → current canonical owned recipe ID and lifecycle metadata. Marked CURRENT_DEFINITION_ONLY/HISTORICAL_RECIPE_NOT_RETAINED; no claim that a mutable current definition is the confirmed historical recipe.
- MENU_TAXONOMY → current authoritative IDs/labels/active states, with stored-tree/fallback basis. No preset label replaces a custom or archived label.

Original MENU_ITEM and draft parent content hashes remain compatible with Phase 3A.1–3A.3. Existing draft pagination/participation relations remain unchanged. Each new relation has its own content binding. Changed draft, confirmation input/audit/current Menu, recipe, taxonomy or source metadata causes READ_MODEL_CHANGED for the corresponding old reference, without creating a historical snapshot.

## Security and read-only guarantees

Menu origin/current definition requires existing inventory.view. Private staging, reviewed input, confirmation and upload evidence requires inventory.manage. The inventory.view-only projection omits private origin/confirmation information and reports restricted relations. Every resolve reauthenticates and validates active venue/workspace/dataAccount scope; IDs are not capabilities. Draft rows, recipe parent ownership, explicit workspace/venue fields and draft file membership are checked. R2 is accessed only in the server dataAccount namespace.

Only SELECT, store reads and R2 head operations are added. No canonical writes, repair, migration, backfill, second store, provenance ledger or ingestion behavior/UI change. Tests compare all canonical store bytes/timestamps, audit rows, original upload bytes and R2 metadata before/after successful and denied evidence reads. SQLite guards forbid canonical changes; the same existing Phase 3A.3 guard permits auth's INSERT OR IGNORE for an already-present domain key, which cannot alter canonical contents. Owner reconciliation behavior is unchanged and remains outside this phase. PRIMARY D1 FAILURE ROOT CAUSE: UNKNOWN — NOT REPRODUCED.

## Validation

Targeted tests use real session/auth, actual ingestion/confirm handlers, actual upload/preprocessing/normalization (only the external recognition model is fixed), isolated transactional SQLite and existing R2 records. Every reachable reference is resolved with pagination and expected binding, not merely shape-checked. Cases cover Manual correction/recipe, Scan correction, CSV UTF-8/BOM/ASCII and XLSX, ADDED/CHANGED/UNCHANGED/SKIPPED/INVALID-corrected/CONFLICT, cancellation, repeated/lost-response confirm retry, legacy, current Menu/recipe/draft/source changes, multiple uploads, missing confirm audit, tenant/RBAC/guessed/nested/foreign-file rejection and canonical read-only equality. Compiled Worker/native D1 and browser HTTP 390/1280 checks complement the existing Phase 2 Menu/Recipes mobile/desktop regression.
