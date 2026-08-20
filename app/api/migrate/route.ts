import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { domainData } from "../../../db/schema";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { ALLOWED_STORE_KEYS } from "../../../lib/bardoctor/constants";
import { readJsonRequest } from "../../../lib/bardoctor/http";

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (account.role !== "owner") {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Перенос данных запускает только владелец" },
      { status: 403 },
    );
  }
  const parsed = await readJsonRequest<{ entries?: Record<string, unknown> }>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const entries = body.entries ?? {};
  const imported: string[] = [];
  const skipped: string[] = [];

  for (const key of ALLOWED_STORE_KEYS) {
    if (!(key in entries)) continue;
    const [existing] = await getDb()
      .select({ id: domainData.id })
      .from(domainData)
      .where(and(eq(domainData.accountId, account.id), eq(domainData.storeKey, key)))
      .limit(1);
    if (existing) {
      skipped.push(key);
      continue;
    }

    await getDb().insert(domainData).values({
      accountId: account.id,
      storeKey: key,
      dataJson: JSON.stringify(entries[key] ?? null),
      updatedAt: new Date().toISOString(),
    });
    imported.push(key);
  }

  return Response.json({ ok: true, imported, skipped });
}
