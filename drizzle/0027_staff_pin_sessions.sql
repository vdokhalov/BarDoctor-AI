CREATE TABLE staff_pos_devices (
 id TEXT PRIMARY KEY,
 token_hash TEXT NOT NULL UNIQUE,
 venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
 authorized_by INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 expires_at TEXT NOT NULL,
 revoked_at TEXT
);
--> statement-breakpoint
CREATE TABLE staff_pos_sessions (
 token_hash TEXT PRIMARY KEY,
 device_id TEXT NOT NULL REFERENCES staff_pos_devices(id) ON DELETE CASCADE,
 membership_id INTEGER NOT NULL REFERENCES venue_memberships(id) ON DELETE CASCADE,
 pin_revision INTEGER NOT NULL,
 expires_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE staff_pos_attempts (
 scope TEXT PRIMARY KEY,
 window_start INTEGER NOT NULL,
 attempts INTEGER NOT NULL
);
