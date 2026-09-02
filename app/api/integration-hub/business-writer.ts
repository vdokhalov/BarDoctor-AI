import { and, eq } from "drizzle-orm";
import { POST as confirmPurchase } from "../purchases/confirm/route";
import { POST as updatePurchase } from "../purchases/update/route";
import { POST as confirmSale } from "../sales/confirm/route";
import { getDb } from "../../../db";
import {
  accounts,
  venueMemberships,
  venues,
  workspaceMemberships,
  workspaces,
  type Account,
} from "../../../db/schema";
import type { AuthenticatedAccount } from "../../../lib/bardoctor/access-control";
import {
  authenticateRequest,
  issueSession,
  revokeAuthenticatedSession,
} from "../../../lib/bardoctor/auth";
import type { CanonicalPurchaseDocument, CanonicalSale } from "../../../lib/bardoctor/integrations/contracts";
import {
  writeCanonicalDomainEntity,
  writeCanonicalSimpleListBatch,
} from "../../../lib/bardoctor/integrations/domain-writer";
import type {
  BusinessWriteResult,
  IntegrationBusinessWriter,
} from "../../../lib/bardoctor/integrations/sync-engine";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function authenticatedJsonRequest(original: Request, path: string, body: unknown): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  for (const name of ["cookie", "x-venue-id"]) {
    const value = original.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Request(new URL(path, original.url), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function result(response: Response): Promise<BusinessWriteResult> {
  let payload: JsonRecord = {};
  try {
    payload = record(await response.json());
  } catch {
    return { ok: false, code: "INVALID_BUSINESS_RESPONSE", error: "BarDoctor вернул некорректный ответ" };
  }
  const document = record(payload.document);
  return {
    ok: response.ok && payload.ok === true,
    internalId: typeof document.id === "string" ? document.id : undefined,
    duplicate: payload.duplicate === true,
    code: typeof payload.code === "string" ? payload.code : undefined,
    error: typeof payload.error === "string" ? payload.error : undefined,
  };
}

/** Bridges the hub to the same validated write path used by manual imports. */
export function integrationBusinessWriter(
  request: Request,
  account: AuthenticatedAccount,
): IntegrationBusinessWriter {
  return {
    async write(input) {
      if (input.entityType === "purchase_document") {
        const handler = input.isUpdate ? updatePurchase : confirmPurchase;
        return result(await handler(
          authenticatedJsonRequest(request, input.isUpdate ? "/api/purchases/update" : "/api/purchases/confirm", {
            document: input.data as CanonicalPurchaseDocument,
            updateReason: input.isUpdate
              ? `Накладная обновлена из ${input.envelope.externalSystem}`
              : undefined,
          }),
        ));
      }
      if (input.entityType === "sale") {
        return result(await confirmSale(
          authenticatedJsonRequest(request, "/api/sales/confirm", {
            document: input.data as CanonicalSale,
          }),
        ));
      }
      return writeCanonicalDomainEntity({ account, ...input });
    },
    async writeBatch(inputs) {
      return writeCanonicalSimpleListBatch(inputs.map((item) => ({ account, ...item })));
    },
  };
}

async function activeServiceIdentity(input: {
  dataAccountId: number;
  venueId: number;
}): Promise<Account | null> {
  const rows = await getDb()
    .select({ account: accounts, role: venueMemberships.role })
    .from(venueMemberships)
    .innerJoin(accounts, eq(accounts.id, venueMemberships.accountId))
    .innerJoin(venues, eq(venues.id, venueMemberships.venueId))
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
        eq(venues.id, input.venueId),
        eq(venues.dataAccountId, input.dataAccountId),
        eq(venues.status, "active"),
        eq(accounts.accountKind, "user"),
        eq(venueMemberships.status, "active"),
        eq(workspaceMemberships.status, "active"),
        eq(workspaces.status, "active"),
      ),
    );
  const priority = new Map([
    ["owner", 0],
    ["manager", 1],
    ["shift_manager", 2],
  ]);
  rows.sort((left, right) =>
    (priority.get(left.role) ?? 99) - (priority.get(right.role) ?? 99)
    || left.account.id - right.account.id
  );
  return rows[0]?.account ?? null;
}

/** Creates a short-lived server session so API/local ingress reuses manual business routes. */
export async function serviceIntegrationBusinessWriter(input: {
  account: Account;
  venueId: number;
  requestUrl: string;
}): Promise<{
  writer: IntegrationBusinessWriter;
  account: AuthenticatedAccount;
  close: () => Promise<void>;
}> {
  // `input.account` is the isolated data namespace. For secondary venues it is
  // deliberately an unloginable `venue_data` account, so use an active human
  // membership for authentication while keeping the requested data account as
  // the tenant boundary checked above and again by authenticateRequest().
  const identity = await activeServiceIdentity({
    dataAccountId: input.account.id,
    venueId: input.venueId,
  });
  if (!identity) throw new Error("INTEGRATION_SERVICE_IDENTITY_UNAVAILABLE");
  const token = await issueSession(identity);
  const request = new Request(input.requestUrl, {
    headers: {
      cookie: `bd_server_session=${encodeURIComponent(token)}`,
      "x-venue-id": String(input.venueId),
    },
  });
  const authenticated = await authenticateRequest(request);
  if (!authenticated) {
    await revokeAuthenticatedSession(request, identity.id);
    throw new Error("INTEGRATION_SERVICE_AUTH_FAILED");
  }
  return {
    writer: integrationBusinessWriter(request, authenticated),
    account: authenticated,
    close: () => revokeAuthenticatedSession(request, identity.id),
  };
}
