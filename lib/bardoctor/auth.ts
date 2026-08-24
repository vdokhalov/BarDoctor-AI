import { and, desc, eq, gt, inArray, ne } from "drizzle-orm";
import { getD1, getDb } from "../../db";
import {
  accounts,
  domainData,
  sessions,
  venueMemberships,
  venues,
  workspaceMemberships,
  workspaces,
  type Account,
} from "../../db/schema";
import { normalizeAccountEmail } from "./account-identity";
import {
  isAccessRole,
  permissionPayload,
  type AccessRole,
  type AuthenticatedAccount,
} from "./access-control";
import { selectVenueMembership } from "./venue-selection";
import { authoritativeVenueStoreRows } from "./authoritative-persistence";

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const SERVER_SESSION_COOKIE = "bd_server_session";

export type { AuthenticatedAccount } from "./access-control";

export function normalizeEmail(value: string): string {
  return normalizeAccountEmail(value);
}

let authSchemaReady: Promise<void> | null = null;

async function initializeAuthSchema(): Promise<void> {
  const d1 = getD1();
  const columns = await d1
    .prepare("PRAGMA table_info(accounts)")
    .all<{ name: string }>();
  const existing = new Set(columns.results.map((column) => column.name));
  const statements: D1PreparedStatement[] = [];

  if (!existing.has("password_hash")) {
    statements.push(d1.prepare("ALTER TABLE accounts ADD COLUMN password_hash text"));
  }
  if (!existing.has("password_salt")) {
    statements.push(d1.prepare("ALTER TABLE accounts ADD COLUMN password_salt text"));
  }
  if (!existing.has("password_iterations")) {
    statements.push(d1.prepare("ALTER TABLE accounts ADD COLUMN password_iterations integer"));
  }
  if (!existing.has("owns_venue")) {
    statements.push(d1.prepare("ALTER TABLE accounts ADD COLUMN owns_venue integer DEFAULT 1 NOT NULL"));
  }
  if (!existing.has("account_kind")) {
    statements.push(d1.prepare("ALTER TABLE accounts ADD COLUMN account_kind text DEFAULT 'user' NOT NULL"));
  }
  statements.push(d1.prepare("DROP INDEX IF EXISTS accounts_chatgpt_email_uq"));

  await d1.batch(statements);
}

export async function ensureAuthSchema(): Promise<void> {
  if (!authSchemaReady) {
    authSchemaReady = initializeAuthSchema().catch((error) => {
      authSchemaReady = null;
      throw error;
    });
  }
  await authSchemaReady;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function getChatGPTEmail(request: Request): string | null {
  const value = request.headers.get("oai-authenticated-user-email");
  return value?.trim() ? normalizeEmail(value) : null;
}

export async function findAccountByAppEmail(email: string): Promise<Account | null> {
  await ensureAuthSchema();
  const [account] = await getDb()
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.appEmail, normalizeEmail(email)),
        eq(accounts.accountKind, "user"),
      ),
    )
    .limit(1);
  return account ?? null;
}

export async function issueSession(account: Account): Promise<string> {
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS).toISOString();
  await getDb().insert(sessions).values({ tokenHash, accountId: account.id, expiresAt });
  return token;
}

function cookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }
  return null;
}

function sessionCredentials(request: Request): { email: string | null; token: string } | null {
  const headerEmail = request.headers.get("x-session-email");
  const headerToken = request.headers.get("x-session-token");
  // A partial header pair is invalid and must never fall back to the cookie.
  if (headerEmail || headerToken) {
    if (!headerEmail?.trim() || !headerToken) return null;
    return { email: headerEmail, token: headerToken };
  }
  const cookieToken = cookieValue(request, SERVER_SESSION_COOKIE);
  return cookieToken ? { email: null, token: cookieToken } : null;
}

