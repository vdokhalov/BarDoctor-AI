import { inviteWithJobTitle, inviteJobKey, MEMBER_JOB_PREFIX, INVITE_JOB_PREFIX } from "./staff-job-storage";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getD1, getDb } from "../../db";
import {
  auditLog,
  venueInvites,
  venueMemberships,
  venues,
  type Account,
} from "../../db/schema";
import {
  isAccessRole,
  serializePermissionOverrides,
  type AccessRole,
  type AuthenticatedAccount,
} from "./access-control";
import { staffJobTitle, validStaffJobTitle, type StaffJobTitle } from "./staff-job-title";

const INVITE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const INVITE_LIFETIME_HOURS = 72;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function normalizeInviteCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function inviteCodeHash(value: string): Promise<string> {
  const normalized = normalizeInviteCode(value);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`bardoctor-invite-v1:${normalized}`),
  );
  return bytesToHex(new Uint8Array(digest));
}

function randomInviteCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (byte) => INVITE_ALPHABET[byte % INVITE_ALPHABET.length]).join("");
  return `BD-${body.slice(0, 4)}-${body.slice(4)}`;
}

export async function findActiveInvite(code: string) {
  const normalized = normalizeInviteCode(code);
  if (normalized.length !== 10 || !normalized.startsWith("BD")) return null;
  const codeHash = await inviteCodeHash(normalized);
  const now = new Date().toISOString();
  const [invite] = await getDb()
    .select(inviteWithJobTitle)
    .from(venueInvites)
    .where(
      and(
        eq(venueInvites.codeHash, codeHash),
        isNull(venueInvites.usedAt),
        isNull(venueInvites.revokedAt),
        gt(venueInvites.expiresAt, now),
      ),
    )
    .limit(1);
  return invite && isAccessRole(invite.role) && invite.role !== "owner" && validStaffJobTitle(invite.role, invite.jobTitle)
    ? invite
    : null;
}

