# Sales v457 startup fixes

Production smoke found two client startup defects after the venue timezone release.

## Import date before venue context

The import source chooser was usable before `/api/sales-batches` returned. `today()` then used the initial UTC fallback; opening a text, voice or manual editor froze that date even when the venue timezone arrived later. For an American venue this could be a different calendar day.

The import button now starts disabled and becomes available after the authoritative payload is applied. Both source chooser entry points and individual source handlers require loaded create permission and a matching active venue. Existing save, draft and post operations are unchanged. A failed initial load leaves creation unavailable; Refresh can retry. Explicit business dates remain unchanged.

## Anonymous cashier deep link

`/cashier?venue=...` sends an explicit venue header even when local storage has no selected venue. The shared response guard treated the resulting 401 as a stale venue response and threw an AbortError before the cashier auth handler saw it.

The guard now permits only a 401 with no selected venue both before and after the request, and only when the context epoch is unchanged. Successful data still requires an exact venue match. Existing active-venue and cross-tab stale-response protection remains. The existing cashier `/login` handoff handles the response; no new auth flow is introduced.

## Regression coverage

- Real-handler browser fixture with delayed sales-batches response: early button/source events cannot open the editor; after context arrives the default date is venue-local, on 390/820/1280.
- Anonymous, invalid and expired cashier sessions with and without a venue query use canonical login.
- Venue guard tests cover anonymous 401, successful data rejection without a matching venue, and rejection of a late 401 after another venue is selected.
- Existing timezone, DST, overnight shift, venue/account isolation, POS, manual sales, retry, draft recovery and network/server error tests remain in scope.

No migration, production data rewrite or production deployment is part of this fix preparation.

Local validation: 1,856 tests passed (549 artifact/data-integrity, 1,301 unit, six editor posttests). Typecheck and verified build passed; a transient Windows/OneDrive file-open failure during post-build processing was retried successfully. Both real-handler browser suites passed at 390/820/1280. Changed production assets match the verified build. Physical-device testing was not performed.