function sessionCookie(token: string, request: Request, maxAge = SESSION_LIFETIME_MS / 1_000): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SERVER_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(maxAge)}${secure}`;
}

export function sessionResponse(
  body: unknown,
  token: string,
  request: Request,
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Set-Cookie": sessionCookie(token, request),
    },
  });
}

export function clearSessionCookie(request: Request): string {
  return sessionCookie("", request, 0);
}

export async function synchronizeServerSession(
  request: Request,
): Promise<{ account: Account; token: string } | null> {
  const email = request.headers.get("x-session-email");
  const token = request.headers.get("x-session-token");
  if (!email?.trim() || !token) return null;
  const account = await authenticateIdentityRequest(request);
  return account ? { account, token } : null;
}

async function sessionForRequest(request: Request): Promise<{
  account: Account;
  activeVenueId: number | null;
} | null> {
  const credentials = sessionCredentials(request);
  if (!credentials) return null;
  const { email, token } = credentials;

  await ensureAuthSchema();
  const tokenHash = await sha256Hex(token);
  const now = new Date().toISOString();
  const [row] = await getDb()
    .select({ account: accounts, activeVenueId: sessions.activeVenueId })
    .from(sessions)
    .innerJoin(accounts, eq(sessions.accountId, accounts.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        email ? eq(accounts.appEmail, normalizeEmail(email)) : undefined,
        eq(accounts.accountKind, "user"),
        gt(sessions.expiresAt, now),
      ),
    )
    .limit(1);

  return row ?? null;
}

async function rememberActiveVenueForToken(
  token: string,
  accountId: number,
  venueId: number,
): Promise<void> {
  const tokenHash = await sha256Hex(token);
  await getDb()
    .update(sessions)
    .set({ activeVenueId: venueId })
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        eq(sessions.accountId, accountId),
      ),
    );
}

export async function rememberActiveVenueForRequest(
  request: Request,
  accountId: number,
  venueId: number,
): Promise<void> {
  const credentials = sessionCredentials(request);
  if (!credentials) return;
  await rememberActiveVenueForToken(credentials.token, accountId, venueId);
}

export async function revokeAuthenticatedSession(
  request: Request,
  accountId: number,
): Promise<void> {
  const credentials = sessionCredentials(request);
  if (!credentials) return;
  const tokenHash = await sha256Hex(credentials.token);
  await getDb()
    .delete(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), eq(sessions.accountId, accountId)));
}

export async function activeSessionsForAccount(
  request: Request,
  accountId: number,
): Promise<Array<{ createdAt: string; expiresAt: string; current: boolean }> | null> {
  const credentials = sessionCredentials(request);
  if (!credentials) return null;
  const currentTokenHash = await sha256Hex(credentials.token);
  const rows = await getDb()
    .select({
      tokenHash: sessions.tokenHash,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.accountId, accountId),
        gt(sessions.expiresAt, new Date().toISOString()),
      ),
    )
    .orderBy(desc(sessions.createdAt));
  return rows.map((row) => ({
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    current: row.tokenHash === currentTokenHash,
  }));
}

export async function revokeOtherAuthenticatedSessions(
  request: Request,
  accountId: number,
): Promise<boolean> {
  const credentials = sessionCredentials(request);
  if (!credentials) return false;
  const currentTokenHash = await sha256Hex(credentials.token);
  await getDb()
    .delete(sessions)
    .where(
      and(
        eq(sessions.accountId, accountId),
        ne(sessions.tokenHash, currentTokenHash),
      ),
    );
  return true;
}

export async function authenticateIdentityRequest(request: Request): Promise<Account | null> {
  return (await sessionForRequest(request))?.account ?? null;
}

function venueName(account: Account): string {
  if (!account.restaurantJson) return "Новое заведение";
  try {
    const value = JSON.parse(account.restaurantJson) as { name?: unknown };
    return typeof value.name === "string" && value.name.trim()
      ? value.name.trim()
      : "Новое заведение";
  } catch {
    return "Новое заведение";
  }
}

export async function ensureOwnerVenue(account: Account): Promise<void> {
  if (!account.ownsVenue) return;
  const db = getDb();
  const now = new Date().toISOString();
  let [venue] = await db
    .select()
    .from(venues)
    .where(eq(venues.dataAccountId, account.id))
    .limit(1);
  let workspaceId = venue?.workspaceId ?? null;
  let createdVenue = false;
  if (!workspaceId) {
    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: venueName(account),
        status: "active",
        createdByAccountId: account.id,
        updatedAt: now,
      })
      .returning();
    workspaceId = workspace.id;
  }
  if (!venue) {
    [venue] = await db
      .insert(venues)
      .values({
        workspaceId,
        dataAccountId: account.id,
        status: "active",
        createdByAccountId: account.id,
        updatedAt: now,
      })
      .returning();
    createdVenue = true;
  } else if (venue.workspaceId !== workspaceId || !venue.createdByAccountId) {
    await db
      .update(venues)
      .set({ workspaceId, createdByAccountId: venue.createdByAccountId ?? account.id, updatedAt: now })
      .where(eq(venues.id, venue.id));
    venue = { ...venue, workspaceId, createdByAccountId: venue.createdByAccountId ?? account.id };
  }
  if (!venue) throw new Error("VENUE_INITIALIZATION_FAILED");
  if (createdVenue) {
    await db
      .insert(domainData)
      .values(authoritativeVenueStoreRows({
        dataAccountId: account.id,
        venueId: venue.id,
        updatedAt: now,
      }))
      .onConflictDoNothing({ target: [domainData.accountId, domainData.storeKey] });
  }
  await db
    .insert(workspaceMemberships)
    .values({
      workspaceId,
      accountId: account.id,
      role: "owner",
      status: "active",
      joinedAt: account.createdAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [workspaceMemberships.workspaceId, workspaceMemberships.accountId],
      set: { role: "owner", status: "active", updatedAt: now },
    });
  await db
    .insert(venueMemberships)
    .values({
      venueId: venue.id,
      accountId: account.id,
      role: "owner",
      status: "active",
      joinedAt: account.createdAt,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: [venueMemberships.venueId, venueMemberships.accountId],
    });
}

export async function membershipsForAccount(account: Account) {
  await ensureOwnerVenue(account);
  const rows = await getDb()
    .select({
      membership: venueMemberships,
      venue: venues,
    })
    .from(venueMemberships)
    .innerJoin(venues, eq(venueMemberships.venueId, venues.id))
    .innerJoin(
      workspaceMemberships,
      and(
        eq(workspaceMemberships.workspaceId, venues.workspaceId),
        eq(workspaceMemberships.accountId, venueMemberships.accountId),
      ),
    )
    .innerJoin(workspaces, eq(workspaces.id, workspaceMemberships.workspaceId))
    .where(
      and(
        eq(venueMemberships.accountId, account.id),
        eq(venueMemberships.status, "active"),
        eq(venues.status, "active"),
        eq(workspaceMemberships.status, "active"),
        eq(workspaces.status, "active"),
      ),
    );
  const dataAccountIds = [...new Set(rows.map((row) => row.venue.dataAccountId))];
  const dataAccounts = dataAccountIds.length
    ? await getDb().select().from(accounts).where(inArray(accounts.id, dataAccountIds))
    : [];
  const accountById = new Map(dataAccounts.map((item) => [item.id, item]));
  return rows
    .map((row) => {
      const dataAccount = accountById.get(row.venue.dataAccountId);
      if (!dataAccount || !isAccessRole(row.membership.role)) return null;
      return {
        membership: row.membership,
        venue: row.venue,
        dataAccount,
        ...permissionPayload(row.membership.role, row.membership.permissionsJson),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((left, right) =>
      Number(right.role === "owner") - Number(left.role === "owner")
      || left.membership.joinedAt.localeCompare(right.membership.joinedAt),
    );
}

export async function venueContextForAccount(
  account: Account,
  requestedVenueId?: number | null,
) {
  const memberships = await membershipsForAccount(account);
  // A venue explicitly selected by the client is part of the authorization
  // boundary. Never silently fall back to another membership: doing so can
  // write a valid payload into the wrong venue after access was revoked or a
  // stale tab kept an old x-venue-id header.
  return selectVenueMembership(memberships, requestedVenueId, account.id);
}

export async function authenticateRequest(
  request: Request,
): Promise<AuthenticatedAccount | null> {
  const identitySession = await sessionForRequest(request);
  if (!identitySession) return null;
  const requestedHeader = request.headers.get("x-venue-id");
  const requestedValue = Number(requestedHeader);
  if (
    requestedHeader != null
    && (!Number.isInteger(requestedValue) || requestedValue <= 0)
  ) {
    return null;
  }
  const requestedVenueId = Number.isInteger(requestedValue) && requestedValue > 0
    ? requestedValue
    : requestedHeader == null
      ? identitySession.activeVenueId
      : null;
  const context = await venueContextForAccount(identitySession.account, requestedVenueId);
  if (!context) return null;
  const role = context.role as AccessRole;
  return {
    ...context.dataAccount,
    chatgptEmail: identitySession.account.chatgptEmail,
    appEmail: identitySession.account.appEmail,
    firstName: identitySession.account.firstName,
    lastName: identitySession.account.lastName,
    phone: identitySession.account.phone,
    role,
    actorAccountId: identitySession.account.id,
    venueId: context.venue.id,
    membershipId: context.membership.id,
    permissions: context.permissions,
  };
}

export async function authResult(account: Account, token: string, request?: Request) {
  const requestedHeader = request?.headers.get("x-venue-id");
  const requestedValue = Number(requestedHeader);
  const rememberedVenueId = request
    ? (await sessionForRequest(new Request(request.url, {
      headers: {
        "x-session-email": account.appEmail,
        "x-session-token": token,
      },
    })))?.activeVenueId ?? null
    : null;
  const requestedVenueId = Number.isInteger(requestedValue) && requestedValue > 0
    ? requestedValue
    : requestedHeader == null
      ? rememberedVenueId
      : null;
  const memberships = await membershipsForAccount(account);
  // Bootstrap is allowed to heal a stale venue selection because it does not
  // read or mutate venue data. Every data endpoint remains strict through
  // authenticateRequest(), while the client receives a valid active venue for
  // its next request instead of staying stuck on a revoked membership.
  const active = selectVenueMembership(
    memberships,
    requestedVenueId,
    account.id,
    true,
  );
  const activeRole = active?.role ?? "shift_manager";
  if (active) await rememberActiveVenueForToken(token, account.id, active.venue.id);
  return {
    ok: true as const,
    email: account.appEmail,
    userId: account.id,
    token,
    firstName: account.firstName,
    lastName: account.lastName,
    phone: account.phone,
    role: activeRole,
    permissions: active?.permissions ?? [],
    activeVenueId: active?.venue.id ?? null,
    activeWorkspaceId: active?.venue.workspaceId ?? null,
    activeVenueIsPrimary: Boolean(active && active.venue.dataAccountId === account.id),
    canCreateVenues: Boolean(active && activeRole === "owner"),
    venues: memberships.map((item) => ({
      id: item.venue.id,
      workspaceId: item.venue.workspaceId,
      name: venueName(item.dataAccount),
      hasProfile: Boolean(item.dataAccount.restaurantJson),
      role: item.role,
      permissions: item.permissions,
      status: item.venue.status,
      isPrimary: item.venue.dataAccountId === account.id,
    })),
  };
}

export function unauthorized(message = "Необходима авторизация"): Response {
  return Response.json({ ok: false, error: message }, { status: 401 });
}
