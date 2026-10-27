import { getD1 } from '../../db';
import { permissionsFor, type AccessRole } from './access-control';

/** Membership identity, never the venue's data account or an employee/job title. */
export async function calendarNotificationRecipients(venueId: number): Promise<number[]> {
  const rows = await getD1().prepare(`SELECT m.account_id, m.role, m.permissions_json
    FROM venue_memberships m JOIN venues v ON v.id=m.venue_id
    JOIN accounts a ON a.id=m.account_id
    JOIN workspace_memberships wm ON wm.workspace_id=v.workspace_id AND wm.account_id=m.account_id AND wm.status='active'
    JOIN workspaces w ON w.id=v.workspace_id AND w.status='active'
    JOIN notification_preferences p ON p.account_id=m.account_id
    WHERE m.venue_id=? AND m.status='active' AND v.status='active'
      AND m.role IN ('owner','manager','shift_manager')
      AND p.enabled=1 AND p.calendar_alerts=1
      AND EXISTS (SELECT 1 FROM notification_devices d WHERE d.account_id=m.account_id
        AND d.active=1 AND d.opted_in=1 AND d.permission='granted'
        AND d.subscription_id IS NOT NULL AND trim(d.subscription_id)<>'')`)
    .bind(venueId).all<{account_id:number;role:AccessRole;permissions_json:string|null}>();
  return [...new Set((rows.results ?? []).filter(row=>permissionsFor(row.role,row.permissions_json).includes('calendar.view')).map(row=>row.account_id))];
}
export function calendarNotificationSource(venueId:number,eventId:string):string {
  return `venue:${venueId}:${eventId}`;
}
