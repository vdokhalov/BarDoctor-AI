import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { accounts } from "../../../../../db/schema";
import { authenticateIdentityRequest, unauthorized } from "../../../../../lib/bardoctor/auth";

type RouteContext = { params: Promise<{ id: string }> };

function validId(value: string): boolean {
  return /^[a-zA-Z0-9-]{20,80}$/.test(value);
}

function bucket(): R2Bucket | null {
  return (env as unknown as { BUCKET?: R2Bucket }).BUCKET ?? null;
}

function fileKey(accountId: number, id: string): string {
  return `users/${accountId}/avatars/${id}`;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const account = await authenticateIdentityRequest(request);
  if (!account) return unauthorized();
  const { id } = await context.params;
  if (!validId(id) || account.avatarId !== id) return new Response("Not found", { status: 404 });
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
  const account = await authenticateIdentityRequest(request);
  if (!account) return unauthorized();
  const { id } = await context.params;
  if (!validId(id) || account.avatarId !== id) return new Response("Not found", { status: 404 });

  await getDb().update(accounts).set({ avatarId: null, updatedAt: new Date().toISOString() }).where(eq(accounts.id, account.id));
  await bucket()?.delete(fileKey(account.id, id));
  return Response.json({ ok: true, avatarId: null }, { headers: { "Cache-Control": "private, no-store" } });
}
