import { env } from "cloudflare:workers";
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
  return `venues/${accountId}/logos/${id}`;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
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
  if (!hasPermission(account, "settings.manage")) {
    return Response.json({ ok: false, code: "ACCESS_DENIED", error: "Нет права изменять логотип заведения" }, { status: 403 });
  }
  const { id } = await context.params;
  if (!validId(id)) return new Response("Not found", { status: 404 });
  try {
    const profile = account.restaurantJson ? JSON.parse(account.restaurantJson) as { logoId?: unknown } : null;
    if (profile?.logoId === id) {
      return Response.json({ ok: false, error: "Сначала сохраните профиль без этого логотипа" }, { status: 409 });
    }
  } catch {
    return Response.json({ ok: false, error: "Не удалось проверить профиль заведения" }, { status: 409 });
  }
  await bucket()?.delete(fileKey(account.id, id));
  return Response.json({ ok: true });
}
