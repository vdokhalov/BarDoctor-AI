# Sales / POS iPhone hardening

Baseline: production v459, `bd07a29591515ec698194794cc08a5480c5ba225`. Production is unchanged by this work.

## P1-01 — safe area

The supplied iPhone images show Back and Sales under the status clock. The standalone cashier opted into `viewport-fit=cover`, removed the shared shell header, and forced body top padding to zero. Its replacement header did not consume the top inset. Mobile Back also reduced its target to 40 px.

Cashier and standalone Manual Sale/Cash Shifts now consume the shared `--bd-safe-*` variables. Back is at least 44 by 44 px. Fullscreen Sales frames explicitly resolve the outer viewport safe-area environment so their top bar and document can use the same inset. Bottom checkout retains its own bottom inset and measured content clearance. No hardcoded device inset is used in application code.

## P1-02 — navigation

A reproducible ordering defect affected resume links: the outer Sales iframe capture listener navigated before the draft link bubble handler could persist its shift. A different previously selected legacy shift could therefore open instead. The new Sales navigation adapter dispatches a cancelable preparation event before routing, persists resume selection there, retains venue queries, uses canonical SPA navigation for embedded destinations, and uses top-level document navigation for standalone cashier/manual routes.

A local pending message and busy marker appear immediately. A pending navigation accepts one destination; rapid repeated taps cannot issue a second transition. A stalled transition becomes retryable. There is no global loading overlay. Cashier shift/open/new-order controls are disabled while their request is active. New Order retains the successful receipt until refresh succeeds, avoiding the old outside-the-busy-guard reset.

Static screenshots cannot establish the cause of every intermittent tap reported by the user. No general device performance or network defect is claimed. Browser Back preserves the existing modal-first behavior: close the document, then leave the journal.

## P1-03 — cash shifts

Native authoritative cash shifts have venue/account scope but no register or terminal identity. Register IDs found in integration configuration do not constitute native POS registers. POS-1 therefore enforces at most one newly opened authoritative cash shift per venue.

The planner rejects a distinct new shift with `SALES_EVENT_SHIFT_ALREADY_OPEN`. Existing operation-ID retries retain their previous behavior. The existing compare-and-swap transaction and retry mechanism serializes conflicting opens: the losing request reloads the winner and returns HTTP 409. Real-handler SQLite concurrency tests assert one created shift and one open audit event.

Legacy parallel shifts remain selectable and closable. They are not automatically closed or rewritten. Operational shifts, ordinary finance rows and foreign venues are not counted as authoritative cash shifts. Opening controls present the existing shift and direct users to continue in it or close it first.

## P1-04 — venue timezone

The canonical timezone is the IANA `timezone` field in the active venue account restaurant profile. The API marks missing/invalid values unconfigured and retains the existing UTC fallback. The screenshots demonstrate unconfigured state; the exact production profile was not read or modified. A legacy profile without the newer timezone setting is a supported explanation, not a verified production database finding.

UTC can differ from local business date near midnight. The UI now states that risk and links to the existing venue profile settings. It never substitutes the device timezone. Explicit UTC is treated as configured. An already opened cash shift retains its captured business date/timezone; POS and Manual Sale continue using that authoritative shift date. Configure the venue timezone explicitly in Settings before opening the next shift if UTC is inappropriate.

## Scope and safety

No schema changes or migrations. No production data operations, timezone updates, legacy shift closure, secrets or resource changes. No POS-2, redesign, finance, warehouse, cost, posting, payment, draft format or idempotency changes. The only server business-rule change is the requested open-shift guard; the API adds its controlled 409 code.

## Reproduction and verification

- `tests/sales-iphone-hardening.test.ts`: concurrent real handlers, retries, existing/closed/foreign/legacy shift cases, missing and configured timezones, local midnight and DST, POS and Manual Sale shift dates.
- `scripts/sales-iphone-browser.ts`: real route/API handlers and isolated SQLite, touch events, Chromium environment-level safe-area override, delayed navigation/API, duplicate taps, hit testing, venue propagation, legacy draft resume, 12 lines, checkout clearance, reload, document/warehouse links, modal browser history, timezone settings link.
- Profiles: 390x844 with top 59 / bottom 34 simulated insets; 390x844 with zero insets (Android-like); 820x1000; 1280x800. The inset numbers belong only to QA, not product CSS.
- Existing POS-1, POS hardening, Sales STEP 2, OBS01/OBS02 and timezone browser suites remain release gates. Fixtures that previously opened a second shift now assert rejection and explicitly seed pre-existing legacy records for selection coverage.
- Full repository test/build/typecheck/lint and GitHub CI are required before release. Generated screenshots and machine-readable QA reports are under `outputs/sales-iphone-hardening/`.

## Limitations

Automated Chromium touch/safe-area profiles are not physical iPhone Safari or installed PWA certification. The original screenshots are physical-device evidence of the baseline issue; the corrected build still needs a real-device check after an explicitly authorized deployment. Production stays v459 until that separate authorization.
