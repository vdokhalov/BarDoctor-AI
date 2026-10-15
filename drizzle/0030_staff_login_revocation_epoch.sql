-- Advance the credential epoch as well as deleting sessions. This rejects login
-- requests that read a credential before a revoke/restore transition.
CREATE TRIGGER staff_login_name_epoch AFTER UPDATE OF login ON staff_logins
WHEN NEW.login<>OLD.login
BEGIN UPDATE staff_pin_credentials SET revision=revision+1 WHERE membership_id=NEW.membership_id; END;
--> statement-breakpoint
CREATE TRIGGER staff_login_workspace_member_epoch AFTER UPDATE OF status ON workspace_memberships
WHEN NEW.status<>'active' AND OLD.status='active'
BEGIN UPDATE staff_pin_credentials SET revision=revision+1 WHERE membership_id IN
 (SELECT m.id FROM venue_memberships m JOIN venues v ON v.id=m.venue_id WHERE m.account_id=NEW.account_id AND v.workspace_id=NEW.workspace_id); END;
--> statement-breakpoint
CREATE TRIGGER staff_login_venue_epoch AFTER UPDATE OF status ON venues
WHEN NEW.status<>'active' AND OLD.status='active'
BEGIN UPDATE staff_pin_credentials SET revision=revision+1 WHERE membership_id IN (SELECT id FROM venue_memberships WHERE venue_id=NEW.id); END;
--> statement-breakpoint
CREATE TRIGGER staff_login_workspace_epoch AFTER UPDATE OF status ON workspaces
WHEN NEW.status<>'active' AND OLD.status='active'
BEGIN UPDATE staff_pin_credentials SET revision=revision+1 WHERE membership_id IN
 (SELECT m.id FROM venue_memberships m JOIN venues v ON v.id=m.venue_id WHERE v.workspace_id=NEW.id); END;
