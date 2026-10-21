# Controlled current-venue backup and offline recovery

Not deployed. Reuses `qa-chunked-backup` and the existing ordered-parts offline engine. Additive migration0042 creates service state and scoped write-pause triggers; it does not start a backup or modify business history.

Only the authenticated owner of the current venue may operate. Data account must belong to exactly one venue. Other tenants and shared authentication remain outside the backup. Unknown tables and unsupported populated domains reject capture.

Supported API: GET `/api/business-backup?preflight=1`, GET `/api/business-backup` status; POST same endpoint with current `venueId`, `accountId`, `confirmation:"CURRENT_VENUE_BUSINESS_BACKUP"`, and `action:"prepare"`. Continue with `action:"resume"` plus returned `runId`; abort with `action:"abort"` and that ID. Do not substitute a different tenant. No restore action exists.

Capture briefly pauses writes only to the scoped business sources. A two-minute renewable lease bounds abandonment. Expiration invalidates completion; abort and retry from a new capture. Revision/owner/source guards prevent stale or mixed completion. R2 failure aborts safely. Completed prepare is idempotent; explicitly abort the completed service run to prepare a newer backup after saving the prior artifact. Existing R2 copies are retained; no automatic backup retention catalog or scheduler is added.

After COMPLETE, GET `?download=1` returns the manifest; attachment GET `?attachment=1&runId=<ID>&hash=<manifest hash>` streams ordered NDJSON. Every part rechecks owner/run/hash. Preserve the full NDJSON and manifest hash privately, not only the receipt. Verify downloaded length/hash before considering it available for recovery.

Package the existing tool with `node scripts/package-qa-recovery.mjs PRIVATE_TOOL_DIRECTORY --parts --business`. Run its documented offline command into a new private directory. It never applies a production restore or overwrites a destination. Failure yields no success receipt; do not use a partially restored target. Source artifact remains unchanged. Production identity reconciliation and controlled restore activation require a separate reviewed operation.

Scope: raw business domain_data including balances, captures, links/reconciliations and markers; normalized stock/sales/POS rows; operational/audit/business tables and journal migration v2 metadata; safe venue profile; files under the five account-owned prefixes. Shared auth, sessions, memberships, credentials, regenerable financial scratch caches, backup service state and platform migration metadata are excluded. Historical migration archive objects outside supported asset prefixes are not copied. This is not a backup of the hosting account.

Bounds remain explicit: source row 2MB, target part about480KB, manifest1MB; oversized input rejects without deleting source. No promise of unlimited history or known hosting quota. Native D1/R2 local fixture verifies 22 table hashes, exact assets and financial result; operational production recovery has not been executed.
