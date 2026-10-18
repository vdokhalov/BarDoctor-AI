# Bounded cost evaluation with guarded reuse

Base: e0dd35b09718870ccdf0d6f97c5f961486ae2602 (published v536). This change is local, not published.

Startup requests now select batchSize3. Discovery reads only the menu source; each page then reads one consistent full snapshot of sources, profile, permissions, states, episodes and private calculation receipts. A request-owned current-cost reader shares source preparation, journal projection, evidence and ingredient memo. State/episode/receipt writes commit atomically under source/state/profile/access CAS guards. Even an entirely reused page checks these guards and the live stock-journal state/revision before returning. Explicit owner verification continues to reread and calculate current sources.

Receipts cover healthy items without episodes as well as active/resolved/not-applicable signals. Their identity includes full raw source contents/presence/timestamps, stock journal marker/revision, complete profile, workspace/venue/data-account scope, UTC date and calculation version. State+episode content identity prevents reuse after independent verification or inconsistent state changes. Invalid/unavailable calculations do not create receipts. Receipt keys remain private under the existing __bd_p4a namespace. A change to calculation semantics must bump COST_CALCULATION_VERSION (and receipt contract when appropriate).

The tracked phase still traverses existing states to preserve deletion/recurrence coverage, but does not recalculate matching receipts. Cursor input identity restarts discovery when sources/date change between pages, preventing insertion-before-cursor omissions. No old timestamp is substituted as proof of new calculation; original observations/verification records are retained on reuse. Source identity is deliberately coarse: any changed input invalidates all dependent page receipts rather than guessing per-ingredient dependencies.

Three is a maximum, not an unconditional work size. If raw or expanded source data exceeds256KB, a request performs at most one new calculation; cached results may still be reused together. This includes journal projections hidden behind small domain markers. Existing2MB/source,10,000rows/collection,64KiB/state-or-episode and journal-fact limits remain. No timeout increase, schema migration, server-global cache, new credentials or production data changes.

## Measured comparison

Identical synthetic fixture:77 recipes,115 nomenclature items,230 stock movements,5 ingredients/configured recipe;8 cards with empty recipes. Actual route/auth/CAS code with in-memory SQLite; both versions instrumented in isolated test builds. Includes initial and final list GETs. No HTTP network latency; these are not production timings.

| Metric | v536 cold | optimized cold | v536 unchanged | optimized unchanged |
|---|---:|---:|---:|---:|
| API requests |87|31|87|31|
| Full-source snapshot SELECTs |172|31|172|31|
| All SQL SELECTs |354|125|354|125|
| Source preparation/expansion calls |172|28|172|2|
| Item calculations |85|77|85|0|
| Total wall ms |1258.8|929.1|1076.8|162.8|
| Maximum page wall ms |34.8|54.6|20.2|14.4|

Source SELECTs including menu-only discovery are60 for the optimized path. The cold pass is not computation-free: grouped requests have a higher per-request peak on the small dataset. No actual hosting CPU quota/trace was available, so local process CPU measurements do not certify Cloudflare CPU headroom.

Stress fixture:3 recipes,8,000 nomenclature items and8,000 movements; source payloads1,078,923 and1,559,381bytes. With the large-source fallback, cold wall690.5→592.8ms, maximum page243.1→217.3ms; unchanged537.8→113.1ms, requests6→4, calculations4→0. The expanded-journal test separately confirms fallback when the stored marker is<100bytes but projected facts exceed256KB.

## Validation and limits

60 distinct scoped tests passed across runs:29 existing cost lifecycle/correction tests,24 new batching/reuse/race/invalidation cases,4 client coordinator tests and3 existing reader/reconciliation regression tests. Coverage includes equivalent observations/verification, all input source/profile/date/calculator invalidation, future receipt becoming effective, journal migration/revision/live-state guard, healthy items without episodes, new/deleted cards, cursor restart/resume, three exhausted CAS retries, no partial writes, errors/unknown, tenant scope and generic-store receipt write rejection. Browser and final build receipts are in the checkpoint directory.

TypeScript check reports two errors in files unchanged from the base: business-health-snapshot.ts:372 (partial status label union), purchases.ts:687 (UUID-shaped default inference). No diagnostics remain in changed files. These unrelated errors were not altered or hidden.

Evidence: /workspace/checkpoint/cost-batch-optimization (benchmark.json,stress.json,test logs,build-final.log,browser logs). Production speed must be measured only after a separately authorized publication. No full audit/test suite was run.
