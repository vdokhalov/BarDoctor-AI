# Minimal attachment Request construction fix — local only

Base: v554 / cda39b981b42611ba6217860e6ee72cf903153ab.
Production event at 2026-10-19T16:32:12.847Z, request ID
0dcaf5928eb16fed2244103694c6cc64, returned HTTP500 at the Request constructor,
before authentication and backup access. Production was not requested again.

The sole product change replaces `new Request(r, {headers})` with
`new Request(r.url, {method:'GET', headers})` in the GET attachment path.
Vinext passes a Proxy around NextRequest. Workerd interprets that proxy as a URL input
rather than a native Request; explicitly using the URL string avoids that mismatch.
The same copied headers, including the existing server session cookie and explicit
QA3389 venue header, enter the same read-only authentication and owner/scope/run/hash
checks. No token, public access, backup format or streaming logic changes.

## One targeted native integration test

`node --test tests/qa-attachment-vinext.test.mjs` — PASS (1.42s scenario).
Uses the installed Vinext createTrackedAppRouteRequest wrapper, the actual GET handler,
workerd through Miniflare, native D1/R2 and synthetic accounts/session/backup only.

- OLD constructor on the tracked NextRequest reproduces TypeError:
  `Invalid URL: [object Request]`.
- FIXED actual handler returns HTTP200, Content-Disposition attachment, private/no-store,
  and exact NDJSON manifest/part frames with matching SHA256 using the existing cookie.
- No Set-Cookie. Missing cookie401; wrong scope403; stale run/hash409; non-owner refused.
- Synthetic current run remains ABORTED, paused=0. Zero outbound requests.
- This is explicitly NOT a plain Node Request-only test.

No general regression, repeated large-volume test, production download, new backup,
copying or migration was performed. The saved real backup was not read or modified.
Build PASS, including emitted navigation and Sites artifact validation; evidence is
retained in the checkpoint. Live success still requires a separately
authorized deployment and normal UI download; this test is not that live confirmation.
