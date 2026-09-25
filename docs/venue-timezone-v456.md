# Venue timezone fix after v456

Production baseline: v456, `1af8dd358c7743a1f8372c868de17456692bc477`. This change requires separate deployment approval.

## Problem and behavior

At 2026-09-30 21:30 UTC, Chisinau is already October 1. New POS shifts and unshifted manual sales previously used September 30, so revenue entered the previous month and a closed September could block an October operation. Journal timestamps were formatted in the device timezone.

Each venue can now save an explicit IANA timezone in its existing profile. UTC remains the canonical server timestamp. New shifts and unshifted sales derive their business date from the venue timezone. Shift opening/closing clock values use the captured shift timezone. Selected overnight shifts retain their original business date and timezone, including after a profile timezone change. Existing documents, movements and monthly reports are not rewritten.

Import defaults use the venue calendar and a server-calibrated client clock; explicit historical dates remain authoritative. Journal timestamps display the current venue timezone, visibly labelled. Local midnight or an unshifted preview timezone change requires a new preview; UTC midnight alone does not.

The setting is available in the venue profile and creation forms, using the existing save flow. New venue setup suggests the device timezone visibly. Existing profiles without a configured timezone keep UTC and show a setup notice. Owners must explicitly choose the correct timezone after deployment. There is no universal Moldova default and no inference from a travelling user's device.

## Scope and safety

No migrations, production operations, historical recalculation, credential changes or Sales UX Step 2. All business-operation tests use isolated SQLite and real HTTP handlers. The previous schedule patch received narrow idempotence guards to preserve the timezone field through repeated artifact preparation.

## Validation

Targeted tests cover Chisinau summer/winter month boundaries, local versus UTC midnight, closed previous months, overnight shifts, New York/Los Angeles, daylight saving transitions, timezone validation, legacy UTC fallback, saved settings, immutable history, venue/account isolation and import defaults.

Browser QA at 390, 820 and 1280 uses a Los Angeles device timezone against a Chisinau venue, checks October 1 import defaults, saves New York through the real profile form, reloads the saved setting, posts a September 30 manual sale and verifies a 17:30 journal timestamp. All three widths pass without page errors. These are Chromium viewports, not physical iPhone/Safari certification.

Local validation: verified build PASS; typecheck PASS; lint PASS (two pre-existing warnings); 1,853 tests PASS (549 artifact/data-integrity tests, 1,298 unit tests, six editor posttests). Sales observations browser regression PASS on mobile/tablet/desktop, including auth versus network errors, overnight shifts, stock, journal and draft recovery. The Windows build resumed after a transient file-open error; the inventory HTTP fixture was updated to inject the real venue-time dependency and the entire unit suite reran successfully. GitHub CI verifies the final commit independently. Production deployment and post-deployment QA remain gated on approval.
