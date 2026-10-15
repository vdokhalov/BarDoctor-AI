CREATE TABLE staff_logins (
 membership_id INTEGER PRIMARY KEY REFERENCES venue_memberships(id) ON DELETE CASCADE,
 login TEXT NOT NULL UNIQUE CHECK(login=lower(login) AND length(login) BETWEEN 3 AND 32)
);
--> statement-breakpoint
CREATE TABLE staff_login_sessions (
 token_hash TEXT PRIMARY KEY,
 membership_id INTEGER NOT NULL REFERENCES venue_memberships(id) ON DELETE CASCADE,
 pin_revision INTEGER NOT NULL,
 expires_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER staff_login_member_revoke AFTER UPDATE OF status,role,permissions_json ON venue_memberships
WHEN (NEW.status <> 'active' AND OLD.status='active') OR NEW.role<>OLD.role OR NEW.permissions_json IS NOT OLD.permissions_json
BEGIN DELETE FROM staff_login_sessions WHERE membership_id=NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER staff_login_name_revoke AFTER UPDATE OF login ON staff_logins
WHEN NEW.login<>OLD.login
BEGIN DELETE FROM staff_login_sessions WHERE membership_id=NEW.membership_id; END;
--> statement-breakpoint
CREATE TRIGGER staff_login_workspace_member_revoke AFTER UPDATE OF status ON workspace_memberships
WHEN NEW.status<>'active' AND OLD.status='active'
BEGIN DELETE FROM staff_login_sessions WHERE membership_id IN
 (SELECT m.id FROM venue_memberships m JOIN venues v ON v.id=m.venue_id WHERE m.account_id=NEW.account_id AND v.workspace_id=NEW.workspace_id); END;
--> statement-breakpoint
CREATE TRIGGER staff_login_venue_revoke AFTER UPDATE OF status ON venues
WHEN NEW.status<>'active' AND OLD.status='active'
BEGIN DELETE FROM staff_login_sessions WHERE membership_id IN (SELECT id FROM venue_memberships WHERE venue_id=NEW.id); END;
--> statement-breakpoint
CREATE TRIGGER staff_login_workspace_revoke AFTER UPDATE OF status ON workspaces
WHEN NEW.status<>'active' AND OLD.status='active'
BEGIN DELETE FROM staff_login_sessions WHERE membership_id IN
 (SELECT m.id FROM venue_memberships m JOIN venues v ON v.id=m.venue_id WHERE v.workspace_id=NEW.id); END;
--> statement-breakpoint
CREATE INDEX staff_attempts_window_idx ON staff_pos_attempts(window_start);
