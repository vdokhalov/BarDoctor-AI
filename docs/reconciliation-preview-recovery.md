# Reconciliation preview: bounded POS reference reads

Production v564 request `720cca70416737b91bd283c69c48e537` at 2026-10-20T19:54:17.082Z returned HTTP 500 from `POST /api/sales-reconciliation`. Its stack reaches `readSalesEvents` at the `SALES_EVENT_READ_LIMIT` throw. No write was reached. The live payload's byte count was not logged; a 47-event normalized history exceeding 2 MB reproduces the failure locally.

The reconciliation handler only uses POS events to detect an already-linked `batch.id` and validate ownership. Reading the whole expanded capture history into an aggregate array applied a 2 MB limit to irrelevant retained payload. The new dedicated reader preserves each event's chunk ordinals/count, payload hash, event identity, tenant validation and recursively checks full nested ownership before retaining only `{id,venueId,batch:{id}}`. It checks the normalized journal revision/state before and after reading. The unchanged raw journal marker remains in the caller's preview digest and CAS snapshots.

Limits are not increased: raw legacy history, each hydrated event, metadata and retained reference projection stay bounded at 2 MB; row limit remains 10,000. SQL withholds a payload exceeding the per-event bound before it is joined or parsed. Invalid captures, nested foreign ownership, changed revision and duplicate linked POS batches still reject reconciliation. The original full-history reader and other consumers are unchanged.

Known domain read errors now produce JSON 422; CAS conflicts produce JSON 409. The UI handles an empty/non-JSON response with its HTTP status and operation ID, preserves the form, and never automatically repeats the request. The script URL changes to invalidate the prior controller cache.

Verification: 19 handler/journal tests PASS; the actual isolated handler previews seven links totaling 2790 with 47 normalized POS events above 2 MB. Hash tampering, oversized events, nested foreign workspace, concurrent revision changes and existing POS batch links remain rejected. Chromium 390 component flow PASS, including an empty preview response, preserved fields, disabled apply, exactly one preview request before manual retry, backup download, stale preview refusal, and uncertain committed response resolved by status.

No live preview replay or live apply was performed. Production retest must follow deployment and use a fresh preview/backup before any separately coordinated apply. The previously filled live form was not modified by this engineering task.
