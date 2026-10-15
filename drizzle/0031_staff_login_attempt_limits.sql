-- Account-bound admission: never authorize guesses based on client IP headers.
CREATE TABLE staff_login_limits (
 scope TEXT PRIMARY KEY,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0),
 window_start INTEGER NOT NULL,
 window_attempts INTEGER NOT NULL DEFAULT 0 CHECK(window_attempts>=0)
);
--> statement-breakpoint
CREATE TABLE staff_login_leases (
 id TEXT PRIMARY KEY,
 login_scope TEXT NOT NULL,
 credential_scope TEXT,
 expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX staff_login_leases_login_idx ON staff_login_leases(login_scope,expires_at);
--> statement-breakpoint
CREATE INDEX staff_login_leases_credential_idx ON staff_login_leases(credential_scope,expires_at);
--> statement-breakpoint
-- A new credential (or new employee) must not inherit anonymous pre-lockout.
CREATE TRIGGER staff_login_new_name_limits AFTER INSERT ON staff_logins
BEGIN
 DELETE FROM staff_login_limits WHERE scope='login:'||NEW.login;
 DELETE FROM staff_login_leases WHERE login_scope='login:'||NEW.login;
END;
--> statement-breakpoint
CREATE TRIGGER staff_login_changed_name_limits AFTER UPDATE OF login ON staff_logins
WHEN NEW.login<>OLD.login
BEGIN
 DELETE FROM staff_login_limits WHERE scope='login:'||NEW.login;
 DELETE FROM staff_login_leases WHERE login_scope='login:'||OLD.login OR login_scope='login:'||NEW.login;
END;
--> statement-breakpoint
-- Only actual credential replacement clears lockout; revision-only revocation
-- or rename must NEVER replenish the lifetime budget of the same PIN.
CREATE TRIGGER staff_login_reset_limits AFTER UPDATE OF password_hash ON staff_pin_credentials
WHEN NEW.password_hash<>OLD.password_hash
BEGIN
 DELETE FROM staff_login_limits WHERE scope IN
 (SELECT 'login:'||login FROM staff_logins WHERE membership_id=NEW.membership_id);
 DELETE FROM staff_login_limits WHERE scope LIKE 'credential:'||NEW.membership_id||':%';
 DELETE FROM staff_login_leases WHERE login_scope IN
 (SELECT 'login:'||login FROM staff_logins WHERE membership_id=NEW.membership_id);
END;
--> statement-breakpoint
CREATE TRIGGER staff_login_first_pin_limits AFTER INSERT ON staff_pin_credentials
BEGIN
 DELETE FROM staff_login_limits WHERE scope IN
 (SELECT 'login:'||login FROM staff_logins WHERE membership_id=NEW.membership_id);
 DELETE FROM staff_login_leases WHERE login_scope IN
 (SELECT 'login:'||login FROM staff_logins WHERE membership_id=NEW.membership_id);
END;
--> statement-breakpoint
CREATE INDEX staff_login_leases_expiry_idx ON staff_login_leases(expires_at);
