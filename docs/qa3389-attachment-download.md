# QA3389 attachment download — local compatibility change

Base: production v553, commit 372dc16e. No production request, new backup, pause,
resume, migration, push or deployment was performed for this change.

## Supported UI path

The Download button now clicks an ordinary same-origin anchor. Its URL contains only
fixed scope IDs, current run ID and manifest SHA256; no email, session token or other
credential. The browser automatically sends the application's existing HttpOnly
`bd_server_session` cookie. The existing read-only authentication validates it, and
owner/venue/data-account isolation checks remain mandatory. No cookie or token is
created or synchronized by downloading. A missing/expired cookie returns 401; use
ordinary application sign-in rather than a credential-transfer fallback.

The endpoint returns `Content-Disposition: attachment`, NDJSON, private/no-store and
nosniff headers. It uses a ReadableStream with highWaterMark=0: manifest first, then
one R2 part per pull. Each part is size/hash verified before emission. Owner/isolation,
current run and backup key/hash are checked before every frame. Client cancellation
stops further reads. No aggregate Blob, File System Access API, security setting change,
public link, bearer URL, token minting, or persistent download access is introduced.
Authentication is performed at the start of the HTTP request; owner/run checks repeat
during the response. A late failure errors the stream, leaving an incomplete download
that the unchanged harness rejects; it cannot retroactively change the HTTP status.

The attachment route selects fixed QA3389 context through the existing auth mechanism;
this is not an authorization grant. Wrong explicit scope is rejected, and membership
plus owner checks still run. An ABORTED current run with retained backup key/hash is
readable. Download does not change its phase or paused flag. It cannot attest or resume
ABORTED migration. Creating a new run later replaces the current UI reference to the old
copy, as before.

## Existing backup compatibility

Wire format, manifest contract/hash and part contents are unchanged. The saved v553
backup run 247bad7e-79f6-4688-9c6e-0fabf4875123, manifest SHA
ab89b0a363eb23ed1d1c0f41fab3e648698e43ba41f05bead788d7b838847c36 is therefore compatible
by code contract; its real contents/status were not queried during this task.
The already validated harness `libfile_ab3296a600348191ae8892708a20871e` remains applicable.

## Single targeted validation

`node --import tsx --test tests/qa-backup-download.test.ts tests/qa-backup-ui.test.mjs`
passed 4 tests in 0.70s. The one download scenario uses the real route/auth/service and
transactional isolated SQLite with a synthetic R2 adapter; it does not access production.

- 212 parts, including a 2,194,137-byte emitted frame; all part hashes and manifest hash
  verified, sequential ordering and NDJSON format checked.
- No part read until requested by the stream consumer; one part per pull; cancellation
  triggers no additional reads. No full-file aggregation in product code.
- Existing cookie authentication succeeds without custom session headers or new cookies.
- Missing auth, wrong scope, stale run/hash fail. Mid-stream owner revocation, hash change
  and corrupted part interrupt the stream. ABORTED/paused=0 state remains exactly intact.
- UI starts a standard download link without picker, fetch or Blob; no credential in URL.
- Typecheck retains only the two pre-existing Health errors. Build PASS, including Sites
  artifact validation; logs are checkpointed.

No large migration or 96MB scenario was rerun. This is not a live browser-download or
production-quota proof. The response checks owner/run for each part (roughly two D1
reads per frame) and retrieves each part once; it is bounded in memory, not constant in
request duration/work. Final platform download availability must be confirmed through
the normal UI after separately authorized publication. Do not bypass a platform refusal.
