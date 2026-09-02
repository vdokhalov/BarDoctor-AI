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
  // 16 symbols from a 32-character alphabet provide 80 bits of entropy.
  // Legacy 8-symbol invitations remain accepted until their 72-hour expiry.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (byte) => INVITE_ALPHABET[byte % INVITE_ALPHABET.length]).join("");
  return `BD-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}-${body.slice(12)}`;
}

export async function findActiveInvite(code: string) {
  const normalized = normalizeInviteCode(code);
  if (![10, 18].includes(normalized.length) || !normalized.startsWith("BD")) return null;
  const codeHash = await inviteCodeHash(normalized);
  const now = new Date().toISOString();
  const [invite] = await getDb()
    .select()
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
  return invite && isAccessRole(invite.role) && invite.role !== "owner"
    ? invite
    : null;
}

export async function createVenueInvite(input: {
  actor: AuthenticatedAccount;
  role: AccessRole;
  permissions?: unknown;
}) {
  const expiresAt = new Date(
    Date.now() + INVITE_LIFETIME_HOURS * 60 * 60 * 1_000,
  ).toISOString();
  const permissionsJson = serializePermissionOverrides(input.role, input.permissions);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomInviteCode();
    const codeHash = await inviteCodeHash(code);
    try {
      const [invite] = await getDb()
        .insert(venueInvites)
        .values({
          venueId: input.actor.venueId,
          codeHash,
          role: input.role,
          permissionsJson,
          createdByAccountId: input.actor.actorAccountId,
          expiresAt,
        })
        .returning();
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
): Promise<{ venueId: number; role: AccessRole } | null> {
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
  return { venueId: invite.venueId, role: invite.role };
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
    changedFieldsJson: JSON.stringify(["role", "permissions", "status"]),
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
