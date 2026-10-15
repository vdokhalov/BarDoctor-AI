-- Explicit migration only. Never run schema mutation in authentication requests.
CREATE TABLE staff_pin_credentials (
  membership_id INTEGER PRIMARY KEY REFERENCES venue_memberships(id) ON DELETE CASCADE,
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  lookup_tag TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision > 0),
  revoked_at TEXT,
  updated_by_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  updated_at TEXT NOT NULL,
  UNIQUE(venue_id, lookup_tag)
);
--> statement-breakpoint
CREATE TABLE staff_pin_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  membership_id INTEGER NOT NULL REFERENCES venue_memberships(id) ON DELETE CASCADE,
  actor_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK(action IN ('issue_or_reset','revoke')),
  revision INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
