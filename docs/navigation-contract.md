# BarDoctor Navigation Contract

Version: `navigation-contract-v247` (22 August 2026)

The executable source of truth is `public/navigation-contract-v247.js`. A new user-facing non-root screen is not complete until it has a registered type, canonical parent, direct-open fallback, shell/header mode, bottom-navigation rule, and mobile/desktop behavior.

## Screen types and actions

- **Root**: primary product destination. No Back control; global navigation remains available.
- **List/module/report/settings/document**: Back appears when the screen is not a root and returns to its parent or a valid origin.
- **Detail/sub-detail**: Back returns to a valid same-venue origin and preserves its URL state; otherwise it uses the canonical parent.
- **Create/edit/wizard**: Back and Cancel return to the origin. Dirty, non-autosaved input asks `Изменения не сохранены. Выйти без сохранения?`. Navigation never confirms, posts, or deletes a draft.
- **Modal/sheet**: Close (`×`) removes only the transient layer. Escape and browser Back close the top layer; scroll is locked and focus returns to its trigger. Close is not a replacement for hierarchical Back.
- **Fullscreen workflow**: owns one header, one scroll container, and an explicit exit. The parent shell and bottom navigation are hidden and cannot receive pointer events.
- **Print/PDF**: owns a sticky screen-only toolbar with Back/Close and print/download actions. Direct-open, missing, cancelled, denied, and expired-session states retain a safe exit.

## Origin and fallback

`bdNavigate` records the current URL and active venue. `bdNavigateBack(fallback)` may use that origin only when it is a registered internal BarDoctor destination, belongs to the current venue, and is not an auth, redirect, compatibility, API, external, or stale entry. Otherwise it replaces the current screen with the route contract’s canonical parent.

List context belongs in the URL when already supported: tab, query, filters, sort, category, pagination, date/month, venue and entity-specific state. Scroll restoration is keyed by URL and venue. Local tabs that are not route-backed remain local UI state.

Changing venue invalidates the stored origin. Permission loss, deleted entities and inaccessible venues must render an error with an exit or resolve to an allowed canonical parent.

## Shell, headers and stacking

Exactly one primary header is interactive at a time. `bd-app-header` is the canonical application header. An owned fullscreen workflow suppresses the shell header, venue switcher and bottom navigation.

Layer tokens are defined in `app-shell-v185.css`: page `0`, sticky page header `100`, global navigation `200`, floating action `300`, backdrop `800`, overlay `900`, overlay header `910`, toast `1200`, critical feedback `1300`. Avoid arbitrary high z-index values. A modal/fullscreen surface must own scrolling; background scroll bleed is prohibited.

Mobile uses a predictable 44×44 px minimum Back/Close target, safe-area insets, and a compact title. Desktop may add breadcrumbs only when depth makes orientation materially clearer. Global navigation changes product area; Back moves within the current workflow.

## Bottom navigation

The stable roots are Home, Shifts, Finance, Team and More. Detail pages may keep it when it does not interfere. Fullscreen, setup, import and venue-creation workflows hide it and must provide their own exit. Selecting the current tab does not create an extra history entry.

## Review checklist for every new screen

1. Register route/query state and screen type.
2. Define canonical parent and safe direct-open fallback.
3. Choose Back or Close according to layer semantics.
4. Define header owner, bottom-nav visibility and scroll owner.
5. Preserve relevant URL/list context and active venue.
6. Add dirty-state protection when input is not autosaved.
7. Test direct open, refresh, browser/system Back, mobile, desktop, denied/not-found state and rapid open/close.
8. Run `npm run audit:navigation` and the regression suite.

Intentional exceptions are limited to authentication/security screens whose restricted exit is part of the security model; each exception remains explicitly registered.