export async function createVenueInvite(input: {
  actor: AuthenticatedAccount;
  role: AccessRole;
  jobTitle?: StaffJobTitle | null;
  permissions?: unknown;
}) {
  if (!validStaffJobTitle(input.role, input.jobTitle)) throw new Error("STAFF_JOB_TITLE_INVALID");
  const expiresAt = new Date(
    Date.now() + INVITE_LIFETIME_HOURS * 60 * 60 * 1_000,
  ).toISOString();
  const permissionsJson = serializePermissionOverrides(input.role, input.permissions);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomInviteCode();
    const codeHash = await inviteCodeHash(code);
    try {
      const db = getD1();
      await db.batch([
        db.prepare(`INSERT INTO venue_invites(venue_id,code_hash,role,permissions_json,created_by_account_id,expires_at)
          VALUES (?,?,?,?,?,?)`).bind(input.actor.venueId,codeHash,input.role,permissionsJson,input.actor.actorAccountId,expiresAt),
        db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?)`)
          .bind(input.actor.actorAccountId,inviteJobKey(codeHash),JSON.stringify(staffJobTitle(input.role,input.jobTitle))),
      ]);
      const [invite] = await getDb().select(inviteWithJobTitle).from(venueInvites).where(eq(venueInvites.codeHash,codeHash)).limit(1);
      return { invite, code };
    } catch (error) {
      if (!(error instanceof Error) || !/unique/i.test(error.message)) throw error;
    }
  }
  throw new Error("INVITE_CODE_GENERATION_FAILED");
}

export async function claimVenueInvite(
  account: Account,
  code: string,
): Promise<{ venueId: number; role: AccessRole; jobTitle: StaffJobTitle | null } | null> {
  const invite = await findActiveInvite(code);
  if (!invite || !isAccessRole(invite.role) || invite.role === "owner") return null;
  const [venue] = await getDb()
    .select({ workspaceId: venues.workspaceId })
    .from(venues)
    .where(eq(venues.id, invite.venueId))
    .limit(1);
  if (!venue?.workspaceId) throw new Error("VENUE_WORKSPACE_MISSING");
  const [existingMembership] = await getDb()
    .select({ id: venueMemberships.id })
    .from(venueMemberships)
    .where(
      and(
        eq(venueMemberships.venueId, invite.venueId),
        eq(venueMemberships.accountId, account.id),
      ),
    )
    .limit(1);
  if (existingMembership) return null;
  const now = new Date().toISOString();
  const d1 = getD1();
  const [claim, membership] = await d1.batch([
    d1
      .prepare(
        `UPDATE venue_invites
         SET used_at = ?, used_by_account_id = ?
         WHERE id = ?
           AND used_at IS NULL
           AND revoked_at IS NULL
           AND expires_at > ?`,
      )
      .bind(now, account.id, invite.id, now),
    d1
      .prepare(
        `INSERT INTO venue_memberships (
           venue_id, account_id, role, permissions_json, status,
           invited_by_account_id, joined_at, created_at, updated_at
         )
         SELECT venue_id, ?, role, permissions_json, 'active',
                created_by_account_id, ?, ?, ?
         FROM venue_invites
         WHERE id = ? AND used_by_account_id = ? AND used_at = ?
         ON CONFLICT(venue_id, account_id) DO NOTHING`,
      )
      .bind(account.id, now, now, now, invite.id, account.id, now),
    d1.prepare(`INSERT INTO domain_data(account_id,store_key,data_json,updated_at)
      SELECT ?, ? || i.venue_id, j.data_json, ? FROM venue_invites i
      JOIN domain_data j ON j.account_id=i.created_by_account_id AND j.store_key=? || i.code_hash
      WHERE i.id=? AND i.used_by_account_id=? AND i.used_at=?
      ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at`)
      .bind(account.id,MEMBER_JOB_PREFIX,now,INVITE_JOB_PREFIX,invite.id,account.id,now),
    d1
      .prepare(
        `INSERT INTO workspace_memberships (
           workspace_id, account_id, role, status, joined_at, created_at, updated_at
         )
         SELECT ?, ?, 'member', 'active', ?, ?, ?
         FROM venue_invites
         WHERE id = ? AND used_by_account_id = ? AND used_at = ?
         ON CONFLICT(workspace_id, account_id) DO UPDATE SET
           status = 'active',
           updated_at = excluded.updated_at`,
      )
      .bind(
        venue.workspaceId,
        account.id,
        now,
        now,
        now,
        invite.id,
        account.id,
        now,
      ),
  ]);
  if ((claim.meta.changes ?? 0) !== 1 || (membership.meta.changes ?? 0) !== 1) {
    return null;
  }
  return { venueId: invite.venueId, role: invite.role, jobTitle: staffJobTitle(invite.role, invite.jobTitle) };
}

function actorName(actor: AuthenticatedAccount): string {
  return [actor.firstName, actor.lastName].filter(Boolean).join(" ") || actor.appEmail;
}

export async function logAccessChange(input: {
  actor: AuthenticatedAccount;
  action: "create" | "update" | "delete";
  entityId?: string | null;
  entityLabel: string;
  before?: unknown;
  after?: unknown;
  reason: string;
}) {
  await getDb().insert(auditLog).values({
    accountId: input.actor.id,
    storeKey: "access_control",
    action: input.action,
    entityId: input.entityId ?? null,
    entityLabel: input.entityLabel,
    monthKey: null,
    beforeJson: input.before == null ? null : JSON.stringify(input.before),
    afterJson: input.after == null ? null : JSON.stringify(input.after),
    changedFieldsJson: JSON.stringify(["role", "jobTitle", "permissions", "status"]),
    actorName: actorName(input.actor),
    actorRole: input.actor.role,
    reason: input.reason,
    createdAt: new Date().toISOString(),
  });
}

export async function revokeInvite(inviteId: number, venueId: number): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await getD1()
    .prepare(
      `UPDATE venue_invites
       SET revoked_at = ?
       WHERE id = ? AND venue_id = ? AND used_at IS NULL AND revoked_at IS NULL`,
    )
    .bind(now, inviteId, venueId)
    .run();
  return (result.meta.changes ?? 0) === 1;
}
