ALTER TABLE staff_pos_devices ADD COLUMN login_generation INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
-- Revocation is monotonic, including administrative updates outside the HTTP UI.
CREATE TRIGGER staff_pin_membership_revoke AFTER UPDATE OF status,role,permissions_json ON venue_memberships
WHEN (NEW.status <> 'active' AND OLD.status = 'active') OR NEW.role <> OLD.role OR NEW.permissions_json IS NOT OLD.permissions_json
BEGIN
 UPDATE staff_pin_credentials SET revision=revision+1,revoked_at=CURRENT_TIMESTAMP WHERE membership_id=NEW.id;
 DELETE FROM staff_pos_sessions WHERE membership_id=NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER staff_pin_workspace_member_revoke AFTER UPDATE OF status ON workspace_memberships
WHEN NEW.status <> 'active' AND OLD.status = 'active'
BEGIN
 DELETE FROM staff_pos_sessions WHERE membership_id IN
 (SELECT m.id FROM venue_memberships m JOIN venues v ON v.id=m.venue_id WHERE m.account_id=NEW.account_id AND v.workspace_id=NEW.workspace_id);
END;
--> statement-breakpoint
CREATE TRIGGER staff_pin_venue_revoke AFTER UPDATE OF status ON venues
WHEN NEW.status <> 'active' AND OLD.status = 'active'
BEGIN
 UPDATE staff_pos_devices SET revoked_at=CURRENT_TIMESTAMP WHERE venue_id=NEW.id;
 DELETE FROM staff_pos_sessions WHERE membership_id IN (SELECT id FROM venue_memberships WHERE venue_id=NEW.id);
END;
--> statement-breakpoint
CREATE TRIGGER staff_pin_workspace_revoke AFTER UPDATE OF status ON workspaces
WHEN NEW.status <> 'active' AND OLD.status = 'active'
BEGIN
 UPDATE staff_pos_devices SET revoked_at=CURRENT_TIMESTAMP WHERE venue_id IN (SELECT id FROM venues WHERE workspace_id=NEW.id);
 DELETE FROM staff_pos_sessions WHERE membership_id IN
 (SELECT m.id FROM venue_memberships m JOIN venues v ON v.id=m.venue_id WHERE v.workspace_id=NEW.id);
END;
