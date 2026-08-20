import { and, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../../db";
import { domainData } from "../../../../../db/schema";
import { hasPermission } from "../../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../../lib/bardoctor/auth";

type RouteContext = { params: Promise<{ id: string }> };

function validId(value: string): boolean {
  return /^[a-zA-Z0-9-]{20,80}$/.test(value);
}

function bucket(): R2Bucket | null {
  return (env as unknown as { BUCKET?: R2Bucket }).BUCKET ?? null;
}

function fileKey(accountId: number, id: string): string {
  return `employees/${accountId}/${id}`;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "team.view")) return new Response("Forbidden", { status: 403 });
  const { id } = await context.params;
  if (!validId(id)) return new Response("Not found", { status: 404 });
  const source = await bucket()?.get(fileKey(account.id, id));
  if (!source) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  source.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, max-age=300");
  headers.set("Content-Disposition", "inline");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(source.body, { headers });
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "team.manage")) {
    return Response.json({ ok: false, error: "Нет права изменять карточки сотрудников" }, { status: 403 });
  }
  const { id } = await context.params;
  if (!validId(id)) return new Response("Not found", { status: 404 });

  const [stored] = await getDb().select({ dataJson: domainData.dataJson }).from(domainData)
    .where(and(eq(domainData.accountId, account.id), eq(domainData.storeKey, "bd_employees"))).limit(1);
  try {
    const employees = stored ? JSON.parse(stored.dataJson) as unknown : [];
    if (Array.isArray(employees) && employees.some((item) =>
      item && typeof item === "object" && (item as Record<string, unknown>).photoId === id
    )) {
      return Response.json({ ok: false, error: "Фото используется в карточке сотрудника" }, { status: 409 });
    }
  } catch {
    return Response.json({ ok: false, error: "Не удалось проверить карточку сотрудника" }, { status: 409 });
  }
  await bucket()?.delete(fileKey(account.id, id));
  return Response.json({ ok: true });
}
