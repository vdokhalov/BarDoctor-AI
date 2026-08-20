import { and, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../../db";
import { domainData } from "../../../../../db/schema";
import { hasPermission } from "../../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../../lib/bardoctor/auth";
import { PURCHASE_STORE_KEY } from "../../../../../lib/bardoctor/purchases";

type RouteContext = { params: Promise<{ id: string }> };

function validId(value: string): boolean {
  return /^[a-zA-Z0-9-]{20,80}$/.test(value);
}

function bucket(): R2Bucket | null {
  return (env as unknown as { BUCKET?: R2Bucket }).BUCKET ?? null;
}

function fileKey(accountId: number, id: string): string {
  return `purchases/${accountId}/${id}`;
}

function prefersHtml(request: Request): boolean {
  return request.headers.get("sec-fetch-mode") === "navigate"
    || (request.headers.get("accept") ?? "").includes("text/html");
}

function fileError(request: Request, status: number, message: string): Response {
  if (!prefersHtml(request)) {
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  }

  const title = status === 401 ? "Нужно вернуться в BarDoctor" : "Оригинал недоступен";
  const html = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:#f4f6fb;color:#111827;font-family:Inter,system-ui,sans-serif">
    <main style="width:min(100%,430px);padding:24px;box-sizing:border-box;border:1px solid #e5e7eb;border-radius:24px;background:#fff;box-shadow:0 18px 50px rgba(15,23,42,.12)">
      <strong style="display:block;font-size:22px;line-height:1.2">${title}</strong>
      <p style="margin:10px 0 18px;color:#667085;font-size:15px;line-height:1.5">${message}</p>
      <a href="/suppliers" style="display:flex;min-height:48px;align-items:center;justify-content:center;border-radius:14px;background:#5b55f5;color:#fff;text-decoration:none;font-size:15px;font-weight:800">Вернуться к документам</a>
    </main>
  </body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) {
    return fileError(
      request,
      401,
      "Оригинал открывается защищённо из карточки документа. Вернитесь в приложение и нажмите «Открыть оригинал» ещё раз.",
    );
  }
  if (!hasPermission(account, "inventory.view")) {
    return fileError(request, 403, "У вашей роли нет доступа к закупочным документам.");
  }
  const { id } = await context.params;
  if (!validId(id)) return fileError(request, 404, "Ссылка на оригинал некорректна.");
  const source = await bucket()?.get(fileKey(account.id, id));
  if (!source) {
    return fileError(
      request,
      404,
      "Файл не найден в хранилище. Данные накладной сохранены, но исходный документ недоступен.",
    );
  }
  const originalName = source.customMetadata?.originalName
    ? decodeURIComponent(source.customMetadata.originalName)
    : "document";
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
    return Response.json({ ok: false, error: "Нет права удалять документ" }, { status: 403 });
  }
  const { id } = await context.params;
  if (!validId(id)) return new Response("Not found", { status: 404 });

  const [stored] = await getDb()
    .select({ dataJson: domainData.dataJson })
    .from(domainData)
    .where(
      and(
        eq(domainData.accountId, account.id),
        eq(domainData.storeKey, PURCHASE_STORE_KEY),
      ),
    )
    .limit(1);
  try {
    const documents = stored ? JSON.parse(stored.dataJson) as unknown : [];
    if (
      Array.isArray(documents)
      && documents.some((item) =>
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
        { ok: false, error: "Подтверждённый документ нельзя удалить без удаления закупки" },
        { status: 409 },
      );
    }
  } catch {
    // A malformed legacy store must not expose or preserve an unreferenced upload.
  }
  await bucket()?.delete(fileKey(account.id, id));
  return Response.json({ ok: true });
}
