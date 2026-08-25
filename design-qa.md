# Profile v281 corrective design QA

## Evidence

- Reference: approved `1024 × 1536` composite mock supplied with the task (`81DB6ABA-6FAC-47A6-A855-B740484CA417.jpeg`).
- Implementation: local production-style Sites preview inspected in the cloud browser at `1363 × 936`; screenshots were captured for Profile, Personal data, Venue data and Currency states.
- States exercised: Profile top/middle/bottom, canonical venue trigger, personal editor top/focused field/bottom/save, venue editor top/details expanded/focused field/bottom/save, currency selected state, protected-route loading and unauthenticated guard.
- Data: a temporary browser-only QA fixture represented two venues and was removed after inspection; production code continues to use the server-authoritative bootstrap, user and venue APIs.

## Reference comparison

The corrective implementation keeps the approved information architecture and BarDoctor visual language: compact Profile summary, grouped Account/Venue/System cards, a visible active-venue control in the header, separate full-height editors, restrained borders, fixed logo/avatar geometry and one primary Save action per editor. It does not reintroduce competitor analytics, device reset, oversized pills or the legacy danger zone.

The implementation deliberately reuses the canonical venue-switch trigger and existing icon/tokens instead of cloning the mock's ornamental iOS chrome. Desktop content remains constrained to `680px`; mobile rules retain the approved single-column hierarchy and safe-area spacing.

## Geometry and interaction checks

- Profile measured `680px` wide inside a `1363px` desktop viewport with no document-level horizontal overflow.
- Personal, venue and currency routes opened at `scrollTop = 0`, with `document.activeElement = BODY`; no field receives autofocus and the keyboard is not summoned on entry.
- Editors expose one canonical vertical scroll container, hide the global bottom navigation and global scroll-to-top control, and keep the sticky Save control within the usable viewport.
- Personal and venue cards resolve to their own fullscreen routes. The currency row resolves only to the currency route; the venue editor is absent from that state.
- Focus checks kept top, middle and lower fields visible without moving the editor header. The long venue form reached its footer without clipping or nested-page scroll.
- Logo/avatar slots reserve explicit width, height and aspect ratio; fallback initials remain stable while images load or are absent.
- Browser console showed no application exceptions during the verified states. Extension metadata noise was excluded; no production debug fixture remains in source.

## Findings resolved during visual QA

- Replaced inherited Profile sheet state with route-owned fullscreen editors and deterministic scroll reset.
- Added stable skeleton geometry so async user, venue and membership data do not swap between unrelated layouts.
- Corrected invalid bare design-token colors to `hsl(var(--token))`, restoring field backgrounds and dividers.
- Separated the venue details toggle from saving/logo-removal state.
- Corrected the venue Save disabled/loading binding, which could otherwise leave the action permanently unavailable.
- Corrected desktop editor height to account for the canonical header and prevent a second scroll container.
- Wrapped all Profile child routes in the existing authenticated/venue route guard, preventing a permanent skeleton on unauthenticated deep links.
- Kept the Profile canonical venue host visible for single-venue accounts while preserving the existing multi-venue selection flow.

## Regression coverage

- Artifact tests cover the canonical venue host, isolated child routes, scroll reset, hidden global navigation, server-authoritative persistence, RBAC, logo fallback/persistence and removal of legacy Profile content.
- Runtime venue QA covers A → B → A switching, cross-venue isolation, currency-only persistence, non-currency field preservation and restoration.
- Browser evidence covers rendered hierarchy, responsive geometry, field focus, independent navigation semantics and horizontal-overflow checks.

## Result

No remaining P0, P1 or P2 visual regression was found in the implemented Profile flow.

final result: passed
