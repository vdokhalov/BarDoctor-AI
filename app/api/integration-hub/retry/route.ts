import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { readJsonRequest } from "../../../../lib/bardoctor/http";
import type { CanonicalEnvelope } from "../../../../lib/bardoctor/integrations/contracts";
import { connectionForTenant, retryableItems } from "../../../../lib/bardoctor/integrations/repository";
import { runIntegrationSync } from "../../../../lib/bardoctor/integrations/sync-engine";
import { integrationBusinessWriter } from "../business-writer";

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "integrations.manage")) {
    return Response.json({ ok: false, code: "ACCESS_DENIED", error: "Недостаточно прав" }, { status: 403 });
  }
  const parsed = await readJsonRequest<{ runId?: unknown }>(request, { maxBytes: 8 * 1024 });
  if (!parsed.ok) return parsed.response;
  const runId = typeof parsed.data.runId === "string" ? parsed.data.runId.trim() : "";
  const items = runId ? await retryableItems(account, runId) : [];
  if (!items.length) {
    return Response.json({ ok: false, error: "В этом запуске нет записей для повтора" }, { status: 409 });
  }
  const connection = await connectionForTenant(account, items[0].connection_id);
  if (!connection) return Response.json({ ok: false, error: "Подключение не найдено" }, { status: 404 });
  const records: CanonicalEnvelope[] = [];
  for (const item of items) {
    try {
      records.push(JSON.parse(item.payload_json) as CanonicalEnvelope);
    } catch {
      // A damaged item stays visible in the original run; valid siblings can retry.
    }
  }
  if (!records.length) {
    return Response.json({ ok: false, error: "Сохранённые записи повреждены" }, { status: 422 });
  }
  const result = await runIntegrationSync({
    account,
    connectionId: connection.id,
    trigger: "retry",
    dataType: records[0].entityType,
    sourceName: `Повтор запуска ${runId.slice(0, 8)}`,
    records,
    writer: integrationBusinessWriter(request, account),
    retryOfRunId: runId,
  });
  return Response.json({ ok: true, run: result }, { status: 201 });
}
