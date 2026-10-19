# Local candidate: source-field reads, JSON sizing in code

Base production v552 / 16e9d202. No production request, push or publication occurred.
Environment was confirmed ready with the supported environment tool; shell and clean
base commit were verified before work.

Replaces both failed sizing approaches: no SQLite json_object/json_quote and no large
SQL escape expression. Short SQL reads return rowids and sums of original field byte
lengths (plus conservative per-column source overhead); subsequent parameterized rowid
queries read only the selected original columns. SQL never builds the escaped JSON.

Source rows retain a conservative 2,000,000-byte budget, checked before payload reads.
Encoded JSON has a distinct 2,300,000-byte budget, measured in JS. Source pages target
480,000 bytes; a larger permitted row is read alone. JS packs rows into parts targeting
480,000 encoded bytes, with a single larger permitted row alone. Derived hard part and
NDJSON line caps are 2,400,000 and 2,500,000 bytes. Manifest remains 1,000,000 bytes.
There is no aggregate business snapshot buffer. Original values are never truncated.

Preflight now reads bounded business values internally to measure canonical UTF8 JSON;
only counts/sizes/flags are returned, and no values are logged or persisted. It performs
no pause/run writes. A finite budget of 800 metadata/payload page reads returns
readBudgetExceeded and ready=false before pause if exhausted; column/schema/authorization
reads are additional. Incomplete sizing is not a readiness claim. Source and encoded
oversize both produce ready=false. The server repeats this check before creating a run.
The post-pause initializer uses only the existing unsupported-table census, avoiding a
second full payload scan in the same request. Capture rechecks each source/encoded row
under the unchanged owner/run/revision guards and persistent pause. Preflight remains
advisory; concurrent changes after it can still cause capture to abort safely.

## One narrow native scenario: PASS

`node --test tests/qa-json-fields-d1.test.mjs` — one run, 4.1 seconds.

- Synthetic audit source field: 1,122,007 bytes; complete canonical row: 2,194,287 bytes.
- Synthetic stock legacy field: 1,072,007 bytes; complete canonical row: 2,094,172 bytes.
- Preflight: ready, source bounds below 2,000,000; 26 source-page reads.
- Negative encoded row: 2,350,110 bytes, source still below 2,000,000. Preflight refuses;
  prepare returns failure and qa_pos_backup_runs remains empty (no pause).
- Native D1/R2 capture: six bounded requests; three parts; largest 2,194,332 bytes.
- Downloaded parts passed manifest/hash/count checks. Standalone Node harness with
  `--max-old-space-size=64` restored exact values and passed migration/rollback.
  Additional direct SQLite equality checks covered audit after_json and stock legacy_json.
- No outbound requests. The actual private QA3389 records were never accessed.

Typecheck reports only the two pre-existing Health errors. The 96MB test was NOT run;
its negative fixture and derived cap were updated to the new contract only. No full
application build/regression was run. Native scenario bundled the changed Worker and
harness; a production build remains part of a separately authorized publication step.

## Compatibility and remaining limits

Transport names remain qa3389-parts-v1 / qa3389-parts-receipt-v1, but contract content
now includes sourceRowLimit and the changed encoded rowLimit. Consequently the contract
hash changes; the newly packaged harness is required. Old harness/receipt cannot attest
this candidate's backup. No schema migration is added.

The local proof covers the two reported size classes and the negative encoded boundary,
not production quotas or the total latency/read count of the actual account. Actual
preflight may hit its read budget and must not be bypassed. Internal source sizing is
conservative; it is not a claim about SQLite's exact physical row encoding. Existing
Chrome/Edge file-save requirement and all other v552 contract exclusions remain.

Harness: `libfile_ab3296a600348191ae8892708a20871e`.
SHA256: `565e2e3eca812642bc2778160f2a50ea7270c605843b3f5356e8e9d4463562d8`.
Code/schema only; no private business data or credentials.
