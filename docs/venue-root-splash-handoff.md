# Root-entry splash handoff

## Proven defect

With an existing session and persisted `bd_venue_context__<session>` containing
the active venue, `bdVenueHomeV249()` returns `/home?venue=901` in the isolated
test. The startup gate compared this full URL with `/home`. It consequently
selected its non-Home branch, attempted release once before Home committed,
and never installed the Home-ready polling effect. Home subsequently rendered
under the static splash with no JavaScript exception.

Reload starts at pathname `/home`, so the same comparison selects the correct
branch and releases the splash. This explains the reproduced root-entry versus
reload difference; it does not establish the cause of historical 30s Worker
cancellations or every possible embedded-browser failure.

## Evidence and fix

The regression runs actual shipped HTML, bootstrap, bundle and CSS, with an
isolated API and persisted local session/venue contract. Before the fix it
reaches Home but fails waiting for splash removal (5000ms). After the fix the
same assertions pass at 390x844 and 1280x720, for root entry and direct Home.
It asserts one document load, unchanged active venue, no runtime exception,
and removal of both splash and pending state. Anonymous login coverage remains.
The previous startup fixture did not seed the persisted venue context and
entered `/home` directly, missing this branch.

The only runtime logic change compares the target pathname rather than its
query/fragment. It preserves the target URL and venue selection; no auth, D1,
business data, retry, timeout, or permission contract is changed. The canonical
native-continuity generator owns the change; bootstrap cache identity advances.

## Release boundary

Production was not changed during diagnosis or tests. Full CI is required before
requesting deployment approval. A production smoke check, including first open
inside the chat and Phase 4 purchase flows, remains required after an approved
deployment. Phase 4 is not declared complete; Phase 5 has not started.
