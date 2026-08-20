import { and, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../../db";
import { domainData } from "../../../../../db/schema";
import { hasPermission } from "../../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../../lib/bardoctor/auth";
import { ASSORTMENT_STORE_KEY } from "../../../../../lib/bardoctor/catalog";

type RouteContext = { params: Promise<{ id: string }> };

function validId(value: string): boolean {
  return /^[a-zA-Z0-9-]{20,80}$/.test(value);
}

function bucket(): R2Bucket | null {
  return (env as unknown as { BUCKET?: R2Bucket }).BUCKET ?? null;
}

function fileKey(accountId: number, id: string): string {
  return `catalog/${accountId}/${id}`;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.view")) {
    return Response.json({ ok: false, error: "Нет доступа к меню заведения" }, { status: 403 });
  }
  const { id } = await context.params;
  if (!validId(id)) return new Response("Not found", { status: 404 });
  const source = await bucket()?.get(fileKey(account.id, id));
  if (!source) return new Response("Not found", { status: 404 });
  const originalName = source.customMetadata?.originalName
    ? decodeURIComponent(source.customMetadata.originalName)
    : "menu";
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
  if (!hasPermission(account, "inventory.manage")) {
    return Response.json({ ok: false, error: "Нет права удалять файл меню" }, { status: 403 });
  }
  const { id } = await context.params;
  if (!validId(id)) return new Response("Not found", { status: 404 });

  const [stored] = await getDb()
    .select({ dataJson: domainData.dataJson })
    .from(domainData)
    .where(
      and(
        eq(domainData.accountId, account.id),
        eq(domainData.storeKey, ASSORTMENT_STORE_KEY),
      ),
    )
    .limit(1);
  try {
    const state = stored ? JSON.parse(stored.dataJson) as unknown : null;
    const sources = state && typeof state === "object" && !Array.isArray(state)
      && Array.isArray((state as Record<string, unknown>).sources)
      ? (state as { sources: unknown[] }).sources
      : [];
    if (
      sources.some((item) =>
        item && typeof item === "object"
        && (
          (item as Record<string, unknown>).sourceFileId === id
          || (
            Array.isArray((item as Record<string, unknown>).sourceFileIds)
            && ((item as Record<string, unknown>).sourceFileIds as unknown[]).includes(id)
          )
        ))
    ) {
      return Response.json(
        { ok: false, error: "Сохранённый источник меню нельзя удалить из черновика" },
        { status: 409 },
      );
    }
  } catch {
    // A malformed legacy store must not preserve an unreferenced upload.
  }
  await bucket()?.delete(fileKey(account.id, id));
  return Response.json({ ok: true });
}
