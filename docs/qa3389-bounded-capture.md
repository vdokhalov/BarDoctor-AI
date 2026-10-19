# Bounded QA3389 capture — prepared, NOT published

Confirmed v549 evidence: 2026-10-19T09:54:00.741Z, request b6ad0afc686cc5b94995dfc7788e641b, run0517144b-5095-4c90-ba13-decdcb5bcbd3, CAPTURE_BATCH/MEMORY_LIMIT,34statements, provider index null, cleanup ABORTED. This confirms memory-class failure at the original D1 batch boundary, not which table, row volume, result-size ceiling or internal allocator failed. No actual business rows were copied for diagnosis.

## Change and consistency

Replace the one all-table payload response with guarded, bounded reads under the same durable QA-only pause. Every count, page-metadata read and payload read is its own transaction containing the existing current-owner and pinned run/revision/phase/paused guards. No unguarded payload query or retry. Business writes remain blocked by the existing SQL triggers; pause/run change interrupts capture. Counts before/after, row IDs and page cardinality are checked; final contract schema is rechecked under guards. Only then may the complete snapshot be written and hash-verified in private R2. The outer run transition still uses CAS. Snapshot v2 format, contract, scope, exclusions, restoration and cutover equality checks are unchanged.

This deliberately replaces single-transaction read consistency with consistency enforced by the persistent write pause plus guarded page transactions. Tests prove ordinary writes are rejected between pages and abort/run changes prevent completion. It does not provide coherence against privileged out-of-band writes bypassing the application pause triggers.

Metadata fetches at most64 row IDs and encoded-size bounds; values are not returned in metadata. json_object uses groups of16 columns to respect32SQL-function arguments, plus conservative numeric-encoding margin. Data pages target512KB; one larger row may use its own page up to2MB encoded bound. Oversized rows stop BEFORE payload transfer. Original row IDs are removed from exported objects; exact business contents are preserved. Existing journal log sequence ordering remains intact.

Safety boundaries: at most100payload pages/capture,32MB cumulative row data and original32MB final snapshot/16MBowned-file cap. These are fail-closed limits, not truncation. The page count prevents unbounded D1 calls but does not establish the unknown Sites plan's invocation budget. A large supported row/page can still hit provider-specific limits; the sanitized diagnostics remain. Final JSON/R2 path still holds a bounded whole snapshot in Worker memory: this is a targeted fix for the observed aggregate D1 response, not a general streaming backup implementation. If actual data exceed these bounds or fail later serialization, stop; do not silently reduce copied rows or weaken verification.

Any failure inside CAPTURE data collection now attempts the existing owner/run-guarded abort, including size/page/consistency gates. If D1/auth cleanup fails, a subsequent status/manual abort remains required; no unconditional cancellation guarantee. Failures during later COPY/CUTOVER do not auto-rollback active POS. R2 readback failures retain their existing explicit recovery behavior.

## Targeted evidence

Previous native fixture had one multi-chunk sale (~200KB) and tiny other tables; it checked semantics, not multi-megabyte aggregate response pressure. New source fixture has64synthetic audit rows (~6.17MB) plus stock/sales/POS; no private data. The scoped test imposes a simulated600KB D1-response memory budget (a test model, NOT a claimed production limit). New maximum observed response481983bytes,16payload pages; all64rows match exactly. The former combined response would exceed this modeled bound.

Native D1/R2 integration now captures the same class of multi-megabyte history, writes its backup to a private temporary file, executes the actual standalone Node SQLite/files harness, checks counts, POS migration/rollback, v2 receipt and gate, and separately restores native D1/R2. Synthetic tests also cover pause interruption, oversized-row rejection before payload fetch, unchanged unknown-table/owner/contract guards, and cleanup. No full regression or new production prepare was run.

Next: review/approve publication, then only the already-agreed controlled browser backup workflow with matching v2 harness. This change does not require a new schema or receipt format. Actual QA3389 success is not claimed before a real verified backup and local recovery.

Browser independently confirmed auto-abort at09:54:12UTC: same run0517144b-5095-4c90-ba13-decdcb5bcbd3,3389/148,ABORTED,paused0,POSlegacy,no backup SHA. No repeated prepare. No production mutations during this local fix.
