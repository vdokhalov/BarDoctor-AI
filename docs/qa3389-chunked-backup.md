# QA3389 bounded-part backup: local candidate, not published

Production remains v551 / 2c948481. Its last prepare hit the aggregate snapshot
limit; run 887d9780-6003-4506-83da-f570b3cfcc0b was confirmed ABORTED, paused=0,
POS legacy, no SHA at 10:22:00 UTC. No further production operation was performed.

## Fixed scope and changed components

- `qa-chunked-backup.ts`: owner/scoped size census, immutable parts and manifest,
  four work units per resume, revision-guarded persisted progress, bounded verification.
- SQL0038: progress metadata column only; existing pause triggers remain enforced.
- API and service screen: manifest/part downloads, streaming local file writes,
  explicit stage continuation and stop, new receipt format.
- POS migration: optional reference to the complete verified business manifest;
  no second SELECT of all domain_data on this QA path. Its original source row is
  still preserved in the small POS rollback object. Other callers retain their old behavior.
- Offline parts entry and packaging: sequential staging/restoration/comparison on
  disk; actual POS migration and rollback; receipt written only after all checks pass.
- One native synthetic volume scenario and the three scoped UI tests.

## Format and consistency

Business contract v4; manifest `qa3389-parts-v1`; receipt `qa3389-parts-receipt-v1`.
The root hash is SHA256 of the canonical manifest, NOT the hash of the downloaded
NDJSON file. The manifest commits every ordered part's SHA256, byte length, table
and row count, asset offsets, scope, contract and schema hash. Old receipts are not
accepted by the new API. Use the new packaged harness built with `--parts`.

Rows are read in rowid order with conservative byte metadata, targeting 480KB per
page. The 2,000,000-byte conservative row ceiling remains, including the legacy POS
array and safe profile. Oversize rows block prepare before pause; there is no truncation.
Files use 300KB R2 ranges, checked against original ETags and repeated final inventories.
Zero-byte files are included. There is no 32MB total snapshot or 16MB total asset buffer.

Parts are content addressed under a unique run. Readback is verified before progress
is committed with owner/run/revision guards. A lost response can resume durable progress;
a stale concurrent request cannot commit or abort a newer revision. Aborted/incomplete
objects may remain as private orphans; they are never a completed backup or reused by a
new run. Capture failure attempts normal guarded abort; unavailable auth/DB can prevent
cleanup, so the persistent pause must always be checked. Stop in the UI merely stops
continuation after the current request; it does not release the pause.

Before transfer and before/after activation, saved parts are read and verified again,
and frozen live business rows are hashed sequentially. POS tables and the legacy POS
source are handled separately: original orders are compared explicitly, while all other
business rows and assets must match. POS activation retains its original CAS guards.
After activation, abort remains forbidden; complete verification or roll forward.

## Download and recovery

The browser gets the bounded manifest, then authenticated parts pinned to the manifest
hash. Each part is written immediately to a user-selected file. No aggregate `blob()` or
JSON parse of the whole backup is used. Chrome/Edge File System Access is required;
unsupported browsers get an explicit message and no memory-heavy fallback.

The Node24 offline harness reads bounded NDJSON lines, validates every ordered part,
stages privately on disk, creates a fresh SQLite database, restores FK dependencies and
files, and compares each bounded page. Identity rows are synthetic, as in the previous
contract. It runs actual POS prepare/copy/activate/rollback, then repeats exact business
row and file comparisons. No external packages or network calls at runtime. Failure
leaves a private partial directory and no PASS receipt; use a NEW target directory.

## Measured local evidence

Final native D1/R2 scenario (49.1s):
- 106,851,842 payload bytes; downloaded NDJSON 106,935,271 bytes.
- 280 parts; largest 400,078 bytes.
- 451 domain rows (450 large synthetic rows plus one nonempty POS order store),
  650 audit rows; domain_data alone exceeds the former 32MB ceiling.
- 76 capture requests; 441 bounded verification/cutover requests; 280 part downloads.
  These are application requests, not separate model/tool interactions; the UI continues
  a stage automatically and can stop. Total work/latency is not constant in data size.
- Standalone harness succeeds with `--max-old-space-size=64`: restore, migration,
  rollback PASS. This is a JS heap limit, not a measurement of total process RSS.
- Oversized-row preflight creates no run. Writes during pause fail. Abort releases pause;
  a new run has a new ID; stale run resume fails. Missing/corrupt R2 parts fail closed.
  Incomplete offline download creates no receipt. Exact restored counts match manifest.
- Native cutover completes with one POS order, pause off, audit rows intact, zero outbound.
- Three UI tests PASS: inert start, receipt/stage gates, sequential authenticated file writes.
- Typecheck has only the two pre-existing Health errors (snapshot:372, test:10).
- Build PASS, including the emitted navigation contract and Sites artifact validation.

## Limits and what is NOT proven

No live QA3389 row/asset measurements were obtained. New preflight returns aggregate
row counts, conservative total/max encoded sizes, asset count/bytes, and estimated part
metadata, without returning business payloads. It is advisory: prepare repeats it, and
paused capture rechecks. Do not infer that the actual legacy POS array fits 2MB.

Manifest/progress metadata has a 1MB cap. Conservative estimated part metadata and
profile size are checked before pause; asset inventory itself is bounded. This is a
QA-scoped implementation, not an unbounded backup platform. Encoding upper bounds can
reject a near-limit row conservatively. Native local D1/R2 proves compatibility with the
fixture, not production CPU/subrequest quotas, network availability, or arbitrary real
schemas. Browser file permission behavior was covered by a scoped UI test, not an
interactive real-browser download. The only authorized unverified exclusion remains
exactly __appgarden_migrations. No new business tables or data were excluded.

No push, deploy, real prepare, actual backup download, paid AI, or support contact.

## Deliverable

Offline parts harness: `libfile_f98841daa2e481919161ae3f68c659fd`.
Archive SHA256: `3e1e81ca1f848d242b934cc5ccfc5f0e68158a0eb536d99d612be0e7ae8382bb`.
It is code/schema only, and contains no production data or credentials.
