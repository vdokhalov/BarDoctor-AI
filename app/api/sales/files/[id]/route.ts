import { env } from "cloudflare:workers";
import { getD1 } from "../../../../../db";
import { hasPermission } from "../../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../../lib/bardoctor/auth";
import { SALES_DOCUMENT_STORE_KEY } from "../../../../../lib/bardoctor/inventory";

type RouteContext = { params: Promise<{ id: string }> };

function validId(value: string): boolean {
  return /^[a-zA-Z0-9-]{20,80}$/.test(value);
}

function bucket(): R2Bucket | null {
  return (env as unknown as { BUCKET?: R2Bucket }).BUCKET ?? null;
}

function key(accountId: number, id: string): string {
  return `sales/${accountId}/${id}`;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "shifts.view") || !hasPermission(account, "inventory.view")) {
    return Response.json({ ok: false, error: "Нет доступа к отчётам продаж" }, { status: 403 });
  }
  const { id } = await context.params;
  if (!validId(id)) return new Response("Not found", { status: 404 });
  const source = await bucket()?.get(key(account.id, id));
  if (!source) return new Response("Not found", { status: 404 });
  const originalName = source.customMetadata?.originalName
    ? decodeURIComponent(source.customMetadata.originalName)
    : "sales-report";
  const headers = new Headers();
  source.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(originalName)}`);
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(source.body, { headers });
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "shifts.manage") || !hasPermission(account, "inventory.manage")) {
    return Response.json({ ok: false, error: "Нет права удалять черновик отчёта" }, { status: 403 });
  }
  const { id } = await context.params;
  if (!validId(id)) return new Response("Not found", { status: 404 });
  const stored = await getD1().prepare(`
    SELECT data_json FROM domain_data WHERE account_id = ? AND store_key = ? LIMIT 1
  `).bind(account.id, SALES_DOCUMENT_STORE_KEY).first<{ data_json: string }>();
  try {
    const documents = stored ? JSON.parse(stored.data_json) as unknown : [];
    if (Array.isArray(documents) && documents.some((value) =>
      value && typeof value === "object"
      && (value as Record<string, unknown>).sourceFileId === id
    )) {
      return Response.json(
        { ok: false, error: "Подтверждённый отчёт нельзя удалить без отмены его складских движений" },
        { status: 409 },
      );
    }
  } catch {
    // A malformed legacy store must not expose another venue or block an orphaned upload.
  }
  await bucket()?.delete(key(account.id, id));
  return Response.json({ ok: true });
}
