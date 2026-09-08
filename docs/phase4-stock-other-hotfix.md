# Phase 4: linked stock classified as `other`

## Evidence and scope

Production v420 / GitHub `7dc906e6c8b18fef9e4caffc20ffd9994fcd9ea3`.
The user supplied read-only screenshots of the existing Sprite nomenclature:
`stock:спрайт 0 5л|pcs`, `kind: stock`, `category: other`, `unit: pcs`,
`packageSize: 1 шт.`. The fixture contains only disclosed nomenclature fields;
test receipt quantities/prices are isolated acceptance inputs, not production data.
The earlier `readyProduct` object was a sale-side link, not a replacement for this
nomenclature contract. No menu object is promoted into a second stock identity.

The purchase selector passed `category: other` through to the editor. The editor
hid conversion controls because it inferred inventory kind from expense category.
The old CI backend returned synthetic `products`/`alcohol` search results instead
of projecting persisted nomenclature through the real selector.

An isolated execution of unchanged server functions also reproduced accepted
conversion with no snapshot, zero movements, no unresolved error, and returned
nomenclature `kind: service`. This demonstrated risk, not proof of a production
write. Work paused under the user's stop condition and resumed with permission.

## Correction

- Separate selector `purchaseCategory` from original nomenclature `category`.
- Shared stock purchase category projection used by selector, client selection,
  and server preparation. Explicit persisted `kind: stock` governs conversion.
- Server resolves scoped IDs itself, ignoring request-supplied kind, and validates
  stock basis/dimensions. Missing/cross-venue/conflicting references fail closed.
- Posting independently rejects a stock/service mismatch before changing anything.
- Existing nomenclature kind/classification is preserved during a valid receipt.
- Existing confirmed conversion snapshots remain self-contained and immutable.
  A legacy non-stock posting linked to stock requires review on replay, not an
  automatic rewrite. No migration, cleanup, or production data write is included.

## Regression coverage

- SQLite persist/reload → actual authenticated selector GET contract → actual
  client selection → 2 × 12 pcs conversion → persisted receipt/movement/cost.
- Legacy `other` in a stale request still posts exactly 24 pcs at 15/pcs.
- Invalid dimensions, unknown basis, foreign venue and fake stock kind fail closed.
- Historical malformed posting is rejected with unchanged input and assortment.
- Browser QA uses the real selector on SQLite-persisted input; both 390×844 and
  1280×720 select Sprite, show units/packages, convert, and discard without saving.
  Existing liquid persistence/reload, stable header, overflow and modal-lock
  assertions remain in place.

## Release gate

Local focused checks: 56/56 passed (including actual GET, SQLite persistence,
inventory, conversion history and venue isolation). The broader local unit run
passed 802 tests; eight test files could not load missing local `drizzle-orm`,
`xlsx` or checkout-local `esbuild` dependencies. These are not recorded as PASS;
the locked-dependency Linux CI must execute them and all browser checks.

Full Linux GitHub CI (including build/versioned artifact, typecheck, lint, all
regressions and mobile/desktop browser QA) is required. Local Windows checks use
available deterministic tooling; missing local project dependencies are not a
reason to relax assertions or restart the Miniflare loop. No production deployment
or rollback is authorized by this source change; deployment needs user approval.
